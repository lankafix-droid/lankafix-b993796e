import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { track } from "@/lib/analytics";

interface Props {
  onTranscript: (text: string) => void;
}

const DiagnoseVoiceInput = ({ onTranscript }: Props) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const startRecording = () => {
    setError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input not supported in this browser. Please type your issue instead.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
      if (event.results[0].isFinal) {
        onTranscript(text);
        track("diagnose_voice_input", { text });
        setIsRecording(false);
      }
    };

    recognition.onerror = () => {
      setError("Could not capture voice. Please try again or type your issue.");
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    track("diagnose_voice_start", {});
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mic className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Describe Your Problem</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Tap the microphone and describe the issue in your own words.
      </p>

      <Button
        variant={isRecording ? "destructive" : "outline"}
        size="sm"
        className="w-full"
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? (
          <>
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            Listening... Tap to stop
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 mr-1.5" />
            Tap to Speak
          </>
        )}
      </Button>

      {transcript && (
        <div className="bg-muted/50 border rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1">You said:</p>
          <p className="text-sm text-foreground italic">"{transcript}"</p>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
};

export default DiagnoseVoiceInput;
