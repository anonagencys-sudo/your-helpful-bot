
-- Drop public policies
DROP POLICY IF EXISTS "Allow public read bot_settings" ON public.bot_settings;
DROP POLICY IF EXISTS "Allow public update bot_settings" ON public.bot_settings;

-- Allow only service role full access
CREATE POLICY "Allow service role full access on bot_settings"
ON public.bot_settings
FOR ALL
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;
