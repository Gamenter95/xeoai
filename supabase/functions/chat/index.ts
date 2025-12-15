import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessId, messages, sessionId } = await req.json();

    if (!businessId) {
      return new Response(
        JSON.stringify({ error: "Business ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch business data
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      console.error("Business not found:", businessError);
      return new Response(
        JSON.stringify({ error: "Business not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check usage limits
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: usage } = await supabase
      .from("usage_tracking")
      .select("message_count")
      .eq("business_id", businessId)
      .eq("month_year", currentMonth)
      .single();

    // Get user's plan
    const { data: userPlan } = await supabase
      .from("user_plans")
      .select("plan")
      .eq("user_id", business.user_id)
      .single();

    const { data: planData } = await supabase
      .from("plans")
      .select("message_limit")
      .eq("name", userPlan?.plan || "free")
      .single();

    const messageLimit = planData?.message_limit || 100;
    const currentCount = usage?.message_count || 0;

    if (currentCount >= messageLimit) {
      return new Response(
        JSON.stringify({ 
          error: "Message limit reached",
          message: "This business has reached its monthly message limit. Please upgrade your plan for more messages."
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch additional business data including knowledge base
    const [hoursResult, servicesResult, faqsResult, instructionsResult, knowledgeResult] = await Promise.all([
      supabase.from("business_hours").select("*").eq("business_id", businessId),
      supabase.from("business_services").select("*").eq("business_id", businessId),
      supabase.from("business_faqs").select("*").eq("business_id", businessId),
      supabase.from("business_custom_instructions").select("*").eq("business_id", businessId).single(),
      supabase.from("knowledge_base").select("*").eq("business_id", businessId),
    ]);

    const hours = hoursResult.data || [];
    const services = servicesResult.data || [];
    const faqs = faqsResult.data || [];
    const customInstructions = instructionsResult.data?.instructions || "";
    const knowledgeBase = knowledgeResult.data || [];

    // Build system prompt with AI memory context
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const hoursText = hours.map((h: any) => {
      if (h.is_closed) return `${dayNames[h.day_of_week]}: Closed`;
      return `${dayNames[h.day_of_week]}: ${h.open_time || "N/A"} - ${h.close_time || "N/A"}`;
    }).join("\n");

    const servicesText = services.map((s: any) => 
      `- ${s.name}${s.description ? `: ${s.description}` : ""}${s.price ? ` (${s.price})` : ""}`
    ).join("\n");

    const faqsText = faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");

    // Build knowledge base text
    const knowledgeText = knowledgeBase.map((k: any) => {
      if (k.type === "text") {
        return `### ${k.title}\n${k.content}`;
      } else if (k.type === "website") {
        return `### ${k.title} (Website: ${k.url})\n${k.content || ""}`;
      } else if (k.type === "file") {
        return `### ${k.title} (File: ${k.file_name})\n${k.content || ""}`;
      }
      return "";
    }).filter(Boolean).join("\n\n");

    const systemPrompt = `You are a helpful, friendly, and professional AI assistant for ${business.name}. You have been trained with comprehensive knowledge about this business and should provide accurate, helpful responses.

## Business Profile
**Name:** ${business.name}
${business.description ? `**About:** ${business.description}` : ""}

${hoursText ? `## Operating Hours\n${hoursText}` : ""}

${servicesText ? `## Services & Products\n${servicesText}` : ""}

${faqsText ? `## Knowledge Base (FAQ)\n${faqsText}` : ""}

${knowledgeText ? `## Additional Knowledge\n${knowledgeText}` : ""}

${customInstructions ? `## Special Instructions & AI Memory\n${customInstructions}` : ""}

## Response Guidelines
- Be warm, professional, and conversational
- Provide accurate information based on the business data above
- If asked about something not covered in the data, politely explain you don't have that specific information and suggest contacting the business directly
- Keep responses helpful but concise
- Use markdown formatting for better readability when appropriate
- Remember context from the conversation and provide personalized responses
- Never make up information that wasn't provided
- If the business has specific instructions above, follow them carefully`;

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update usage count
    const { error: upsertError } = await supabase
      .from("usage_tracking")
      .upsert(
        {
          business_id: businessId,
          month_year: currentMonth,
          message_count: currentCount + 1,
        },
        { onConflict: "business_id,month_year" }
      );

    if (upsertError) {
      console.error("Failed to update usage:", upsertError);
    }

    // Store conversation if session provided
    if (sessionId && messages.length > 0) {
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage.role === "user") {
        const { data: existingConvo } = await supabase
          .from("chat_conversations")
          .select("id")
          .eq("business_id", businessId)
          .eq("session_id", sessionId)
          .single();

        let conversationId = existingConvo?.id;

        if (!conversationId) {
          const { data: newConvo } = await supabase
            .from("chat_conversations")
            .insert({ business_id: businessId, session_id: sessionId })
            .select("id")
            .single();
          conversationId = newConvo?.id;
        }

        if (conversationId) {
          await supabase.from("chat_messages").insert({
            conversation_id: conversationId,
            role: "user",
            content: lastUserMessage.content,
          });
        }
      }
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
