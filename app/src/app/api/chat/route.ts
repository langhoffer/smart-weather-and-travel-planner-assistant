import { streamText, tool, convertToModelMessages, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

const ollama = createOpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});

const weatherSchema = z.object({
  city: z.string().describe("The name of the city"),
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
      model: ollama("llama3.1"),
      system:
        "You are a Smart Travel Assistant. To provide accurate recommendations, use the available tools.",
      messages: formattedMessages,
      // Replaces maxSteps: 5 in AI SDK v5/v7
      stopWhen: stepCountIs(5),
      tools: {
        getWeather: tool({
          description: "Get weather information for a city.",
          parameters: weatherSchema,
          // @ts-ignore
          execute: async ({ city }) => {
            return {
              city,
              temperature: "22°C",
              condition: "Sunny",
              recommendedGear: ["Sunscreen", "Hat"],
            };
          },
        }),
        searchActivities: tool({
          description: "Search activities in a city by type.",
          parameters: activitiesSchema,
          // @ts-ignore
          execute: async ({ city, type }) => {
            return [
              {
                title: `Hiking in ${city}`,
                category: type,
                price: "$10",
              },
              {
                title: `Museum Visit in ${city}`,
                category: "Indoor",
                price: "$20",
              },
            ];
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse({
      // @ts-ignore
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
