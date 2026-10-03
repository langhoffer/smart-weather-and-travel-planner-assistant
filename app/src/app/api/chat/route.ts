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
  city: z.string().describe("The name of the city"),
  type: z.string().describe("Type of activity, e.g. outdoor, indoor"),
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
          description: "Search activities in a city by type.",
          parameters: activitiesSchema,
          execute: async ({ city, type }) => {
            try {
              const response = await fetch(
                `https://api.example.com/activities?city=${encodeURIComponent(city)}&type=${encodeURIComponent(type)}`,
                {
                  headers: {
                    Authorization: `Bearer ${process.env.TRAVEL_API_KEY ?? ""}`,
                  },
                },
              ).catch(() => null);

              if (response && response.ok) {
                const data = await response.json();
                return {
                  success: true,
                  city,
                  type,
                  activities: Array.isArray(data) ? data : [],
                  message: null,
                };
              }

              // Fallback response contract when endpoint is unresolvable or returns 404/500
              return {
                success: false,
                city,
                type,
                activities: [],
                message: `No active activity database found for ${type} activities in ${city}. Please offer general suggestions based on your knowledge.`,
              };
            } catch (err) {
              return {
                success: false,
                city,
                type,
                activities: [],
                message: `Error searching for ${type} activities in ${city}: ${(err as Error).message}`,
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
