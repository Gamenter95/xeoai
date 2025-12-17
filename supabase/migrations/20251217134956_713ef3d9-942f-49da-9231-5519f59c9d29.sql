-- Create cached responses table for Q&A caching
CREATE TABLE public.cached_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  question_hash TEXT NOT NULL,
  question TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  hit_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(business_id, question_hash)
);

-- Enable RLS
ALTER TABLE public.cached_responses ENABLE ROW LEVEL SECURITY;

-- Service can read/write cache (for edge function)
CREATE POLICY "Service can manage cache"
ON public.cached_responses
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX idx_cached_responses_lookup ON public.cached_responses(business_id, question_hash);

-- Update plans table with correct message limits
UPDATE public.plans SET message_limit = 100 WHERE name = 'free';
UPDATE public.plans SET message_limit = 1000 WHERE name = 'pro';

-- Insert business plan if not exists
INSERT INTO public.plans (name, message_limit, max_businesses)
VALUES ('business', 5000, 50)
ON CONFLICT DO NOTHING;