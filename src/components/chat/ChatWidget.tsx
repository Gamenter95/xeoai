import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send, Loader2, Bot, Sparkles, Minimize2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatWidgetProps {
  businessId: string;
  businessName?: string;
  primaryColor?: string;
}

export default function ChatWidget({ businessId, businessName = "AI Assistant", primaryColor }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          sessionId,
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || "Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return [...prev.slice(0, -1), { role: "assistant", content: assistantContent }];
                  }
                  return [...prev, { role: "assistant", content: assistantContent }];
                });
              }
            } catch {}
          }
        }
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: error.message || "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setIsMinimized(false);
        }}
        className={`
          fixed bottom-6 right-6 w-16 h-16 rounded-2xl 
          gradient-primary shadow-xl flex items-center justify-center 
          text-white z-50 transition-all duration-300 ease-out
          hover:scale-110 hover:shadow-glow-lg
          ${isOpen ? 'rotate-0' : 'animate-pulse-glow'}
        `}
        style={{ 
          background: primaryColor 
            ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` 
            : undefined 
        }}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageSquare className="w-6 h-6" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && !isMinimized && (
        <div 
          className={`
            fixed bottom-28 right-6 w-[400px] h-[550px] 
            bg-card border border-border rounded-3xl 
            shadow-2xl flex flex-col z-50 overflow-hidden
            animate-scale-in
          `}
        >
          {/* Header */}
          <div 
            className="p-5 flex items-center gap-4 gradient-primary"
            style={{ 
              background: primaryColor 
                ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` 
                : undefined 
            }}
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 text-white">
              <p className="font-semibold text-lg">{businessName}</p>
              <p className="text-sm opacity-80 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Powered by AI
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="w-5 h-5" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-muted/20 to-background">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl gradient-primary mx-auto mb-4 flex items-center justify-center shadow-glow">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Welcome! 👋</h3>
                <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">
                  I'm here to help answer your questions. How can I assist you today?
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`
                    max-w-[85%] p-4 text-sm leading-relaxed
                    ${msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md shadow-lg"
                      : "bg-card border border-border text-foreground rounded-2xl rounded-bl-md shadow-md"
                    }
                  `}
                  style={msg.role === "user" && primaryColor ? { backgroundColor: primaryColor } : undefined}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-card border border-border p-4 rounded-2xl rounded-bl-md shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border bg-card">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-3"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 h-12 rounded-xl border-border/50 focus:border-primary bg-muted/50"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={isLoading || !input.trim()}
                className="h-12 w-12 rounded-xl gradient-primary border-0 shadow-lg hover:shadow-glow transition-all"
                style={primaryColor ? { background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` } : undefined}
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground mt-3">
              Powered by <span className="text-primary font-medium">XeoAI</span>
            </p>
          </div>
        </div>
      )}

      {/* Minimized State */}
      {isOpen && isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-28 right-6 px-6 py-3 rounded-2xl gradient-primary shadow-xl text-white z-50 flex items-center gap-2 hover:shadow-glow-lg transition-all animate-scale-in"
          style={{ 
            background: primaryColor 
              ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` 
              : undefined 
          }}
        >
          <Bot className="w-5 h-5" />
          <span className="font-medium">Continue Chat</span>
          {messages.length > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {messages.length}
            </span>
          )}
        </button>
      )}
    </>
  );
}
