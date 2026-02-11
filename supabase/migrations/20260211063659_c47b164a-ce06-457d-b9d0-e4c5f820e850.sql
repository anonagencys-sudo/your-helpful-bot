
-- Store polls per CA per chat
CREATE TABLE public.polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  contract_address TEXT NOT NULL,
  sender_user_id BIGINT NOT NULL,
  sender_username TEXT,
  vote TEXT, -- null until voted, then one of: gamble, volume, cto, i_love_it
  voted_at TIMESTAMPTZ,
  message_id BIGINT, -- telegram message id of the poll
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chat_id, contract_address)
);

-- No RLS needed - this table is only accessed by the edge function (service role)
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

-- No public policies - only service role can access
