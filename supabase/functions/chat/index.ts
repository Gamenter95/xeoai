import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple hash function for question caching
function hashQuestion(question: string): string {
  const normalized = question.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// Check similarity between questions (basic)
function isSimilarQuestion(q1: string, q2: string): boolean {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
  const n1 = normalize(q1);
  const n2 = normalize(q2);
  
  if (n1 === n2) return true;
  
  // Check if one contains the other (for slight variations)
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  // Basic word overlap check
  const words1 = new Set(n1.split(' '));
  const words2 = new Set(n2.split(' '));
  const intersection = [...words1].filter(w => words2.has(w));
  const union = new Set([...words1, ...words2]);
  const similarity = intersection.length / union.size;
  
  return similarity > 0.7;
}

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

    // HARD STOP - Return error when limit reached
    if (currentCount >= messageLimit) {
      console.log(`Limit reached for business ${businessId}: ${currentCount}/${messageLimit}`);
      return new Response(
        JSON.stringify({ 
          error: "LIMIT_REACHED",
          limitReached: true,
          message: "Monthly message limit reached. Please upgrade your plan to continue chatting."
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the last user message
    const lastUserMessage = messages[messages.length - 1];
    if (!lastUserMessage || lastUserMessage.role !== "user") {
      return new Response(
        JSON.stringify({ error: "No user message found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userQuestion = lastUserMessage.content;
    const questionHash = hashQuestion(userQuestion);

    // Check cache for similar questions
    const { data: cachedResponses } = await supabase
      .from("cached_responses")
      .select("*")
      .eq("business_id", businessId)
      .limit(50);

    let cachedResponse = null;
    if (cachedResponses && cachedResponses.length > 0) {
      // First try exact hash match
      cachedResponse = cachedResponses.find(c => c.question_hash === questionHash);
      
      // If no exact match, try similarity check
      if (!cachedResponse) {
        cachedResponse = cachedResponses.find(c => isSimilarQuestion(c.question, userQuestion));
      }
    }

    // If cached response found, return it without calling OpenAI
    if (cachedResponse) {
      console.log(`Cache hit for business ${businessId}, question: "${userQuestion.substring(0, 50)}..."`);
      
      // Update hit count
      await supabase
        .from("cached_responses")
        .update({ hit_count: cachedResponse.hit_count + 1 })
        .eq("id", cachedResponse.id);

      // Update usage count (still counts against limit)
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

      // Return cached response as SSE stream format
      const cachedContent = cachedResponse.response;
      const sseData = `data: ${JSON.stringify({
        choices: [{ delta: { content: cachedContent } }]
      })}\n\ndata: [DONE]\n\n`;

      return new Response(sseData, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No cache hit - proceed with OpenAI
    console.log(`Cache miss for business ${businessId}, calling OpenAI`);

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

    // Call OpenAI API (non-streaming to capture full response for caching)
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

    const aiResponse = await response.json();
    const assistantContent = aiResponse.choices[0]?.message?.content || "";

    // Cache the response for future use
    await supabase
      .from("cached_responses")
      .upsert(
        {
          business_id: businessId,
          question_hash: questionHash,
          question: userQuestion,
          response: assistantContent,
        },
        { onConflict: "business_id,question_hash" }
      );

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
          content: userQuestion,
        });
      }
    }

    // Return response as SSE stream format for consistency
    const sseData = `data: ${JSON.stringify({
      choices: [{ delta: { content: assistantContent } }]
    })}\n\ndata: [DONE]\n\n`;

    return new Response(sseData, {
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
