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

const POLL_OPTIONS = ["🎰 Gamble", "📊 Volume", "👑 CTO", "❤️ I Love It"];
const OPTION_VALUES = ["gamble", "volume", "cto", "i_love_it"];

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

function buildPollKeyboard(ca: string) {
  return [
    POLL_OPTIONS.map((opt, i) => ({
      text: opt,
      callback_data: `vote:${OPTION_VALUES[i]}:${ca}`,
    })),
  ];
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

  // Create new poll
  const pollText = `📊 <b>Info for this coin</b>\n\nCA: <code>${ca}</code>\n\n⬇️ Only @${username} can vote:`;

  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: pollText,
      parse_mode: "HTML",
      reply_markup: JSON.stringify({
        inline_keyboard: buildPollKeyboard(ca),
      }),
    }),
  });

  const sentMsg = await res.json();
  const messageId = sentMsg.result?.message_id;

  await supabase.from("polls").insert({
    chat_id: chatId,
    contract_address: ca,
    sender_user_id: userId,
    sender_username: username,
    message_id: messageId,
  });
}

async function handleCallbackQuery(callbackQuery: any) {
  const data = callbackQuery.data;
  if (!data?.startsWith("vote:")) return;

  const parts = data.split(":");
  const vote = parts[1];
  const ca = parts[2];
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;

  // Find the poll
  const { data: poll } = await supabase
    .from("polls")
    .select("*")
    .eq("chat_id", chatId)
    .eq("contract_address", ca)
    .single();

  if (!poll) {
    await answerCallbackQuery(callbackQuery.id, "Poll not found.");
    return;
  }

  // Only the sender can vote
  if (poll.sender_user_id !== userId) {
    await answerCallbackQuery(callbackQuery.id, "❌ Only the CA sender can vote!");
    return;
  }

  // Already voted
  if (poll.vote) {
    await answerCallbackQuery(callbackQuery.id, "You already voted!");
    return;
  }

  // Record the vote
  await supabase
    .from("polls")
    .update({ vote, voted_at: new Date().toISOString() })
    .eq("id", poll.id);

  // Update message with result + affiliate buttons
  const resultText = `📊 <b>Info for this coin</b>\n\n` +
    `CA: <code>${ca}</code>\n` +
    `Result: <b>${POLL_OPTIONS[OPTION_VALUES.indexOf(vote)]}</b>\n` +
    `Voted by: @${poll.sender_username || "Unknown"}\n\n` +
    `🔽 Buy via:`;

  await editMessageText(chatId, messageId, resultText, {
    inline_keyboard: await buildAffiliateKeyboard(ca),
  });

  await answerCallbackQuery(callbackQuery.id, `✅ You voted: ${POLL_OPTIONS[OPTION_VALUES.indexOf(vote)]}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method === "GET") {
    return new Response(JSON.stringify({ status: "ok", bot: "Telegram Poll Affiliate Bot" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const update = await req.json();

    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
