import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send, Loader2, Minimize2, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatWidgetProps {
  businessId: string;
  businessName?: string;
  businessDescription?: string;
  businessAvatar?: string;
  primaryColor?: string;
  position?: "bottom-right" | "bottom-left";
  borderRadius?: "rounded" | "square";
}

export default function ChatWidget({ 
  businessId, 
  businessName = "AI Assistant", 
  businessDescription,
  businessAvatar,
  primaryColor = "#7c3aed",
  position = "bottom-right",
  borderRadius = "rounded"
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const positionClasses = position === "bottom-right" 
    ? "right-6" 
    : "left-6";

  const radiusClasses = borderRadius === "rounded" 
    ? "rounded-2xl" 
    : "rounded-lg";

  const widgetRadiusClasses = borderRadius === "rounded"
    ? "rounded-3xl"
    : "rounded-xl";

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

  const Avatar = () => {
    if (businessAvatar) {
      return (
        <img 
          src={businessAvatar} 
          alt={businessName} 
          className={`w-10 h-10 ${radiusClasses} object-cover`}
        />
      );
    }
    return (
      <div 
        className={`w-10 h-10 ${radiusClasses} flex items-center justify-center text-white font-semibold text-sm`}
        style={{ backgroundColor: primaryColor }}
      >
        {businessName.charAt(0).toUpperCase()}
      </div>
    );
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
          fixed bottom-6 ${positionClasses} w-14 h-14 ${radiusClasses}
          shadow-lg flex items-center justify-center 
          text-white z-50 transition-all duration-200
          hover:scale-105 hover:shadow-xl
        `}
        style={{ backgroundColor: primaryColor }}
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <MessageSquare className="w-5 h-5" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && !isMinimized && (
        <div 
          className={`
            fixed bottom-24 ${positionClasses} w-[380px] h-[520px] 
            bg-card border border-border ${widgetRadiusClasses}
            shadow-2xl flex flex-col z-50 overflow-hidden
            animate-scale-in
          `}
        >
          {/* Header */}
          <div 
            className="p-4 flex items-center gap-3"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="relative">
              <Avatar />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 text-white min-w-0">
              <p className="font-semibold text-base truncate">{businessName}</p>
              <p className="text-xs opacity-90 truncate">
                {businessDescription || "Online"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg h-8 w-8"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div 
                  className={`w-14 h-14 ${radiusClasses} mx-auto mb-3 flex items-center justify-center text-white`}
                  style={{ backgroundColor: primaryColor }}
                >
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-base mb-1">Hello!</h3>
                <p className="text-muted-foreground text-sm max-w-[240px] mx-auto">
                  How can I help you today?
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="shrink-0">
                    {businessAvatar ? (
                      <img 
                        src={businessAvatar} 
                        alt={businessName} 
                        className={`w-7 h-7 ${radiusClasses} object-cover`}
                      />
                    ) : (
                      <div 
                        className={`w-7 h-7 ${radiusClasses} flex items-center justify-center text-white text-xs font-semibold`}
                        style={{ backgroundColor: primaryColor }}
                      >
                        {businessName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
                <div
                  className={`
                    max-w-[75%] px-3.5 py-2.5 text-sm leading-relaxed
                    ${msg.role === "user"
                      ? `text-white ${radiusClasses} rounded-br-sm`
                      : `bg-card border border-border text-foreground ${radiusClasses} rounded-bl-sm`
                    }
                  `}
                  style={msg.role === "user" ? { backgroundColor: primaryColor } : undefined}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="shrink-0">
                    <div className={`w-7 h-7 ${radiusClasses} bg-muted flex items-center justify-center`}>
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex items-end gap-2 justify-start">
                <div 
                  className={`w-7 h-7 ${radiusClasses} flex items-center justify-center text-white text-xs font-semibold`}
                  style={{ backgroundColor: primaryColor }}
                >
                  {businessName.charAt(0).toUpperCase()}
                </div>
                <div className={`bg-card border border-border px-4 py-3 ${radiusClasses} rounded-bl-sm`}>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-card">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                disabled={isLoading}
                className={`flex-1 h-10 ${radiusClasses} border-border/50 focus:border-primary bg-muted/50 text-sm`}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={isLoading || !input.trim()}
                className={`h-10 w-10 ${radiusClasses} border-0 transition-all`}
                style={{ backgroundColor: primaryColor }}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Minimized State */}
      {isOpen && isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className={`fixed bottom-24 ${positionClasses} px-4 py-2.5 ${radiusClasses} shadow-lg text-white z-50 flex items-center gap-2 hover:shadow-xl transition-all animate-scale-in text-sm`}
          style={{ backgroundColor: primaryColor }}
        >
          <MessageSquare className="w-4 h-4" />
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
