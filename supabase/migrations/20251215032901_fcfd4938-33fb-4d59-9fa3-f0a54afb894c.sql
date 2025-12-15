-- Create chatbot_styles table for custom widget styling
CREATE TABLE public.chatbot_styles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  primary_color TEXT DEFAULT '#7c3aed',
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#1f2937',
  border_radius TEXT DEFAULT 'rounded',
  position TEXT DEFAULT 'bottom-right',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

-- Create knowledge_base table for text/website/pdf content
CREATE TABLE public.knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'website', 'file')),
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatbot_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS policies for chatbot_styles
CREATE POLICY "Public can view chatbot styles" ON public.chatbot_styles
FOR SELECT USING (true);

CREATE POLICY "Users can manage own chatbot styles" ON public.chatbot_styles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = chatbot_styles.business_id
    AND businesses.user_id = auth.uid()
  )
);

-- RLS policies for knowledge_base
CREATE POLICY "Public can view knowledge base" ON public.knowledge_base
FOR SELECT USING (true);

CREATE POLICY "Users can manage own knowledge base" ON public.knowledge_base
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = knowledge_base.business_id
    AND businesses.user_id = auth.uid()
  )
);

-- Add trigger for updated_at on chatbot_styles
CREATE TRIGGER update_chatbot_styles_updated_at
BEFORE UPDATE ON public.chatbot_styles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();