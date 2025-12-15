import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, X, Send, Loader2, Minimize2, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface FAQ {
  id: string;
  question: string;
}

interface ChatWidgetProps {
  businessId: string;
  businessName?: string;
  businessDescription?: string;
  businessAvatar?: string;
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  position?: "bottom-right" | "bottom-left";
  borderRadius?: "rounded" | "square";
  faqs?: FAQ[];
}

export default function ChatWidget({ 
  businessId, 
  businessName = "AI Assistant", 
  businessDescription,
  businessAvatar,
  primaryColor = "#6366f1",
  backgroundColor = "#ffffff",
  textColor = "#1f2937",
  position = "bottom-right",
  borderRadius = "rounded",
  faqs = []
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const positionClasses = position === "bottom-right" ? "right-6" : "left-6";
  const radiusClasses = borderRadius === "rounded" ? "rounded-2xl" : "rounded-lg";
  const widgetRadiusClasses = borderRadius === "rounded" ? "rounded-2xl" : "rounded-xl";
  const buttonRadius = borderRadius === "rounded" ? "rounded-full" : "rounded-xl";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
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

  const Avatar = ({ size = "md" }: { size?: "sm" | "md" }) => {
    const sizeClasses = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
    if (businessAvatar) {
      return (
        <img 
          src={businessAvatar} 
          alt={businessName} 
          className={`${sizeClasses} ${radiusClasses} object-cover`}
        />
      );
    }
    return (
      <div 
        className={`${sizeClasses} ${radiusClasses} flex items-center justify-center text-white font-medium`}
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
          fixed bottom-6 ${positionClasses} w-14 h-14 ${buttonRadius}
          shadow-lg flex items-center justify-center 
          text-white z-50 transition-all duration-200
          hover:scale-105 hover:shadow-xl
        `}
        style={{ backgroundColor: primaryColor }}
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </button>

      {/* Chat Window */}
      {isOpen && !isMinimized && (
        <div 
          className={`
            fixed bottom-24 ${positionClasses} w-[360px] h-[500px] 
            border shadow-2xl flex flex-col z-50 overflow-hidden
            animate-scale-in ${widgetRadiusClasses}
          `}
          style={{ backgroundColor, borderColor: `${primaryColor}20` }}
        >
          {/* Header */}
          <div 
            className="px-4 py-3 flex items-center gap-3"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="relative">
              <Avatar />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 text-white min-w-0">
              <p className="font-semibold text-sm truncate">{businessName}</p>
              <p className="text-xs opacity-80 truncate">{businessDescription || "Online"}</p>
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
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{ backgroundColor: `${backgroundColor}` }}
          >
            {messages.length === 0 && (
              <div className="text-center py-6">
                <div 
                  className={`w-12 h-12 ${radiusClasses} mx-auto mb-3 flex items-center justify-center text-white`}
                  style={{ backgroundColor: primaryColor }}
                >
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: textColor }}>Hello!</h3>
                <p className="text-xs max-w-[200px] mx-auto" style={{ color: `${textColor}80` }}>
                  How can I help you today?
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && <Avatar size="sm" />}
                <div
                  className={`
                    max-w-[75%] px-3 py-2 text-sm leading-relaxed
                    ${msg.role === "user"
                      ? `text-white ${radiusClasses} rounded-br-sm`
                      : `${radiusClasses} rounded-bl-sm border`
                    }
                  `}
                  style={
                    msg.role === "user" 
                      ? { backgroundColor: primaryColor } 
                      : { backgroundColor, color: textColor, borderColor: `${primaryColor}20` }
                  }
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className={`w-7 h-7 ${radiusClasses} flex items-center justify-center`} style={{ backgroundColor: `${primaryColor}15` }}>
                    <User className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex items-end gap-2 justify-start">
                <Avatar size="sm" />
                <div 
                  className={`px-4 py-3 ${radiusClasses} rounded-bl-sm border`}
                  style={{ backgroundColor, borderColor: `${primaryColor}20` }}
                >
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: `${textColor}50`, animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: `${textColor}50`, animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: `${textColor}50`, animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* FAQ Suggestions */}
          {faqs.length > 0 && messages.length === 0 && (
            <div className="px-3 pb-2 flex gap-2 overflow-x-auto" style={{ backgroundColor }}>
              {faqs.slice(0, 3).map((faq) => (
                <button
                  key={faq.id}
                  onClick={() => sendMessage(faq.question)}
                  className="shrink-0 px-3 py-1.5 text-xs border rounded-full hover:opacity-80 transition-opacity truncate max-w-[140px]"
                  style={{ borderColor: `${primaryColor}30`, color: primaryColor }}
                >
                  {faq.question}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t" style={{ backgroundColor, borderColor: `${primaryColor}15` }}>
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
                className={`flex-1 h-10 ${radiusClasses} text-sm border`}
                style={{ 
                  backgroundColor: `${primaryColor}08`, 
                  borderColor: `${primaryColor}20`,
                  color: textColor 
                }}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={isLoading || !input.trim()}
                className={`h-10 w-10 ${buttonRadius} border-0 transition-all`}
                style={{ backgroundColor: primaryColor }}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Minimized State */}
      {isOpen && isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className={`fixed bottom-24 ${positionClasses} px-4 py-2 ${radiusClasses} shadow-lg text-white z-50 flex items-center gap-2 hover:shadow-xl transition-all animate-scale-in text-sm`}
          style={{ backgroundColor: primaryColor }}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="font-medium">Continue</span>
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
