import { streamText, tool, convertToModelMessages, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const ollama = createOpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
  compatibility: "compatible",
});

const weatherSchema = z.object({
  city: z.string().optional().describe("The name of the city"),
  location: z.string().optional().describe("The name of the city or location"),
});

const activitiesSchema = z.object({
  city: z.string().optional().describe("The name of the city"),
  location: z.string().optional().describe("The name of the city or location"),
  type: z.enum(["outdoor", "indoor"]).describe("Type of activities"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];

    const formattedMessages =
      rawMessages.length > 0 ? await convertToModelMessages(rawMessages) : [];

    const result = streamText({
      model: ollama.chat("llama3.1"),
      system:
        "You are a Smart Travel Assistant. Use available tools to gather weather and activity information. " +
        "CRITICAL INSTRUCTION: Never output raw JSON, function call signatures, or raw tool parameter blocks in your response text. " +
        "Always synthesize tool outputs into friendly, clear, natural language responses.",
      messages: formattedMessages,
      stopWhen: stepCountIs(5),
      tools: {
        getWeather: tool({
          description: "Get real-time weather information for a given city.",
          parameters: weatherSchema,
          execute: async ({ city, location }) => {
            const targetCity = city || location;
            if (!targetCity) {
              return {
                success: false,
                error: "No city or location provided",
                data: null,
              };
            }

            try {
              const geoRes = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
              );
              const geoData = await geoRes.json();

              if (!geoData.results || geoData.results.length === 0) {
                return {
                  success: false,
                  city,
                  error: `Could not locate coordinates for city: ${city}`,
                  data: null,
                };
              }

              const { latitude, longitude, name, country } = geoData.results[0];

              const weatherRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
              );
              const weatherData = await weatherRes.json();

              const tempC = weatherData.current_weather?.temperature;
              const windSpeed = weatherData.current_weather?.windspeed;

              return {
                success: true,
                city: `${name}, ${country}`,
                temperature: tempC !== undefined ? `${tempC}°C` : "N/A",
                windSpeed:
                  windSpeed !== undefined ? `${windSpeed} km/h` : "N/A",
                conditionCode: weatherData.current_weather?.weathercode ?? 0,
                error: null,
              };
            } catch (err) {
              return {
                success: false,
                city,
                error: (err as Error).message || "Failed to fetch weather data",
                data: null,
              };
            }
          },
        }),

        searchActivities: tool({
          description:
            "Search real tourist attractions, landmarks, and parks in a city using Wikipedia geo-data.",
          parameters: activitiesSchema,
          execute: async ({ city, location, type }) => {
            const targetCity = city || location;
            if (!targetCity) {
              return {
                success: false,
                city: "Unknown",
                type,
                activities: [],
                message: "No city or location specified for activity search.",
              };
            }

            try {
              // 1. Get lat/lon for the city using Open-Meteo
              const geoRes = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(targetCity)}&count=1&language=en&format=json`,
              );
              const geoData = await geoRes.json();

              if (!geoData.results || geoData.results.length === 0) {
                return {
                  success: false,
                  city: targetCity,
                  type,
                  activities: [],
                  message: `Could not locate coordinates for ${targetCity}.`,
                };
              }

              const { latitude, longitude, name, country } = geoData.results[0];

              // 2. Query Wikimedia/Wikipedia Geosearch API around those coordinates (~10km radius)
              const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${latitude}|${longitude}&gsradius=10000&gslimit=8&format=json`;

              const wikiRes = await fetch(wikiUrl, {
                headers: {
                  "User-Agent":
                    "SmartTravelAssistant-InterviewDemo/1.0 (portfolio project)",
                },
              });

              if (!wikiRes.ok) {
                throw new Error("Failed to fetch location data from Wikipedia");
              }

              const wikiData = await wikiRes.json();
              const pages = wikiData.query?.geosearch || [];

              // 3. Map articles into clean activity cards
              const activities = pages.map((page: any) => ({
                title: page.title,
                category:
                  type === "outdoor"
                    ? "Park & Nature Spot"
                    : "Cultural Landmark",
                price: "Public / Sightseeing",
              }));

              if (activities.length === 0) {
                return {
                  success: true,
                  city: `${name}, ${country}`,
                  type,
                  activities: [],
                  message: `No specific articles found nearby in ${name}.`,
                };
              }

              return {
                success: true,
                city: `${name}, ${country}`,
                type,
                activities,
                message: null,
              };
            } catch (err) {
              return {
                success: false,
                city: targetCity,
                type,
                activities: [],
                message: `Activity lookup error: ${(err as Error).message}`,
              };
            }
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        console.error("Stream Error:", error);
        return {
          errorCode: "STREAM_ERROR",
          message: "An error occurred while processing your request",
        };
      },
    });
  } catch (error) {
    console.error("Route Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
