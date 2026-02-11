
CREATE TABLE public.bot_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;

-- Insert default affiliate code
INSERT INTO public.bot_settings (key, value) VALUES ('affiliate_code', 'CtkNfJ51yMih3CYwEP1F41sUmBbdLoUHmkXkW6PPpump');
