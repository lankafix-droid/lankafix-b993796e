import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Send, ArrowRight, RotateCcw, Sparkles, ShieldCheck, Loader2, Bot, User, TrendingUp, Zap, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
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
  { text: "My AC is not cooling properly", icon: "❄️" },
  { text: "Phone screen is cracked", icon: "📱" },
  { text: "Laptop is running very slow", icon: "💻" },
  { text: "Water leak in bathroom", icon: "🚿" },
  { text: "WiFi keeps disconnecting", icon: "📡" },
  { text: "Power tripping frequently", icon: "⚡" },
];

/* Animated confidence ring */
function ConfidenceRing({ value, size = 56 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? "hsl(var(--success))" : value >= 60 ? "hsl(var(--primary))" : "hsl(var(--warning))";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={4} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        />
      </svg>
      <motion.span
        className="absolute text-sm font-bold text-foreground"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {value}%
      </motion.span>
    </div>
  );
}

/* Chat bubble component */
function ChatBubble({ msg, isLatest }: { msg: Msg; isLatest: boolean }) {
  const isUser = msg.role === "user";
  const displayText = isUser ? msg.content : stripStructuredBlocks(msg.content);
  if (!displayText.trim()) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        isUser
          ? "bg-primary/10"
          : "bg-gradient-to-br from-primary to-primary/70"
      }`}>
        {isUser
          ? <User className="w-3.5 h-3.5 text-primary" />
          : <Bot className="w-3.5 h-3.5 text-primary-foreground" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser
          ? "bg-primary text-primary-foreground rounded-br-md"
          : "bg-secondary/60 text-foreground rounded-bl-md border border-border/30"
      }`}>
        {isUser ? (
          <span>{displayText}</span>
        ) : (
          <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none [&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>ul]:mb-1.5 [&>ol]:mb-1.5">
            <ReactMarkdown>{displayText}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* Typing indicator */
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-end gap-2"
    >
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5 text-primary-foreground" />
      </div>
      <div className="bg-secondary/60 rounded-2xl rounded-bl-md px-4 py-3 border border-border/30 flex gap-1.5 items-center">
        <span className="w-2 h-2 rounded-full bg-primary/60 ai-dot-1" />
        <span className="w-2 h-2 rounded-full bg-primary/60 ai-dot-2" />
        <span className="w-2 h-2 rounded-full bg-primary/60 ai-dot-3" />
      </div>
    </motion.div>
  );
}

export default function AIConversationalDiagnose() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 100) + "px";
    }
  }, [input]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const hasStarted = messages.length > 0;

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden flex flex-col shadow-[var(--shadow-card)]" style={{ maxHeight: "min(640px, 72vh)" }}>
      {/* Header */}
      <div className="p-4 border-b border-border/30 flex items-center justify-between bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
            <Stethoscope className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-1.5">
              FixBuddy AI
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </h3>
            <p className="text-[11px] text-muted-foreground">Describe your problem — I'll find the right fix</p>
          </div>
        </div>
        {hasStarted && (
          <button onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors rounded-lg px-2 py-1.5 hover:bg-secondary/60 active:scale-95">
            <RotateCcw className="w-3 h-3" /> New
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
        {!hasStarted ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Welcome */}
            <div className="flex items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div className="bg-secondary/60 rounded-2xl rounded-bl-md px-4 py-3 border border-border/30 max-w-[85%]">
                <p className="text-sm text-foreground leading-relaxed">
                  Hi! 👋 I'm <strong>FixBuddy</strong>, your AI diagnostic assistant. Tell me what's wrong and I'll identify the issue and recommend the right service.
                </p>
              </div>
            </div>

            {/* Quick starts */}
            <div className="pl-9">
              <p className="text-xs text-muted-foreground mb-2.5 font-medium">Common issues:</p>
              <div className="grid grid-cols-1 gap-2">
                {QUICK_STARTS.map((q) => (
                  <button
                    key={q.text}
                    onClick={() => sendMessage(q.text)}
                    className="text-left text-[13px] font-medium px-3.5 py-3 rounded-xl border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/20 transition-colors active:scale-[0.97] flex items-center gap-2.5"
                  >
                    <span className="text-base">{q.icon}</span>
                    {q.text}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} isLatest={i === messages.length - 1} />
            ))}
          </>
        )}

        <AnimatePresence>
          {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
            <TypingIndicator />
          )}
        </AnimatePresence>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-xs text-destructive bg-destructive/5 rounded-xl p-3 border border-destructive/10">
            {error}
            <button onClick={() => setError(null)} className="block mx-auto mt-1.5 text-xs text-muted-foreground underline">Dismiss</button>
          </motion.div>
        )}
      </div>

      {/* Diagnosis Result Card */}
      <AnimatePresence>
        {diagnosis && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-border/30"
          >
            <div className="p-4 bg-gradient-to-b from-success/5 to-card space-y-4">
              {/* Top row: confidence ring + issue */}
              <div className="flex items-center gap-4">
                <ConfidenceRing value={diagnosis.confidence} />
                <div className="flex-1 min-w-0">
                  <motion.h4
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="font-heading font-bold text-foreground text-[15px] leading-snug"
                  >
                    {diagnosis.likely_issue}
                  </motion.h4>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-xs text-muted-foreground mt-0.5"
                  >
                    {diagnosis.recommended_action}
                  </motion.p>
                </div>
              </div>

              {/* Info pills */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="flex gap-2 flex-wrap"
              >
                <Badge variant="outline" className="text-xs gap-1 bg-card px-2.5 py-1">
                  <TrendingUp className="w-3 h-3 text-primary" />
                  {diagnosis.estimated_price_range}
                </Badge>
                <Badge variant="outline" className={`text-xs gap-1 px-2.5 py-1 capitalize ${
                  diagnosis.urgency === "high" ? "border-destructive/30 text-destructive bg-destructive/5" :
                  diagnosis.urgency === "medium" ? "border-warning/30 text-warning bg-warning/5" :
                  "border-border bg-card"
                }`}>
                  <Zap className="w-3 h-3" />
                  {diagnosis.urgency} urgency
                </Badge>
                <Badge variant="outline" className="text-xs gap-1 bg-card px-2.5 py-1 capitalize">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  {diagnosis.service_type}
                </Badge>
              </motion.div>

              {/* Upsell hint */}
              {diagnosis.upsell_hint && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1 }}
                  className="text-[11px] text-primary/80 bg-primary/5 rounded-lg px-3 py-2 border border-primary/10"
                >
                  💡 {diagnosis.upsell_hint}
                </motion.p>
              )}

              {/* CTA */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }}>
                <Button onClick={handleBook} className="w-full bg-gradient-to-r from-primary to-primary/85 text-primary-foreground font-semibold rounded-xl h-12 gap-2 active:scale-[0.97] transition-transform shadow-sm">
                  Book {diagnosis.category} Service <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>

              <p className="text-[10px] text-muted-foreground text-center">
                Final price confirmed after inspection. No work starts without your approval.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area — mobile-optimized with auto-resize textarea */}
      <div className="p-3 border-t border-border/30 bg-card/90 backdrop-blur-sm">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasStarted ? "Describe more details..." : "What's the problem?"}
            className="flex-1 bg-secondary/40 rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground text-foreground border border-transparent focus:border-primary/20 transition-colors resize-none overflow-hidden"
            rows={1}
            style={{ minHeight: 44, maxHeight: 100 }}
            disabled={isStreaming}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming}
            className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm shrink-0 active:scale-90 transition-transform"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
