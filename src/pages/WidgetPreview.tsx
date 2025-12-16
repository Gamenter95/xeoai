import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ChatWidget from "@/components/chat/ChatWidget";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatbotData {
  businessName: string;
  businessDescription: string | null;
  businessAvatar: string | null;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  position: "bottom-right" | "bottom-left";
  borderRadius: "rounded" | "square";
  faqs: { id: string; question: string }[];
}

export default function WidgetPreview() {
  const { businessId } = useParams<{ businessId: string }>();
  const [data, setData] = useState<ChatbotData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (businessId) {
      fetchChatbotData();
    }
  }, [businessId]);

  const fetchChatbotData = async () => {
    try {
      const [businessResult, stylesResult, faqsResult] = await Promise.all([
        supabase.from("businesses").select("name, description").eq("id", businessId).single(),
        supabase.from("chatbot_styles").select("*").eq("business_id", businessId).single(),
        supabase.from("business_faqs").select("id, question").eq("business_id", businessId).limit(5),
      ]);

      const business = businessResult.data;
      const styles = stylesResult.data;
      const faqs = faqsResult.data || [];

      setData({
        businessName: business?.name || "AI Assistant",
        businessDescription: business?.description,
        businessAvatar: styles?.avatar_url,
        primaryColor: styles?.primary_color || "#6366f1",
        backgroundColor: styles?.background_color || "#ffffff",
        textColor: styles?.text_color || "#1f2937",
        position: (styles?.position as "bottom-right" | "bottom-left") || "bottom-right",
        borderRadius: (styles?.border_radius as "rounded" | "square") || "rounded",
        faqs,
      });
    } catch (error) {
      console.error("Error fetching chatbot data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 p-8">
        <div className="max-w-2xl mx-auto text-center mb-8">
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/50 to-muted p-8">
      <div className="max-w-2xl mx-auto text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Widget Preview</h1>
        <p className="text-muted-foreground text-sm">This is how your chat widget will appear on your website.</p>
      </div>
      {businessId && data && (
        <ChatWidget 
          businessId={businessId}
          businessName={data.businessName}
          businessDescription={data.businessDescription || undefined}
          businessAvatar={data.businessAvatar || undefined}
          primaryColor={data.primaryColor}
          backgroundColor={data.backgroundColor}
          textColor={data.textColor}
          position={data.position}
          borderRadius={data.borderRadius}
          faqs={data.faqs}
        />
      )}
    </div>
  );
}
