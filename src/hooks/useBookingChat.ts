/**
 * useBookingChat — Real-time masked chat for booking participants
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { detectAndMaskContact } from "@/engines/antiBypassEngine";

export interface BookingMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  was_masked: boolean;
  created_at: string;
}

export function useBookingChat(bookingId: string | null) {
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Fetch existing messages
  useEffect(() => {
    if (!bookingId) return;
    setLoading(true);
    supabase
      .from("booking_messages")
      .select("id, booking_id, sender_id, sender_role, content, was_masked, created_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data as BookingMessage[]) || []);
        setLoading(false);
      });
  }, [bookingId]);

  // Real-time subscription
  useEffect(() => {
    if (!bookingId) return;
    const channel = supabase
      .channel(`chat-${bookingId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "booking_messages", filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          const msg = payload.new as BookingMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);

  const sendMessage = useCallback(
    async (content: string, senderRole: string = "customer") => {
      if (!bookingId || !content.trim()) return;
      setSending(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSending(false); return; }

      // Detect and mask contact info
      const detection = detectAndMaskContact(content.trim());

      const insertData: Record<string, unknown> = {
        booking_id: bookingId,
        sender_id: user.id,
        sender_role: senderRole,
        content: detection.maskedContent,
        was_masked: detection.detected,
      };

      // Only store original if masked (admin audit)
      if (detection.detected) {
        insertData.original_content = detection.originalContent;
      }

      await supabase.from("booking_messages").insert(insertData);

      // Log bypass attempt if detected
      if (detection.detected) {
        await supabase.from("bypass_attempts").insert({
          booking_id: bookingId,
          actor_id: user.id,
          actor_role: senderRole,
          attempt_type: detection.types.join(","),
          detected_content: detection.originalContent,
          action_taken: "masked",
        });
      }

      setSending(false);
    },
    [bookingId]
  );

  return { messages, loading, sending, sendMessage };
}
