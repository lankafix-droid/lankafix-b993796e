/**
 * BookingChatPanel — In-app masked chat between customer and technician.
 * Contact details are automatically detected and masked.
 */
import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, ShieldCheck, Lock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBookingChat, type BookingMessage } from "@/hooks/useBookingChat";

interface BookingChatPanelProps {
  bookingId: string | null;
  senderRole?: "customer" | "partner";
  contactUnlocked?: boolean;
  className?: string;
}

export default function BookingChatPanel({
  bookingId,
  senderRole = "customer",
  contactUnlocked = false,
  className = "",
}: BookingChatPanelProps) {
  const { messages, loading, sending, sendMessage } = useBookingChat(bookingId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input, senderRole);
    setInput("");
  };

  if (!bookingId) return null;

  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden flex flex-col ${className}`}>
      {/* Header */}
      <div className="bg-primary/5 border-b border-border px-4 py-3 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Booking Chat</span>
        <Badge variant="outline" className="ml-auto text-[10px] gap-1">
          <ShieldCheck className="w-3 h-3 text-success" />
          Protected
        </Badge>
      </div>

      {/* Protection notice */}
      {!contactUnlocked && (
        <div className="bg-warning/5 border-b border-warning/20 px-4 py-2 flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-tight">
            Direct contact details are shared after booking confirmation. All messages are monitored for your protection.
          </p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-[200px] max-h-[320px] overflow-y-auto px-3 py-3 space-y-2">
        {loading && (
          <p className="text-xs text-muted-foreground text-center py-4">Loading messages...</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No messages yet. Start a conversation about your service request.
          </p>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} isOwn={msg.sender_role === senderRole} />
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-border px-3 py-2 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          disabled={sending}
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="h-8 w-8 p-0"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function ChatBubble({ msg, isOwn }: { msg: BookingMessage; isOwn: boolean }) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        {msg.was_masked && (
          <div className="flex items-center gap-1 mt-1 opacity-70">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-[10px]">Contact info filtered</span>
          </div>
        )}
        <p className={`text-[10px] mt-1 ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
