
-- Store annual production goals per producer per year
CREATE TABLE public.producer_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  annual_premium_goal NUMERIC NOT NULL DEFAULT 0,
  annual_revenue_goal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, year)
);

ALTER TABLE public.producer_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
ON public.producer_goals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
ON public.producer_goals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
ON public.producer_goals FOR UPDATE
USING (auth.uid() = user_id);

CREATE TRIGGER update_producer_goals_updated_at
BEFORE UPDATE ON public.producer_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
