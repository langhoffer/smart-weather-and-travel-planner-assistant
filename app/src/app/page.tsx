"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();

  const isPending = status === "submitted" || status === "streaming";

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    sendMessage({
      text: input,
    });
    setInput("");
  };

  return (
    <div className="p-4 max-w-xl mx-auto min-h-screen flex flex-col">
      <h1 className="text-2xl font-bold mb-4">Smart Travel Assistant</h1>

      <div className="flex-1 mb-4 space-y-4 overflow-y-auto">
        {messages.map((message) => {
          return (
            <div key={message.id} className="space-y-2">
              {message.parts?.map((part, idx) => {
                // Textová část zprávy
                if (part.type === "text") {
                  return (
                    <div
                      key={idx}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`p-3 rounded-lg max-w-[80%] ${
                          message.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-900 border"
                        }`}
                      >
                        {part.text}
                      </div>
                    </div>
                  );
                }

                // Generative UI / Nástroje (Tool Call & Result)
                if (part.type.startsWith("tool-")) {
                  const toolPart = part as {
                    toolCallId: string;
                    toolName?: string;
                    state?: string;
                    result?: unknown;
                  };

                  const toolName =
                    toolPart.toolName || part.type.replace("tool-", "");
                  const state = toolPart.state;

                  if (state !== "result") {
                    return (
                      <div
                        key={toolPart.toolCallId || idx}
                        className="p-3 border rounded-lg bg-yellow-50 text-yellow-800 text-sm animate-pulse"
                      >
                        Načítám data z nástroje: <strong>{toolName}</strong>...
                      </div>
                    );
                  }

                  if (toolName === "getWeather") {
                    const { city, temperature, condition, recommendedGear } =
                      (toolPart.result || {}) as {
                        city: string;
                        temperature: string;
                        condition: string;
                        recommendedGear: string[];
                      };

                    return (
                      <div
                        key={toolPart.toolCallId || idx}
                        className="p-4 border border-blue-200 rounded-lg bg-blue-50 text-blue-900 my-2"
                      >
                        <h2 className="font-semibold text-lg border-b border-blue-200 pb-1 mb-2">
                          Počasí pro {city}
                        </h2>
                        <p>
                          <strong>Teplota:</strong> {temperature}
                        </p>
                        <p>
                          <strong>Stav:</strong> {condition}
                        </p>
                        <p className="mt-1 text-sm text-blue-800">
                          <strong>Doporučená výbava:</strong>{" "}
                          {recommendedGear?.join(", ")}
                        </p>
                      </div>
                    );
                  }

                  if (toolName === "searchActivities") {
                    const activities = (toolPart.result || []) as Array<{
                      title: string;
                      category: string;
                      price: string;
                    }>;

                    return (
                      <div
                        key={toolPart.toolCallId || idx}
                        className="my-2 space-y-2"
                      >
                        <h2 className="font-semibold text-md text-gray-700">
                          Nalezené aktivity:
                        </h2>
                        <div className="grid grid-cols-1 gap-2">
                          {activities.map((act, i) => (
                            <div
                              key={i}
                              className="p-3 border rounded-lg bg-gray-50 flex justify-between items-center"
                            >
                              <div>
                                <h3 className="font-medium text-gray-900">
                                  {act.title}
                                </h3>
                                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-700">
                                  {act.category}
                                </span>
                              </div>
                              <span className="font-bold text-green-600 text-sm">
                                {act.price}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                }

                return null;
              })}
            </div>
          );
        })}

        {isPending && (
          <div className="text-center text-sm text-gray-500 my-2">
            Asistent přemýšlí...
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Napište dotaz..."
          className="p-3 flex-grow rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50"
        >
          Odeslat
        </button>
      </form>
    </div>
  );
}
