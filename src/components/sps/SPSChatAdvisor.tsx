/**
 * SPS Chat Advisor — In-app knowledge-based assistant widget
 */
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, Phone, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  escalate?: boolean;
}

const QUICK_QUESTIONS = [
  "Which plan is right for me?",
  "What is the deposit for?",
  "Can I pause my subscription?",
  "What happens if I exceed pages?",
  "Can I upgrade later?",
  "Do you support scan & copy?",
];

export default function SPSChatAdvisor({ pageContext = "general" }: { pageContext?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading) return;
    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("sps-ai", {
        body: { action: "advisor_chat", payload: { question, pageContext } },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, escalate: data.escalate },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm having trouble connecting. Please try again or talk to a LankaFix advisor.", escalate: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Ask LankaFix AI"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[340px] max-h-[500px] bg-background border border-border/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40 bg-primary/5">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-foreground">Ask LankaFix AI</div>
          <div className="text-[10px] text-muted-foreground">SPS Advisor • AI Guidance</div>
        </div>
        <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded-md">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[320px]">
        {messages.length === 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground text-center mb-3">
              Ask about SPS plans, deposits, support, or how it works.
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-colors text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-foreground"
            }`}>
              {msg.content}
              {msg.escalate && msg.role === "assistant" && (
                <div className="mt-2 pt-2 border-t border-border/30 space-y-1.5">
                  <Button variant="outline" size="sm" className="w-full text-[10px] h-7 gap-1">
                    <Phone className="w-3 h-3" /> Talk to LankaFix Advisor
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted/50 rounded-xl px-3 py-2 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Thinking…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border/40 p-2.5 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Ask about SPS…"
          className="flex-1 text-xs bg-muted/30 rounded-lg px-3 py-2 outline-none focus:ring-1 ring-primary/30"
          disabled={loading}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="text-[9px] text-muted-foreground text-center pb-1.5">
        AI Guidance only • A human advisor can confirm details
      </div>
    </div>
  );
}
