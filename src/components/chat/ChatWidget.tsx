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
  isFreeTier?: boolean;
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
  faqs = [],
  isFreeTier = true
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [limitReached, setLimitReached] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const positionClasses = position === "bottom-right" ? "right-5" : "left-5";
  const radiusClasses = borderRadius === "rounded" ? "rounded-2xl" : "rounded-lg";
  const widgetRadiusClasses = borderRadius === "rounded" ? "rounded-2xl" : "rounded-xl";
  const buttonRadius = borderRadius === "rounded" ? "rounded-full" : "rounded-xl";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendMessageFreeTier = async (messageText: string) => {
    try {
      // First, get the system prompt from our edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/free-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          sessionId,
          message: messageText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.limitReached || data.error === "LIMIT_REACHED") {
          setLimitReached(true);
          setMessages((prev) => [
            ...prev,
            { 
              role: "assistant", 
              content: "⚠️ **Message Limit Reached**\n\nThis chatbot has reached its monthly message limit. Please contact the business owner or try again next month." 
            },
          ]);
          return;
        }
        
        // If not free tier, fall back to paid endpoint
        if (data.usePaid) {
          await sendMessagePaidTier(messageText);
          return;
        }
        
        throw new Error(data.error || "Failed to initialize chat");
      }

      const { systemPrompt, chatId } = data;

      // Connect to WebSocket
      const wsUrl = "wss://backend.buildpicoapps.com/api/chatbot/chat";
      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;

      // Add empty assistant message for streaming
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      websocket.addEventListener("open", () => {
        console.log("WebSocket connected for free tier chat");
        websocket.send(
          JSON.stringify({
            chatId: chatId,
            appId: "more-method",
            systemPrompt: systemPrompt,
            message: messageText,
          })
        );
      });

      websocket.onmessage = (event) => {
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === "assistant") {
            return [
              ...prev.slice(0, -1),
              { role: "assistant", content: lastMessage.content + event.data }
            ];
          }
          return prev;
        });
      };

      websocket.onclose = (event) => {
        console.log("WebSocket closed:", event.code);
        setIsLoading(false);
        wsRef.current = null;
        
        if (event.code !== 1000) {
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === "assistant" && !lastMessage.content) {
              return [
                ...prev.slice(0, -1),
                { role: "assistant", content: "Oops! Something went wrong. Please try again." }
              ];
            }
            return prev;
          });
        }
      };

      websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsLoading(false);
      };

    } catch (error: any) {
      console.error("Free tier chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: error.message || "Sorry, something went wrong. Please try again." },
      ]);
      setIsLoading(false);
    }
  };

  const sendMessagePaidTier = async (messageText: string) => {
    const userMessage: Message = { role: "user", content: messageText };
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
        
        if (errorData.limitReached || errorData.error === "LIMIT_REACHED" || response.status === 429) {
          setLimitReached(true);
          setMessages((prev) => [
            ...prev,
            { 
              role: "assistant", 
              content: "⚠️ **Message Limit Reached**\n\nThis chatbot has reached its monthly message limit. Please contact the business owner or try again next month." 
            },
          ]);
          return;
        }
        
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

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading || limitReached) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    if (isFreeTier) {
      await sendMessageFreeTier(text);
    } else {
      await sendMessagePaidTier(text);
    }
  };

  const Avatar = ({ size = "md" }: { size?: "sm" | "md" }) => {
    const sizeClasses = size === "sm" ? "w-7 h-7 text-xs" : "w-10 h-10 text-sm";
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
        className={`${sizeClasses} ${radiusClasses} flex items-center justify-center text-white font-semibold`}
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
          fixed bottom-5 ${positionClasses} w-14 h-14 ${buttonRadius}
          shadow-xl flex items-center justify-center 
          text-white z-50 transition-all duration-300 ease-out
          hover:scale-105 hover:shadow-2xl
        `}
        style={{ backgroundColor: primaryColor }}
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </button>

      {/* Chat Window */}
      {isOpen && !isMinimized && (
        <div 
          className={`
            fixed bottom-24 ${positionClasses} w-[380px] h-[520px] 
            border shadow-2xl flex flex-col z-50 overflow-hidden
            animate-in fade-in-0 zoom-in-95 duration-200 ${widgetRadiusClasses}
          `}
          style={{ backgroundColor, borderColor: `${primaryColor}15` }}
        >
          {/* Header */}
          <div 
            className="px-4 py-4 flex items-center gap-3"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="relative">
              <Avatar />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 text-white min-w-0">
              <p className="font-semibold text-[15px] truncate">{businessName}</p>
              <p className="text-xs text-white/70 truncate">{businessDescription || "Online • Ready to help"}</p>
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
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ backgroundColor }}
          >
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div 
                  className={`w-14 h-14 ${radiusClasses} mx-auto mb-4 flex items-center justify-center text-white shadow-lg`}
                  style={{ backgroundColor: primaryColor }}
                >
                  {businessAvatar ? (
                    <img src={businessAvatar} alt="" className={`w-full h-full object-cover ${radiusClasses}`} />
                  ) : (
                    <span className="font-bold text-lg">{businessName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <h3 className="font-semibold text-base mb-1" style={{ color: textColor }}>Welcome!</h3>
                <p className="text-sm max-w-[240px] mx-auto leading-relaxed" style={{ color: `${textColor}99` }}>
                  Hi there! How can I help you today?
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
                    max-w-[75%] px-4 py-2.5 text-[14px] leading-relaxed
                    ${msg.role === "user"
                      ? `text-white ${radiusClasses} rounded-br-md`
                      : `${radiusClasses} rounded-bl-md border`
                    }
                  `}
                  style={
                    msg.role === "user" 
                      ? { backgroundColor: primaryColor } 
                      : { backgroundColor: `${primaryColor}08`, color: textColor, borderColor: `${primaryColor}15` }
                  }
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className={`w-7 h-7 ${radiusClasses} flex items-center justify-center shrink-0`} style={{ backgroundColor: `${primaryColor}12` }}>
                    <User className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex items-end gap-2 justify-start">
                <Avatar size="sm" />
                <div 
                  className={`px-4 py-3 ${radiusClasses} rounded-bl-md border`}
                  style={{ backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}15` }}
                >
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: `${textColor}40`, animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: `${textColor}40`, animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: `${textColor}40`, animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* FAQ Suggestions */}
          {faqs.length > 0 && messages.length === 0 && (
            <div className="px-4 pb-3 flex gap-2 overflow-x-auto" style={{ backgroundColor }}>
              {faqs.slice(0, 3).map((faq) => (
                <button
                  key={faq.id}
                  onClick={() => sendMessage(faq.question)}
                  className="shrink-0 px-3 py-2 text-xs font-medium border rounded-full hover:opacity-80 transition-all truncate max-w-[160px]"
                  style={{ borderColor: `${primaryColor}25`, color: primaryColor, backgroundColor: `${primaryColor}08` }}
                >
                  {faq.question}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t" style={{ backgroundColor, borderColor: `${primaryColor}10` }}>
          {limitReached ? (
            <div 
              className={`p-3 ${radiusClasses} text-center border`}
              style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}
            >
              <p className="text-sm font-medium text-red-700">⚠️ Message Limit Reached</p>
              <p className="text-xs text-red-600 mt-1">This chatbot has reached its monthly limit.</p>
            </div>
          ) : (
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
                placeholder="Type your message..."
                disabled={isLoading}
                className={`flex-1 h-11 ${radiusClasses} text-sm border focus-visible:ring-1`}
                style={{ 
                  backgroundColor: `${primaryColor}05`, 
                  borderColor: `${primaryColor}15`,
                  color: textColor 
                }}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={isLoading || !input.trim()}
                className={`h-11 w-11 ${buttonRadius} border-0 transition-all shadow-md hover:shadow-lg`}
                style={{ backgroundColor: primaryColor }}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          )}
          </div>
        </div>
      )}

      {/* Minimized State */}
      {isOpen && isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className={`fixed bottom-24 ${positionClasses} px-4 py-2.5 ${radiusClasses} shadow-xl text-white z-50 flex items-center gap-2 hover:shadow-2xl transition-all animate-in fade-in-0 zoom-in-95 duration-200 text-sm font-medium`}
          style={{ backgroundColor: primaryColor }}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Continue Chat</span>
          {messages.length > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">
              {messages.length}
            </span>
          )}
        </button>
      )}
    </>
  );
}