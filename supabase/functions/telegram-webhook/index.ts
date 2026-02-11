import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const DEFAULT_AFFILIATE_CODE = "CtkNfJ51yMih3CYwEP1F41sUmBbdLoUHmkXkW6PPpump";

async function getAffiliateCode(): Promise<string> {
  const { data } = await supabase
    .from("bot_settings")
    .select("value")
    .eq("key", "affiliate_code")
    .single();
  return data?.value || DEFAULT_AFFILIATE_CODE;
}

const POLL_OPTIONS = ["CTO", "Volume", "Good dev", "Gamble"];
const OPTION_VALUES = ["cto", "volume", "good_dev", "gamble"];

const AFFILIATE_BUTTONS = [
  [
    { text: "GM", prefix: "gm" },
    { text: "AXI", prefix: "axi" },
    { text: "TRO", prefix: "tro" },
    { text: "TRT", prefix: "trt" },
    { text: "FMO", prefix: "fmo" },
    { text: "BLO", prefix: "blo" },
  ],
  [
    { text: "OKX", prefix: "okx" },
    { text: "MAE", prefix: "mae" },
    { text: "TRM", prefix: "trm" },
    { text: "NEO", prefix: "neo" },
    { text: "PHO", prefix: "pho" },
    { text: "PEP", prefix: "pep" },
  ],
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Detect Solana CA: base58, 32-44 chars
function extractSolanaCA(text: string): string | null {
  const match = text.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/);
  return match ? match[0] : null;
}

async function buildAffiliateKeyboard(ca: string) {
  const affiliateCode = await getAffiliateCode();
  return AFFILIATE_BUTTONS.map((row) =>
    row.map((btn) => ({
      text: btn.text,
      url: `https://jup.ag/swap/SOL-${ca}?ref=${affiliateCode}`,
    }))
  );
}

async function sendPoll(chatId: number, ca: string, username: string): Promise<any> {
  const res = await fetch(`${TELEGRAM_API}/sendPoll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      question: "Info about coin",
      options: POLL_OPTIONS.map(opt => ({ text: opt })),
      is_anonymous: false,
    }),
  });
  return res.json();
}

async function sendMessage(chatId: number, text: string, reply_markup?: any) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: reply_markup ? JSON.stringify(reply_markup) : undefined,
    }),
  });
}

async function editMessageText(chatId: number, messageId: number, text: string, reply_markup?: any) {
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      reply_markup: reply_markup ? JSON.stringify(reply_markup) : undefined,
    }),
  });
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

async function handleMessage(message: any) {
  const text = message.text;
  if (!text) return;

  const chatId = message.chat.id;
  const userId = message.from.id;
  const username = message.from.username || message.from.first_name || "Unknown";

  const ca = extractSolanaCA(text);
  if (!ca) return;

  // Check if poll already exists for this CA in this chat
  const { data: existing } = await supabase
    .from("polls")
    .select("*")
    .eq("chat_id", chatId)
    .eq("contract_address", ca)
    .single();

  if (existing) {
    // Show previous result
    if (existing.vote) {
      const resultText = `📊 <b>Info for this coin</b>\n\n` +
        `CA: <code>${ca}</code>\n` +
        `Result: <b>${POLL_OPTIONS[OPTION_VALUES.indexOf(existing.vote)]}</b>\n` +
        `Voted by: @${existing.sender_username || "Unknown"}\n\n` +
        `🔽 Buy via:`;
      await sendMessage(chatId, resultText, {
        inline_keyboard: await buildAffiliateKeyboard(ca),
      });
    } else {
      await sendMessage(chatId, `⏳ Poll for this CA is still open. Waiting for @${existing.sender_username || "Unknown"} to vote.`);
    }
    return;
  }

  // Create native Telegram poll
  const sentMsg = await sendPoll(chatId, ca, username);
  const messageId = sentMsg.result?.message_id;
  const pollId = sentMsg.result?.poll?.id;

  await supabase.from("polls").insert({
    chat_id: chatId,
    contract_address: ca,
    sender_user_id: userId,
    sender_username: username,
    message_id: messageId,
    telegram_poll_id: pollId,
  });
}

async function handlePollAnswer(pollAnswer: any) {
  const pollId = pollAnswer.poll_id;
  const userId = pollAnswer.user?.id;
  const optionIds = pollAnswer.option_ids;

  if (!optionIds || optionIds.length === 0) return;

  const vote = OPTION_VALUES[optionIds[0]];

  // Find the poll by telegram_poll_id
  const { data: poll } = await supabase
    .from("polls")
    .select("*")
    .eq("telegram_poll_id", pollId)
    .single();

  if (!poll) return;

  // Only the sender can vote
  if (poll.sender_user_id !== userId) return;

  // Already voted
  if (poll.vote) return;

  // Record the vote
  await supabase
    .from("polls")
    .update({ vote, voted_at: new Date().toISOString() })
    .eq("id", poll.id);

  // Send affiliate buttons as a follow-up message
  const resultText = `📊 <b>Info about coin</b>\n\n` +
    `CA: <code>${poll.contract_address}</code>\n` +
    `Result: <b>${POLL_OPTIONS[optionIds[0]]}</b>\n` +
    `Voted by: @${poll.sender_username || "Unknown"}\n\n` +
    `🔽 Buy via:`;

  await sendMessage(poll.chat_id, resultText, {
    inline_keyboard: await buildAffiliateKeyboard(poll.contract_address),
  });
}

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // GET /telegram-webhook?action=register — register webhook with Telegram
  if (req.method === "GET" && url.searchParams.get("action") === "register") {
    try {
      const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-webhook`;
      const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, description: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  // GET /telegram-webhook?action=status — get webhook info
  if (req.method === "GET" && url.searchParams.get("action") === "status") {
    try {
      const res = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, description: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", bot: "Telegram Poll Affiliate Bot" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const update = await req.json();

    if (update.message) {
      await handleMessage(update.message);
    } else if (update.poll_answer) {
      await handlePollAnswer(update.poll_answer);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
