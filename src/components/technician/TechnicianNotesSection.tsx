/**
 * Technician Job Notes — DB-backed notes for field technicians.
 * Writes to technician_job_notes table.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Send, Loader2 } from "lucide-react";

interface Props {
  bookingId: string;
  partnerId: string;
}

const NOTE_TYPES = [
  { value: "diagnosis", label: "Diagnosis" },
  { value: "repair", label: "Repair Note" },
  { value: "parts", label: "Parts Needed" },
  { value: "general", label: "General" },
];

export default function TechnicianNotesSection({ bookingId, partnerId }: Props) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState("general");

  const { data: notes = [] } = useQuery({
    queryKey: ["tech-notes", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technician_job_notes")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!bookingId,
  });

  const addNote = useMutation({
    mutationFn: async () => {
      if (!content.trim()) throw new Error("Note cannot be empty");
      const { error } = await supabase.from("technician_job_notes").insert({
        booking_id: bookingId,
        partner_id: partnerId,
        note_type: noteType,
        content: content.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      toast.success("Note saved");
      queryClient.invalidateQueries({ queryKey: ["tech-notes", bookingId] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to save note"),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" /> Field Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {NOTE_TYPES.map((t) => (
            <Button
              key={t.value}
              size="sm"
              variant={noteType === t.value ? "default" : "outline"}
              className="text-[10px] h-6 shrink-0"
              onClick={() => setNoteType(t.value)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add diagnosis findings, repair notes, or parts needed..."
          rows={2}
          className="text-sm"
        />
        <Button
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => addNote.mutate()}
          disabled={addNote.isPending || !content.trim()}
        >
          {addNote.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
          Save Note
        </Button>

        {notes.length > 0 && (
          <div className="space-y-2 border-t border-border/30 pt-2">
            {notes.map((n: any) => (
              <div key={n.id} className="bg-muted/50 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-primary capitalize">{(n.note_type || "general").replace(/_/g, " ")}</span>
                  <span className="text-[9px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-foreground">{n.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
