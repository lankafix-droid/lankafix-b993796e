// AI streaming utility for LankaFix AI Assistant
type Msg = { role: "user" | "assistant"; content: string };

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

export async function streamAI({
  messages,
  mode = "diagnose",
  onDelta,
  onDone,
  onError,
  signal,
}: {
  messages: Msg[];
  mode?: "diagnose" | "pricing" | "upsell" | "maintenance";
  onDelta: (text: string) => void;
  onDone: () => void;
  onError?: (error: string) => void;
  signal?: AbortSignal;
}) {
  try {
    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, mode }),
      signal,
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "AI service unavailable" }));
      onError?.(err.error || `Error ${resp.status}`);
      onDone();
      return;
    }

    if (!resp.body) {
      onError?.("No response stream");
      onDone();
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") { onDone(); return; }
        try {
          const parsed = JSON.parse(json);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    // Flush remaining
    if (buffer.trim()) {
      for (let raw of buffer.split("\n")) {
        if (!raw || !raw.startsWith("data: ")) continue;
        const json = raw.slice(6).trim();
        if (json === "[DONE]") continue;
        try {
          const parsed = JSON.parse(json);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (e: any) {
    if (e.name === "AbortError") return;
    onError?.(e.message || "Connection failed");
    onDone();
  }
}

// Parse structured blocks from AI responses
export function parseDiagnosis(text: string) {
  const match = text.match(/```diagnosis\s*([\s\S]*?)```/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

export function parseSuggestions(text: string) {
  const match = text.match(/```suggestions\s*([\s\S]*?)```/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

export function parsePredictions(text: string) {
  const match = text.match(/```predictions\s*([\s\S]*?)```/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

// Strip structured blocks from display text
export function stripStructuredBlocks(text: string): string {
  return text
    .replace(/```(diagnosis|suggestions|predictions)\s*[\s\S]*?```/g, "")
    .trim();
}
