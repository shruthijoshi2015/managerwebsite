"use client";
import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Activity } from "lucide-react";

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  className?: string;
  title?: string;
}

export function VoiceInputButton({ onResult, className = "", title = "Voice input (Click to speak)" }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in your browser. Please try Chrome or Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Stop after one phrase/sentence for clean insertion
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0].transcript;
        if (transcript && transcript.trim()) {
          onResult(transcript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          alert("Microphone access blocked. Please allow microphone permissions in your browser settings.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition", err);
      setIsListening(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={toggleListening}
        title={isListening ? "Listening... Click to stop" : title}
        className={`p-1.5 rounded-full transition-all flex items-center justify-center ${
          isListening
            ? "bg-red-500 text-white animate-pulse shadow-sm shadow-red-300 ring-2 ring-red-200"
            : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        } ${className}`}
      >
        {isListening ? <Activity className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
      </button>
      {isListening && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow whitespace-nowrap pointer-events-none z-50">
          Listening...
        </span>
      )}
    </div>
  );
}
