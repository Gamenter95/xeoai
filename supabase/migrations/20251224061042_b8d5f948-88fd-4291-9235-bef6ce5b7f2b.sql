-- Create table for free tier chat messages (separate from paid tier)
CREATE TABLE public.free_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.free_chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can insert messages (for the widget)
CREATE POLICY "Anyone can create free chat messages" 
ON public.free_chat_messages 
FOR INSERT 
WITH CHECK (true);

-- Anyone can view messages by session
CREATE POLICY "Anyone can view free chat messages" 
ON public.free_chat_messages 
FOR SELECT 
USING (true);

-- Business owners can view their messages
CREATE POLICY "Users can view own business free chat" 
ON public.free_chat_messages 
FOR SELECT 
USING (EXISTS ( SELECT 1 FROM businesses WHERE businesses.id = free_chat_messages.business_id AND businesses.user_id = auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_free_chat_messages_business_session ON public.free_chat_messages(business_id, session_id);
CREATE INDEX idx_free_chat_messages_created ON public.free_chat_messages(created_at DESC);