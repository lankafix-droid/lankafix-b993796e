/**
 * AI Support Chat — Knowledge-base chatbot with escalation logic.
 * Uses the "support" mode of the ai-assistant edge function.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { HelpCircle, X, Send, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { streamAI, stripStructuredBlocks } from "@/lib/aiStream";
import { toast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

const INITIAL_MESSAGE: Msg = {
  role: "assistant",
  content: "Hi! 👋 I'm your LankaFix support assistant. Ask me about pricing, warranty, services, or your booking — I'm here to help!",
};

export default function AISupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    let assistantContent = "";
    const controller = new AbortController();
    abortRef.current = controller;

    const upsert = (chunk: string) => {
      assistantContent += chunk;
      const display = stripStructuredBlocks(assistantContent);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > 1 && prev[prev.length - 2]?.role === "user") {
          return [...prev.slice(0, -1), { role: "assistant", content: display }];
        }
        return [...prev, { role: "assistant", content: display }];
      });
    };

    try {
      await streamAI({
        messages: newMessages,
        mode: "support" as any,
        onDelta: upsert,
        onDone: () => {
          setIsStreaming(false);
          // Check for escalation trigger
          if (assistantContent.includes("```escalate")) {
            toast({
              title: "Connecting to support team",
              description: "We'll connect you with a human agent via WhatsApp.",
            });
          }
        },
        onError: (err) => {
          toast({ title: "Support unavailable", description: err, variant: "destructive" });
          setIsStreaming(false);
        },
        signal: controller.signal,
      });
    } catch {
      setIsStreaming(false);
    }
  }, [messages, isStreaming]);

  const quickQuestions = [
    "What are your service prices?",
    "How does warranty work?",
    "How do I track my technician?",
    "How do I cancel a booking?",
  ];

  if (!open) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[480px] max-h-[calc(100vh-8rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-accent text-accent-foreground px-4 py-3 flex items-center gap-3 shrink-0">
        <HelpCircle className="w-5 h-5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">LankaFix Support</p>
          <p className="text-xs opacity-80">Ask anything about our services</p>
        </div>
        <button onClick={() => setOpen(false)} className="p-1 hover:bg-accent-foreground/10 rounded-full">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted text-foreground rounded-bl-md"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isStreaming && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm text-muted-foreground">
              Typing...
            </div>
          </div>
        )}
      </div>

      {/* Quick Questions (show only at start) */}
      {messages.length <= 1 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
          {quickQuestions.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* WhatsApp fallback */}
      <div className="px-3 pb-1 shrink-0">
        <a
          href="https://wa.me/94777123456"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowUpRight className="w-3 h-3" />
          Prefer WhatsApp? Chat with our team directly
        </a>
      </div>

      {/* Input */}
      <div className="border-t border-border px-3 py-2 flex items-center gap-2 shrink-0 bg-card">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask about pricing, warranty, services..."
          className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          disabled={isStreaming}
        />
        <Button size="sm" onClick={() => send(input)} disabled={!input.trim() || isStreaming} className="h-8 w-8 p-0">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Toggle hook for external control */
export function useSupportChat() {
  const [open, setOpen] = useState(false);
  return { open, toggle: () => setOpen((p) => !p), setOpen };
}
