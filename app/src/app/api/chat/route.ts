import { streamText, tool, convertToModelMessages, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const ollama = createOpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
  compatibility: "compatible",
});

const weatherSchema = z.object({
  city: z.string().describe("The name of the city"),
  latitude: z.number().optional().describe("Latitude if available"),
  longitude: z.number().optional().describe("Longitude if available"),
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
        "You are a Smart Travel Assistant. Use tools to fetch real data for weather and travel activities.",
      messages: formattedMessages,
      stopWhen: stepCountIs(5),
      tools: {
        getWeather: tool({
          description: "Get real-time weather information for a given city.",
          parameters: weatherSchema,
          execute: async ({ city }) => {
            // 1. Geocode city name to lat/lon using Open-Meteo Geocoding API
            const geoRes = await fetch(
              `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
            );
            const geoData = await geoRes.json();

            if (!geoData.results || geoData.results.length === 0) {
              return {
                error: `Could not locate coordinates for city: ${city}`,
              };
            }

            const { latitude, longitude, name, country } = geoData.results[0];

            // 2. Fetch live weather data
            const weatherRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
            );
            const weatherData = await weatherRes.json();

            const tempC = weatherData.current_weather?.temperature;
            const windSpeed = weatherData.current_weather?.windspeed;

            return {
              city: `${name}, ${country}`,
              temperature: `${tempC}°C`,
              windSpeed: `${windSpeed} km/h`,
              conditionCode: weatherData.current_weather?.weathercode,
            };
          },
        }),

        searchActivities: tool({
          description: "Search activities in a city by type.",
          parameters: activitiesSchema,
          execute: async ({ city, type }) => {
            // Fetch dynamically from an API, database, or third-party service
            const response = await fetch(
              `https://api.example.com/activities?city=${encodeURIComponent(city)}&type=${encodeURIComponent(type)}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.TRAVEL_API_KEY}`,
                },
              },
            ).catch(() => null);

            if (response && response.ok) {
              return await response.json();
            }

            // Fallback response structure if external endpoint fails
            return {
              query: { city, type },
              message: `No active database connection found for ${type} activities in ${city}.`,
            };
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
