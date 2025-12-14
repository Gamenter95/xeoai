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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
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

    // Fetch additional business data
    const [hoursResult, servicesResult, faqsResult, instructionsResult] = await Promise.all([
      supabase.from("business_hours").select("*").eq("business_id", businessId),
      supabase.from("business_services").select("*").eq("business_id", businessId),
      supabase.from("business_faqs").select("*").eq("business_id", businessId),
      supabase.from("business_custom_instructions").select("*").eq("business_id", businessId).single(),
    ]);

    const hours = hoursResult.data || [];
    const services = servicesResult.data || [];
    const faqs = faqsResult.data || [];
    const customInstructions = instructionsResult.data?.instructions || "";

    // Build system prompt
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const hoursText = hours.map((h: any) => {
      if (h.is_closed) return `${dayNames[h.day_of_week]}: Closed`;
      return `${dayNames[h.day_of_week]}: ${h.open_time || "N/A"} - ${h.close_time || "N/A"}`;
    }).join("\n");

    const servicesText = services.map((s: any) => 
      `- ${s.name}${s.description ? `: ${s.description}` : ""}${s.price ? ` (${s.price})` : ""}`
    ).join("\n");

    const faqsText = faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");

    const systemPrompt = `You are a helpful AI assistant for ${business.name}. Your role is to assist customers with questions about the business.

Business Information:
- Name: ${business.name}
${business.description ? `- Description: ${business.description}` : ""}
${business.contact_email ? `- Email: ${business.contact_email}` : ""}
${business.contact_phone ? `- Phone: ${business.contact_phone}` : ""}
${business.website ? `- Website: ${business.website}` : ""}
${business.address ? `- Address: ${business.address}` : ""}

${hoursText ? `Business Hours:\n${hoursText}` : ""}

${servicesText ? `Services Offered:\n${servicesText}` : ""}

${faqsText ? `Frequently Asked Questions:\n${faqsText}` : ""}

${customInstructions ? `Additional Instructions:\n${customInstructions}` : ""}

Guidelines:
- Be helpful, professional, and friendly
- Only provide information about this specific business
- If you don't have information to answer a question, politely say so and suggest contacting the business directly
- Keep responses concise but informative
- Do not make up information that wasn't provided`;

    // Call AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service quota exceeded." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
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
