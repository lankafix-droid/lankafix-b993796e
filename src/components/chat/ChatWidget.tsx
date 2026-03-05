import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import MascotIcon from "@/components/brand/MascotIcon";
import {
  createInitialState,
  processUserMessage,
  type ConversationState,
  type ChatMsg,
  type QuickReply,
} from "@/engines/conversationEngine";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ConversationState>(createInitialState);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [state.history.length, open]);

  const send = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setState((prev) => processUserMessage(prev, text.trim()));
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    []
  );

  const handleQuickReply = useCallback(
    (qr: QuickReply) => send(qr.value),
    [send]
  );

  const toggleVoice = useCallback(() => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (isListening) {
      setIsListening(false);
      return;
    }
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      send(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    setIsListening(true);
    recognition.start();
  }, [isListening, send]);

  // Floating button when closed
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  const lastMsg = state.history[state.history.length - 1];
  const quickReplies = lastMsg?.role === "assistant" ? lastMsg.quickReplies : undefined;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-2rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shrink-0">
        <MascotIcon state="default" size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">LankaFix Assistant</p>
          <p className="text-xs opacity-80">Online · Ready to help</p>
        </div>
        <button onClick={() => setOpen(false)} className="p-1 hover:bg-primary-foreground/10 rounded-full">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {state.history.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
      </div>

      {/* Quick Replies */}
      {quickReplies && quickReplies.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
          {quickReplies.map((qr) => (
            <button
              key={qr.value}
              onClick={() => handleQuickReply(qr)}
              className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors whitespace-nowrap"
            >
              {qr.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border px-3 py-2 flex items-center gap-2 shrink-0 bg-card">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Type a message..."
          className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
        />
        <button
          onClick={toggleVoice}
          className={`p-1.5 rounded-full transition-colors ${isListening ? "bg-destructive/10 text-destructive" : "text-muted-foreground hover:text-foreground"}`}
          aria-label={isListening ? "Stop recording" : "Start recording"}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <Button size="sm" onClick={() => send(input)} disabled={!input.trim()} className="h-8 w-8 p-0">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2`}>
      {!isUser && (
        <div className="shrink-0 mt-1">
          <MascotIcon state="happy" size="sm" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        }`}
      >
        {msg.content.split("\n").map((line, i) => {
          // Simple bold markdown
          const parts = line.split(/(\*\*.*?\*\*)/g).map((p, j) => {
            if (p.startsWith("**") && p.endsWith("**")) {
              return <strong key={j}>{p.slice(2, -2)}</strong>;
            }
            // Simple link markdown
            const linkMatch = p.match(/\[(.+?)\]\((.+?)\)/);
            if (linkMatch) {
              return (
                <a key={j} href={linkMatch[2]} className="underline font-medium" target="_blank" rel="noreferrer">
                  {linkMatch[1]}
                </a>
              );
            }
            return <span key={j}>{p}</span>;
          });
          return (
            <span key={i}>
              {parts}
              {i < msg.content.split("\n").length - 1 && <br />}
            </span>
          );
        })}
      </div>
    </div>
  );
}
