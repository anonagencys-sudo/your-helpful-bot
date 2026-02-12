
-- Lock down polls table - only service role should access it
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
