
CREATE TABLE public.token_ath (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_address text NOT NULL UNIQUE,
  max_price_usd numeric NOT NULL DEFAULT 0,
  coin_name text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.token_ath ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON public.token_ath FOR ALL USING (true) WITH CHECK (true);
