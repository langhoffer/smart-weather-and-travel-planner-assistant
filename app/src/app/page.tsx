"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";

// --- Types & Helper Functions ---

interface WeatherData {
  city?: string;
  temperature?: string;
  windSpeed?: string;
  conditionCode?: number;
  error?: string;
}

interface ActivityItem {
  title: string;
  category: string;
  price: string;
}

interface ActivityData {
  city?: string;
  type?: string;
  activities?: ActivityItem[];
  message?: string;
}

// Mapování Open-Meteo WMO kódů na lidsky čitelný popis
function getWeatherCondition(code?: number): { label: string; icon: string } {
  if (code === undefined || code === null)
    return { label: "Clear", icon: "☀️" };
  if (code === 0) return { label: "Clear Sky", icon: "☀️" };
  if (code >= 1 && code <= 3) return { label: "Partly Cloudy", icon: "⛅" };
  if (code >= 45 && code <= 48) return { label: "Foggy", icon: "🌫️" };
  if (code >= 51 && code <= 67) return { label: "Rainy", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { label: "Snowy", icon: "❄️" };
  if (code >= 95) return { label: "Thunderstorm", icon: "⛈️" };
  return { label: "Cloudy", icon: "☁️" };
}

// Dynamické odvození výbavy podle teploty
function getRecommendedGear(tempStr?: string, code?: number): string[] {
  const gear: string[] = [];
  const temp = tempStr ? parseFloat(tempStr) : 20;

  if (temp < 10) gear.push("Warm Jacket", "Beanie");
  else if (temp < 20) gear.push("Light Jacket", "Comfortable Shoes");
  else gear.push("Sunglasses", "Sunscreen", "Water Bottle");

  if (code && code >= 51) gear.push("Umbrella", "Raincoat");

  return gear;
}

// --- Dark Mode UI Components ---

function WeatherCard({ data }: { data: WeatherData }) {
  if (data.error) {
    return (
      <div className="p-4 border border-red-500/30 rounded-xl bg-red-950/40 text-red-300 text-sm my-2 backdrop-blur-sm">
        <strong className="text-red-400">Weather Error:</strong> {data.error}
      </div>
    );
  }

  // Ochrana před prázdnými daty
  if (!data.city && !data.temperature) return null;

  const conditionInfo = getWeatherCondition(data.conditionCode);
  const gear = getRecommendedGear(data.temperature, data.conditionCode);

  return (
    <div className="p-4 border border-cyan-500/20 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-cyan-950/30 shadow-lg text-slate-100 my-2 space-y-3 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">
            Current Weather
          </span>
          <h2 className="text-lg font-bold text-white">
            {data.city || "Unknown Location"}
          </h2>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold text-cyan-400 tracking-tight flex items-center gap-1.5 justify-end">
            <span>{conditionInfo.icon}</span>
            <span>{data.temperature || "N/A"}</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {conditionInfo.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 block font-medium">
            Wind Speed
          </span>
          <span className="font-semibold text-slate-200">
            {data.windSpeed || "N/A"}
          </span>
        </div>
        <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 block font-medium">
            Weather Condition
          </span>
          <span className="font-semibold text-slate-200">
            {conditionInfo.label}
          </span>
        </div>
      </div>

      {gear.length > 0 && (
        <div className="pt-1 text-xs text-cyan-300/80">
          <strong className="text-cyan-400">Recommended Gear:</strong>{" "}
          {gear.join(", ")}
        </div>
      )}
    </div>
  );
}

function ActivityGrid({ data }: { data: ActivityData | ActivityItem[] }) {
  const items: ActivityItem[] = Array.isArray(data)
    ? data
    : data?.activities || [];

  const message = !Array.isArray(data) ? data?.message : null;

  return (
    <div className="my-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Recommended Activities
        </h3>
        {items.length > 0 && (
          <span className="text-[10px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded-full font-medium border border-slate-700/50">
            {items.length} {items.length === 1 ? "result" : "results"}
          </span>
        )}
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.map((act, i) => (
            <div
              key={i}
              className="p-3 border border-slate-800/80 rounded-xl bg-slate-900/80 hover:bg-slate-900 hover:border-slate-700 transition-all shadow-sm flex flex-col justify-between space-y-2 group"
            >
              <div>
                <h4 className="font-medium text-slate-100 text-sm leading-snug group-hover:text-blue-400 transition-colors">
                  {act.title}
                </h4>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
                <span className="text-[10px] uppercase font-semibold bg-slate-800/90 text-slate-300 px-2 py-0.5 rounded border border-slate-700/50">
                  {act.category}
                </span>
                <span className="font-bold text-emerald-400 text-xs">
                  {act.price}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3.5 border border-amber-500/20 rounded-xl bg-amber-950/20 text-xs text-amber-300/90 leading-relaxed">
          <p className="font-semibold text-amber-200 mb-0.5">
            ⚠️ Database Notice
          </p>
          {message ||
            "No matching activities found for this location in the live database."}
        </div>
      )}
    </div>
  );
}

// --- Main Page Component ---

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [isCutOff, setIsCutOff] = useState(false);
  const { messages, sendMessage, status } = useChat({
    onFinish: ({ message, finishReason }) => {
      // If it stopped for any reason other than a normal "stop", mark it as cut off
      if (finishReason && finishReason !== "stop") {
        setIsCutOff(true);
      } else {
        setIsCutOff(false);
      }
    },
  });

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
    <div className="max-w-2xl mx-auto min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-blue-500/30 selection:text-blue-200">
      {/* Dark Glass Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 p-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            Smart Travel Assistant
            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-mono">
              v7 SDK
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Powered by Ollama & Vercel AI SDK
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-full">
          <span
            className={`w-2 h-2 rounded-full ${
              isPending
                ? "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
            }`}
          />
          <span className="text-xs font-mono text-slate-300 capitalize">
            {status}
          </span>
        </div>
      </header>

      {/* Messages Feed */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center py-16 text-slate-500 space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-slate-900/80 border border-slate-800 mb-2">
              ✈️
            </div>
            <p className="text-sm font-medium text-slate-300">
              Where would you like to travel?
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try asking: &quot;What is the weather in Tokyo and what outdoor
              activities can I do?&quot;
            </p>
          </div>
        )}

        {messages.map((message) => {
          return (
            <div key={message.id} className="space-y-2">
              {message.parts?.map((part, idx) => {
                // Text Message
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
                        className={`p-3.5 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm ${
                          message.role === "user"
                            ? "bg-blue-600 text-white rounded-br-xs font-medium"
                            : "bg-slate-900/90 text-slate-100 border border-slate-800 rounded-bl-xs shadow-inner"
                        }`}
                      >
                        {part.text}
                      </div>
                    </div>
                  );
                }

                // Generative UI / Tool Call Renderers
                if (part.type.startsWith("tool-")) {
                  const toolPart = part as {
                    toolCallId?: string;
                    toolName?: string;
                    state?: string;
                    output?: unknown;
                    input?: unknown;
                  };

                  const toolName =
                    toolPart.toolName || part.type.replace("tool-", "");
                  const output = toolPart.output;
                  const isExecuting =
                    !output && toolPart.state !== "output-available";

                  if (isExecuting) {
                    return (
                      <div
                        key={toolPart.toolCallId || idx}
                        className="flex items-center gap-2.5 p-3 border border-cyan-500/20 rounded-xl bg-cyan-950/20 text-cyan-300 text-xs my-2 animate-pulse"
                      >
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        <span>
                          Executing tool:{" "}
                          <strong className="font-semibold text-cyan-200">
                            {toolName}
                          </strong>
                          ...
                        </span>
                      </div>
                    );
                  }

                  if (
                    toolName === "getWeather" ||
                    part.type === "tool-getWeather"
                  ) {
                    return (
                      <WeatherCard
                        key={toolPart.toolCallId || idx}
                        data={output}
                      />
                    );
                  }

                  if (
                    toolName === "searchActivities" ||
                    part.type === "tool-searchActivities"
                  ) {
                    return (
                      <ActivityGrid
                        key={toolPart.toolCallId || idx}
                        data={output as ActivityData}
                      />
                    );
                  }
                }

                return null;
              })}
            </div>
          );
        })}

        {isPending && (
          <div className="flex items-center justify-start gap-2 text-xs text-slate-500 py-2">
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
            </div>
            <span>Assistant is thinking...</span>
          </div>
        )}
      </div>

      {/* Manual Step Continuation / Resume Button */}
      {!isPending &&
        messages.length > 0 &&
        messages[messages.length - 1].role === "assistant" &&
        isCutOff && (
          <div className="flex justify-center mb-3">
            <button
              type="button"
              onClick={() => {
                setIsCutOff(false); // Reset before continuing
                sendMessage();
              }}
              className="px-4 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 rounded-full text-cyan-300 text-xs font-medium transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>✨ Continue generation / Next step</span>
            </button>
          </div>
        )}

      {/* Input Form */}
      <div className="sticky bottom-0 p-4 bg-slate-950/80 backdrop-blur-md border-t border-slate-800/80">
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about weather or travel activities..."
            className="flex-1 p-3 px-4 text-sm rounded-xl border border-slate-800 bg-slate-900/90 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all placeholder:text-slate-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={isPending || !input.trim()}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl disabled:opacity-30 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
