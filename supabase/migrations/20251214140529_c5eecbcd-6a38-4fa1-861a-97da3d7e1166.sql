-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for plan types
CREATE TYPE public.plan_type AS ENUM ('free', 'pro', 'business');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create businesses table
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create business_hours table
CREATE TABLE public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT false,
  UNIQUE (business_id, day_of_week)
);

-- Create business_services table
CREATE TABLE public.business_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create business_faqs table
CREATE TABLE public.business_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create business_custom_instructions table
CREATE TABLE public.business_custom_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL UNIQUE,
  instructions TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create usage_tracking table
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  month_year TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (business_id, month_year)
);

-- Create chat_conversations table
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create plans table for configuration
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name plan_type NOT NULL UNIQUE,
  message_limit INTEGER NOT NULL,
  max_businesses INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default plans
INSERT INTO public.plans (name, message_limit, max_businesses) VALUES
  ('free', 100, 1),
  ('pro', 1000, 5),
  ('business', 10000, 20);

-- Create user_plans table
CREATE TABLE public.user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan plan_type NOT NULL DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_custom_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  INSERT INTO public.user_plans (user_id, plan)
  VALUES (NEW.id, 'free');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_plans_updated_at
  BEFORE UPDATE ON public.user_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for businesses
CREATE POLICY "Users can view own businesses"
  ON public.businesses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own businesses"
  ON public.businesses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own businesses"
  ON public.businesses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own businesses"
  ON public.businesses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all businesses"
  ON public.businesses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for business_hours
CREATE POLICY "Users can manage own business hours"
  ON public.business_hours FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_hours.business_id
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for business_services
CREATE POLICY "Users can manage own business services"
  ON public.business_services FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_services.business_id
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for business_faqs
CREATE POLICY "Users can manage own business FAQs"
  ON public.business_faqs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_faqs.business_id
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for business_custom_instructions
CREATE POLICY "Users can manage own custom instructions"
  ON public.business_custom_instructions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = business_custom_instructions.business_id
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for usage_tracking
CREATE POLICY "Users can view own usage"
  ON public.usage_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = usage_tracking.business_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all usage"
  ON public.usage_tracking FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for chat_conversations (public for widget access)
CREATE POLICY "Anyone can create conversations"
  ON public.chat_conversations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view conversations by session"
  ON public.chat_conversations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can view own business conversations"
  ON public.chat_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id = chat_conversations.business_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all conversations"
  ON public.chat_conversations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for chat_messages (public for widget access)
CREATE POLICY "Anyone can create messages"
  ON public.chat_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view messages"
  ON public.chat_messages FOR SELECT
  TO anon, authenticated
  USING (true);

-- RLS Policies for plans
CREATE POLICY "Anyone can view plans"
  ON public.plans FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage plans"
  ON public.plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_plans
CREATE POLICY "Users can view own plan"
  ON public.user_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all plans"
  ON public.user_plans FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage user plans"
  ON public.user_plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Public access for businesses (for widget to fetch business data)
CREATE POLICY "Public can view business info for widget"
  ON public.businesses FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can view business hours"
  ON public.business_hours FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can view business services"
  ON public.business_services FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can view business FAQs"
  ON public.business_faqs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can view custom instructions"
  ON public.business_custom_instructions FOR SELECT
  TO anon
  USING (true);

-- Usage tracking policies for edge function
CREATE POLICY "Service can update usage"
  ON public.usage_tracking FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service can increment usage"
  ON public.usage_tracking FOR UPDATE
  TO anon, authenticated
  USING (true);