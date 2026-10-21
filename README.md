# ✈️ Smart Travel Assistant & Agentic UI

A high-performance, privacy-focused agentic web application built with **Next.js**, **TypeScript**, and the **Vercel AI SDK**.

The primary motivation for developing this application was to explore and master **real-time UI streaming architectures**. Instead of traditional blocking request/response models, this project focuses heavily on sub-second token streaming, live tool execution loops, and responsive user feedback.

---

## 🎯 Core Technical Focus: Real-Time UI Streaming & Agentic Loops

The architecture centers around real-time data flow and multi-step tool orchestration:

- **Real-Time Streaming Protocol:** Built using `@ai-sdk/react` and `toUIMessageStreamResponse` to stream token outputs, system error boundaries, and tool states directly to the client interface with low latency.
- **Controlled Step Bounds (`stopWhen`):** Uses server-side step constraints (`stopWhen: stepCountIs(5)`) to orchestrate multi-turn agent execution loops. The assistant autonomously queries real-time weather forecasts (via Open-Meteo) and geo-located attraction searches (via Wikipedia Geosearch API) before synthesizing a final natural language summary.
- **Silent Stream Continuation UX:** Features smart finish-reason tracking (`finishReason !== 'stop'`) on the frontend to allow users to trigger generation continuation seamlessly without cluttering the chat history with artificial user prompts.
- **Local Provider Compatibility Layer:** Connects to local LLMs (Ollama running `llama3.1`) via OpenAI-compatible API layers for full privacy and offline-first execution capabilities.

---

## 🛠️ Tech Stack & Key Technologies

- **Framework:** Next.js (App Router, Server Actions)
- **Language:** TypeScript
- **AI Engine & Streaming:** Vercel AI SDK
- **LLM Orchestration:** Ollama (Local model execution using `llama3.1`)
- **External APIs:** Open-Meteo API (Weather & Geocoding), Wikimedia/Wikipedia Geosearch API
- **Styling:** Tailwind CSS

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- [Ollama](https://ollama.ai/) installed and running locally on port `11434`
- Local model pulled: `ollama pull llama3.1`

### Local Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Run the development server:**

   ```bash
   npm run dev
   ```

3. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser. (The local Ollama connection endpoint `http://localhost:11434/v1` is configured directly within the server route).

© 2026. All rights reserved.
