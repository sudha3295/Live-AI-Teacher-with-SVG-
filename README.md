# AI Teacher — Live Voice + SVG Visual Teaching

A simple, functional web application combining **Gemini 3.8 Live** real-time bidirectional voice conversation with **SVG Creator** visual generation for teaching children in Classes 1–5.

## Architecture

1. **Teacher Conversation (Gemini 3.8 Live Session)**
   - Persistent WebSocket session to `@google/genai`'s Live API (`gemini-3.8-live` or `gemini-3.8-live-extended-thinking`).
   - Bidirectional audio streaming: 16kHz mono 16-bit PCM for microphone input, 24kHz raw PCM for teacher voice output.
   - Real-time text transcripts are always synchronized and accessible even when teacher audio is muted.
   - Voice Activity Detection (VAD) with configurable `prefixPaddingMs` (speech onset sensitivity) and `silenceDurationMs` (end-of-speech silence padding).

2. **SVG Creator Integration (Single Application Tool)**
   - Exposes `svg_creator` as the single tool declaration to the Live model.
   - When the teacher explains concepts where a visual improves understanding (e.g., parts of a plant, the water cycle, fractions), the model calls `svg_creator`.
   - Executes the SVG Creator using `gemini-3.8-flash` with the class-specific guidelines and educational illustration system instructions from *SVG Teaching Visual Tester*.
   - Validates the SVG via DOMParser/XML parser, strips scripts/unsafe attributes, and renders live in the permanently visible visual panel.
   - Returns the tool execution result back to the Live API session so the teacher naturally explains the visual that just appeared.

3. **Two-Panel Minimal Observability UI**
   - **Left Panel:** Live teacher connection controls, mic toggle, audio mute toggle, reset session, real-time message transcript, and text question input.
   - **Right Panel:** Permanently visible SVG canvas (retaining the latest successful visual), expandable SVG source markup (with copy & download options), and tool argument inspection.
   - **Settings Section:** Editable teacher system prompt, supported Live voice selection (`Zephyr`, `Kore`, `Puck`, `Charon`, `Fenrir`, `Aoede`), grade level selection (Classes 1–5), VAD timings, and effective configuration display.
   - **Diagnostics Section:** Live token metrics from `usageMetadata` (input, output, audio input/output, text input/output, thinking tokens, total turn tokens, and cumulative session tokens) and latency tracking.

## Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Required for Gemini Live API and SVG generation. Configured via the Secrets panel in AI Studio. |
| `PORT` | Optional. Server port (defaults to 3000). |
| `APP_URL` | Injected in Cloud Run deployments for app hosting URL. |

## Running Locally

```bash
# Install dependencies
npm install

# Start development full-stack server
npm run dev

# Build for production
npm run build
npm start
```
