
-- Allow public read/write for bot_settings (no auth on this dashboard)
CREATE POLICY "Allow public read bot_settings" ON public.bot_settings FOR SELECT USING (true);
CREATE POLICY "Allow public update bot_settings" ON public.bot_settings FOR UPDATE USING (true);
