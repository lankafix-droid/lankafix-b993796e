import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Send, ArrowRight, RotateCcw, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { streamAI, parseDiagnosis, stripStructuredBlocks } from "@/lib/aiStream";
import { track } from "@/lib/analytics";

type Msg = { role: "user" | "assistant"; content: string };

interface DiagnosisResult {
  confidence: number;
  likely_issue: string;
  category: string;
  service_type: string;
  urgency: string;
  estimated_price_range: string;
  recommended_action: string;
  care_plan_relevant?: boolean;
  upsell_hint?: string;
}

const QUICK_STARTS = [
  "My AC is not cooling properly",
  "Phone screen is cracked",
  "Laptop is running very slow",
  "Water leak in bathroom",
  "WiFi keeps disconnecting",
  "Power tripping frequently",
];

export default function AIConversationalDiagnose() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setError(null);
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    track("ai_diagnose_message", { message: text.trim(), turn: newMessages.length });

    abortRef.current = new AbortController();
    let assistantText = "";

    const updateAssistant = (chunk: string) => {
      assistantText += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
        }
        return [...prev, { role: "assistant", content: assistantText }];
      });

      // Check for diagnosis in stream
      const diag = parseDiagnosis(assistantText);
      if (diag) {
        setDiagnosis(diag);
        track("ai_diagnose_result", diag);
      }
    };

    await streamAI({
      messages: newMessages,
      mode: "diagnose",
      onDelta: updateAssistant,
      onDone: () => setIsStreaming(false),
      onError: (err) => { setError(err); setIsStreaming(false); },
      signal: abortRef.current.signal,
    });
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setDiagnosis(null);
    setError(null);
    setInput("");
    track("ai_diagnose_reset");
  };

  const handleBook = () => {
    if (!diagnosis) return;
    track("ai_diagnose_book", { category: diagnosis.category });
    navigate(`/book/${diagnosis.category}`);
  };

  const hasStarted = messages.length > 0;

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden flex flex-col" style={{ maxHeight: "min(600px, 70vh)" }}>
      {/* Header */}
      <div className="p-4 border-b border-border/30 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-1.5">
              AI Diagnosis
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </h3>
            <p className="text-[11px] text-muted-foreground">Describe your problem — I'll find the right fix</p>
          </div>
        </div>
        {hasStarted && (
          <button onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-smooth">
            <RotateCcw className="w-3 h-3" /> New
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
        {!hasStarted ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground text-center">
              Tell me what's wrong — I'll diagnose and recommend the right service
            </p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_STARTS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-xs font-medium px-3 py-2.5 rounded-xl border border-border/50 bg-secondary/40 hover:bg-primary/5 hover:border-primary/20 transition-smooth active:scale-[0.97]"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => {
              const displayText = msg.role === "assistant" ? stripStructuredBlocks(msg.content) : msg.content;
              if (!displayText.trim()) return null;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary/60 text-foreground rounded-bl-md"
                  }`}>
                    {displayText}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-secondary/60 rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5 items-center">
              <span className="w-2 h-2 rounded-full bg-primary/60 ai-dot-1" />
              <span className="w-2 h-2 rounded-full bg-primary/60 ai-dot-2" />
              <span className="w-2 h-2 rounded-full bg-primary/60 ai-dot-3" />
            </div>
          </motion.div>
        )}

        {error && (
          <div className="text-center text-xs text-destructive bg-destructive/5 rounded-xl p-3">
            {error}
          </div>
        )}
      </div>

      {/* Diagnosis Card */}
      <AnimatePresence>
        {diagnosis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-4 border-t border-border/30 bg-success/5"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-success/15 text-success border-success/20 text-xs font-bold gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {diagnosis.confidence}% Confidence
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {diagnosis.urgency} urgency
                </Badge>
              </div>
              <div>
                <h4 className="font-heading font-bold text-foreground text-sm">{diagnosis.likely_issue}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{diagnosis.recommended_action}</p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Estimated Cost</span>
                <span className="font-bold text-foreground">{diagnosis.estimated_price_range}</span>
              </div>
              {diagnosis.upsell_hint && (
                <p className="text-[10px] text-primary/80 bg-primary/5 rounded-lg px-3 py-1.5">
                  💡 {diagnosis.upsell_hint}
                </p>
              )}
              <Button onClick={handleBook} className="w-full bg-gradient-brand text-primary-foreground shadow-brand font-semibold rounded-xl h-11 gap-2 active:scale-[0.97] transition-spring">
                Book {diagnosis.category} Service <ArrowRight className="w-4 h-4" />
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Final price confirmed after technician inspection. No work starts without your approval.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="p-3 border-t border-border/30 bg-card">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasStarted ? "Describe more details..." : "What's the problem?"}
            className="flex-1 bg-secondary/40 rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground text-foreground border border-transparent focus:border-primary/20 transition-smooth"
            disabled={isStreaming}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming}
            className="w-11 h-11 rounded-xl bg-gradient-brand text-primary-foreground shadow-brand shrink-0 active:scale-90 transition-spring"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
