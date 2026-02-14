
-- Add entry price and peak price columns to polls for leaderboard calculations
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS entry_price_usd numeric DEFAULT NULL;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS peak_price_usd numeric DEFAULT NULL;
