"use client";
import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Loader2, BrainCircuit } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "model";
  content: string;
};

export function CoachMeChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Hi! I'm your AI coaching assistant. Ask me anything about your team's goals, tasks, or recent 1:1 notes." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages })
      });

      if (!res.ok) {
        throw new Error("API failed");
      }
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: "model", content: data.text }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "model", content: "⚠️ Sorry, I encountered an error connecting to the AI. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-indigo-500/25 hover:scale-105 transition-all duration-300 flex items-center justify-center z-[100] group"
        >
          <BrainCircuit className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
          {/* Unread dot simulation */}
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
        </button>
      )}

      {/* Chat Window Overlay */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-4rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300 origin-bottom-right">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 shrink-0 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <BrainCircuit className="w-4 h-4 text-indigo-300" />
              </div>
              <div>
                <h3 className="font-bold text-[14px]">Coach Me</h3>
                <p className="text-[11px] text-slate-300">AI Manager Assistant</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-slate-300 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-sm'
                  }`}
                >
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <div className="prose prose-sm prose-slate max-w-none prose-p:leading-snug prose-li:my-0.5">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-slate-400 shadow-sm">
                  <Sparkles className="w-4 h-4 animate-pulse text-indigo-400" />
                  <span className="text-[13px]">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            <form onSubmit={handleSubmit} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your team..."
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
            <div className="text-center mt-2">
              <p className="text-[10px] text-slate-400">AI can make mistakes. Check important information.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
