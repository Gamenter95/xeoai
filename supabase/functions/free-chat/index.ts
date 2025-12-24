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
    const { businessId, message, sessionId } = await req.json();

    if (!businessId || !message) {
      return new Response(
        JSON.stringify({ error: "Business ID and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Check if user is on free plan
    const { data: userPlan } = await supabase
      .from("user_plans")
      .select("plan")
      .eq("user_id", business.user_id)
      .single();

    if (userPlan?.plan !== "free") {
      return new Response(
        JSON.stringify({ error: "This endpoint is only for free tier users", usePaid: true }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check usage limits for free tier
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: usage } = await supabase
      .from("usage_tracking")
      .select("message_count")
      .eq("business_id", businessId)
      .eq("month_year", currentMonth)
      .single();

    const currentCount = usage?.message_count || 0;
    const freeLimit = 100;

    if (currentCount >= freeLimit) {
      return new Response(
        JSON.stringify({ 
          error: "LIMIT_REACHED",
          limitReached: true,
          message: "Monthly message limit reached. Please upgrade your plan to continue chatting."
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch business data for system prompt
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

    // Build system prompt
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const hoursText = hours.map((h: any) => {
      if (h.is_closed) return `${dayNames[h.day_of_week]}: Closed`;
      return `${dayNames[h.day_of_week]}: ${h.open_time || "N/A"} - ${h.close_time || "N/A"}`;
    }).join(", ");

    const servicesText = services.map((s: any) => 
      `${s.name}${s.price ? ` (${s.price})` : ""}`
    ).join(", ");

    const faqsText = faqs.map((f: any) => `Q: ${f.question} A: ${f.answer}`).join(" | ");

    const knowledgeText = knowledgeBase.map((k: any) => k.content || k.title).filter(Boolean).join(" | ");

    const systemPrompt = `You are a helpful AI assistant for ${business.name}. ${business.description || ""} 
${hoursText ? `Hours: ${hoursText}` : ""} 
${servicesText ? `Services: ${servicesText}` : ""} 
${faqsText ? `FAQ: ${faqsText}` : ""} 
${knowledgeText ? `Info: ${knowledgeText}` : ""} 
${customInstructions ? `Instructions: ${customInstructions}` : ""}
Be helpful, professional, and concise. If you don't know something, say so.`.trim();

    console.log("System prompt for free chat:", systemPrompt.substring(0, 200));

    // Store user message
    if (sessionId) {
      await supabase.from("free_chat_messages").insert({
        business_id: businessId,
        session_id: sessionId,
        role: "user",
        content: message,
      });
    }

    // Update usage count
    await supabase
      .from("usage_tracking")
      .upsert(
        {
          business_id: businessId,
          month_year: currentMonth,
          message_count: currentCount + 1,
        },
        { onConflict: "business_id,month_year" }
      );

    // Return the system prompt and chat ID for WebSocket connection
    return new Response(
      JSON.stringify({ 
        systemPrompt,
        chatId: `${businessId}-${sessionId}`,
        businessName: business.name,
        success: true
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Free chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});