import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const PORT = Number(Deno.env.get("PORT") || "3000");

const DEFAULT_AFFILIATE_CODE = "CtkNfJ51yMih3CYwEP1F41sUmBbdLoUHmkXkW6PPpump";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getAffiliateCode(): Promise<string> {
  const { data } = await supabase
    .from("bot_settings")
    .select("value")
    .eq("key", "affiliate_code")
    .single();
  return data?.value || DEFAULT_AFFILIATE_CODE;
}

const POLL_OPTIONS = ["CTO", "Volume", "Good dev", "Gamble", "Alpha"];
const OPTION_VALUES = ["cto", "volume", "good_dev", "gamble", "alpha"];

const AFFILIATE_BUTTONS = [
  [
    { text: "GM", url: (ca: string) => `https://gmgn.ai/r/yLK3g2v6?token=${ca}` },
    { text: "AXI", url: (ca: string) => `https://axiom.trade/@anony?token=${ca}` },
    { text: "TRO", url: (ca: string) => `https://t.me/menelaus_trojanbot?start=r-dankanonymous-${ca}` },
    { text: "TRT", url: (ca: string) => `https://trojan.com/@Danoanon?token=${ca}` },
    { text: "FMO", url: (ca: string) => `https://fomo.family/r/idankanonymous?token=${ca}` },
    { text: "BLO", url: (ca: string) => `https://t.me/BloomSolana_bot?start=ref_2PL9YX5OSY_${ca}` },
  ],
  [
    { text: "OKX", url: (ca: string) => `https://web3.okx.com/join/DANKANON?token=${ca}` },
    { text: "MAE", url: (ca: string) => `https://jup.ag/swap/SOL-${ca}?ref=qkozn35gqidu` },
    { text: "TRM", url: (ca: string) => `https://trade.padre.gg/rk/dankanon?token=${ca}` },
    { text: "PHO", url: (ca: string) => `https://trade.padre.gg/rk/dankanon?token=${ca}` },
    { text: "PEP", url: (ca: string) => `https://t.me/pepeboost_sol_bot?start=ref_0fi608_${ca}` },
  ],
];

function extractSolanaCA(text: string): string | null {
  const match = text.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/);
  return match ? match[0] : null;
}

async function buildAffiliateText(ca: string): Promise<string> {
  const lines = AFFILIATE_BUTTONS.map((row) =>
    row.map((btn) => `<a href="${btn.url(ca)}">${btn.text}</a>`).join("•")
  );
  return lines.join("\n");
}

async function sendPoll(chatId: number, ca: string, username: string): Promise<any> {
  const res = await fetch(`${TELEGRAM_API}/sendPoll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      question: "Info about coin\n(you can select multiple options)",
      options: POLL_OPTIONS.map(opt => ({ text: opt })),
      is_anonymous: false,
      allows_multiple_answers: true,
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
      disable_web_page_preview: true,
      reply_markup: reply_markup ? JSON.stringify(reply_markup) : undefined,
    }),
  });
}

async function sendPhoto(chatId: number, photoUrl: string, caption: string, reply_markup?: any) {
  await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: "HTML",
      reply_markup: reply_markup ? JSON.stringify(reply_markup) : undefined,
    }),
  });
}

async function deleteMessage(chatId: number, messageId: number) {
  await fetch(`${TELEGRAM_API}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
  });
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

const DELETE_BUTTON_MARKUP = {
  inline_keyboard: [[{ text: "🗑️", callback_data: "delete_msg" }]],
};

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

interface TokenData {
  priceUsd: string;
  priceChange: string;
  marketCap: string;
  volume24h: string;
  liquidity: string;
  change1h: string;
  buys: string;
  sells: string;
  fdv: string;
  ath: string;
  pairName: string;
  imageUrl: string | null;
}

async function fetchTokenData(ca: string): Promise<TokenData | null> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
    const data = await res.json();
    const pair = data?.pairs?.[0];
    if (!pair) return null;

    let imageUrl = pair.info?.imageUrl || null;
    if (!imageUrl && pair.baseToken?.address) {
      imageUrl = `https://dd.dexscreener.com/ds-data/tokens/solana/${pair.baseToken.address}.png`;
    }

    const priceChange24h = pair.priceChange?.h24 != null ? `${pair.priceChange.h24 >= 0 ? "+" : ""}${pair.priceChange.h24}%` : "N/A";
    const change1h = pair.priceChange?.h1 != null ? `${pair.priceChange.h1 >= 0 ? "+" : ""}${pair.priceChange.h1}%` : "N/A";
    const buys = pair.txns?.h1?.buys != null ? String(pair.txns.h1.buys) : "N/A";
    const sells = pair.txns?.h1?.sells != null ? String(pair.txns.h1.sells) : "N/A";

    const currentPrice = pair.priceUsd ? Number(pair.priceUsd) : 0;
    const coinName = pair.baseToken?.name || "Unknown";
    let athStr = "N/A";

    if (currentPrice > 0) {
      const { data: existing } = await supabase
        .from("token_ath")
        .select("max_price_usd")
        .eq("contract_address", ca)
        .single();

      let maxPrice = existing?.max_price_usd ? Number(existing.max_price_usd) : 0;

      if (currentPrice > maxPrice) {
        maxPrice = currentPrice;
        await supabase
          .from("token_ath")
          .upsert({
            contract_address: ca,
            max_price_usd: currentPrice,
            coin_name: coinName,
            updated_at: new Date().toISOString(),
          }, { onConflict: "contract_address" });
      }

      if (maxPrice > 0) {
        const athChangePct = ((currentPrice - maxPrice) / maxPrice) * 100;
        athStr = `$${formatNumber(maxPrice)}`;
        if (currentPrice < maxPrice) {
          athStr += ` (${athChangePct.toFixed(0)}%)`;
        }
      }
    }

    return {
      priceUsd: pair.priceUsd ? `$${pair.priceUsd}` : "N/A",
      priceChange: priceChange24h,
      marketCap: pair.marketCap ? `$${formatNumber(Number(pair.marketCap))}` : "N/A",
      volume24h: pair.volume?.h24 ? `$${formatNumber(Number(pair.volume.h24))}` : "N/A",
      liquidity: pair.liquidity?.usd ? `$${formatNumber(Number(pair.liquidity.usd))}` : "N/A",
      fdv: pair.fdv ? `$${formatNumber(Number(pair.fdv))}` : "N/A",
      ath: athStr,
      change1h,
      buys,
      sells,
      pairName: coinName,
      imageUrl,
    };
  } catch (err) {
    console.error("DexScreener fetch error:", err);
    return null;
  }
}

async function handleMessage(message: any) {
  const text = message.text;
  if (!text) return;

  const chatId = message.chat.id;
  const userId = message.from.id;
  const username = message.from.username || message.from.first_name || "Unknown";

  const ca = extractSolanaCA(text);
  if (!ca) return;

  // CHECK GLOBAL PREVIOUS VOTE FOR THIS USER
const { data: previousVote } = await supabase
  .from("last_vote_per_user")
  .select("last_vote")
  .eq("user_id", userId)
  .single();

// ✅ IF USER HAS GLOBAL VOTE → USE IT IMMEDIATELY (SKIP POLL EVERYWHERE)
if (previousVote?.last_vote) {

  const tokenData = await fetchTokenData(ca);
  const affiliateText = await buildAffiliateText(ca);
  const coinName = tokenData?.pairName || "Unknown";

  const voteLabels = previousVote.last_vote
    .split(",")
    .map((v: string) => POLL_OPTIONS[OPTION_VALUES.indexOf(v)] || v)
    .join(", ");

  const marketInfo = tokenData
    ? `\n\n📊 <b>Stats</b>\n` +
      `├ USD     ${tokenData.priceUsd} (${tokenData.priceChange})\n` +
      `├ MC      ${tokenData.marketCap}\n` +
      `├ Vol     ${tokenData.volume24h}\n` +
      `├ LP      ${tokenData.liquidity}\n` +
      `├ 1H      ${tokenData.change1h} 🟢${tokenData.buys} 🔴${tokenData.sells}\n` +
      `└ FDV     ${tokenData.fdv}`
    : "";

  const resultText =
    `📊 <b>Information about coin</b>\n\n` +
    `🪙 <b>${coinName}</b>\n\n` +
    `CA: <code>${ca}</code>\n\n` +
    `Information: <b>${voteLabels}</b>\n\n` +
    `Voted by: @${username}` +
    marketInfo +
    `\n\n🔁 Auto-used your previous vote` +
    `\n\n🔽 Buy via:\n\n${affiliateText}`;

  if (tokenData?.imageUrl) {
    await sendPhoto(chatId, tokenData.imageUrl, resultText, DELETE_BUTTON_MARKUP);
  } else {
    await sendMessage(chatId, resultText, DELETE_BUTTON_MARKUP);
  }

  return;   // 🔴 THIS IS CRITICAL
}

  const { data: existing } = await supabase
    .from("polls")
    .select("*")
    .eq("chat_id", chatId)
    .eq("contract_address", ca)
    .single();

  if (existing) {
    if (existing.vote) {
      const tokenData = await fetchTokenData(ca);
      const affiliateText = await buildAffiliateText(ca);
      const coinName = tokenData?.pairName || "Unknown";
      const voteLabels = existing.vote.split(",").map((v: string) => POLL_OPTIONS[OPTION_VALUES.indexOf(v)] || v).join(", ");

      const marketInfo = tokenData
        ? `\n\n📊 <b>Stats</b>\n` +
          `├ USD     ${tokenData.priceUsd} (${tokenData.priceChange})\n` +
          `├ MC      ${tokenData.marketCap}\n` +
          `├ Vol     ${tokenData.volume24h}\n` +
          `├ LP      ${tokenData.liquidity}\n` +
          `├ 1H      ${tokenData.change1h} 🟢${tokenData.buys} 🔴${tokenData.sells}\n` +
          `└ FDV     ${tokenData.fdv}`
        : "";

      const resultText = `📊 <b>Information about this coin</b>\n\n` +
        `🪙 <b>${coinName}</b>\n\n` +
        `CA: <code>${ca}</code>\n\n` +
        `Information: <b>${voteLabels}</b>\n\n` +
        `Voted by: @${existing.sender_username || "Unknown"}` +
        marketInfo +
        `\n\n🔽 Buy via:\n\n${affiliateText}`;

      if (tokenData?.imageUrl) {
        await sendPhoto(chatId, tokenData.imageUrl, resultText, DELETE_BUTTON_MARKUP);
      } else {
        await sendMessage(chatId, resultText, DELETE_BUTTON_MARKUP);
      }
    } else {
      const pollLink = existing.message_id ? `\n\n👉 <a href="https://t.me/c/${String(chatId).replace('-100', '')}/${existing.message_id}">Jump to poll</a>` : "";
      await sendMessage(chatId, `⏳ Poll for this CA is still open. Waiting for @${existing.sender_username || "Unknown"} to vote.${pollLink}`);
    }
    return;
  }
// ✅ AUTO USE PREVIOUS GLOBAL VOTE (SKIP POLL)
if (previousVote?.last_vote) {

  await supabase.from("polls").insert({
    chat_id: chatId,
    contract_address: ca,
    sender_user_id: userId,
    sender_username: username,
    vote: previousVote.last_vote,
    voted_at: new Date().toISOString()
  });

  const tokenData = await fetchTokenData(ca);
  const affiliateText = await buildAffiliateText(ca);
  const coinName = tokenData?.pairName || "Unknown";

  const voteLabels = previousVote.last_vote
    .split(",")
    .map((v: string) => POLL_OPTIONS[OPTION_VALUES.indexOf(v)] || v)
    .join(", ");

  const marketInfo = tokenData
    ? `\n\n📊 <b>Stats</b>\n` +
      `├ USD     ${tokenData.priceUsd} (${tokenData.priceChange})\n` +
      `├ MC      ${tokenData.marketCap}\n` +
      `├ Vol     ${tokenData.volume24h}\n` +
      `├ LP      ${tokenData.liquidity}\n` +
      `├ 1H      ${tokenData.change1h} 🟢${tokenData.buys} 🔴${tokenData.sells}\n` +
      `└ FDV     ${tokenData.fdv}`
    : "";

  const resultText =
    `📊 <b>Information about coin</b>\n\n` +
    `🪙 <b>${coinName}</b>\n\n` +
    `CA: <code>${ca}</code>\n\n` +
    `Information: <b>${voteLabels}</b>\n\n` +
    `Voted by: @${username}` +
    marketInfo +
    `\n\n🔁 Auto-used your previous vote` +
    `\n\n🔽 Buy via:\n\n${affiliateText}`;

  if (tokenData?.imageUrl) {
    await sendPhoto(chatId, tokenData.imageUrl, resultText, DELETE_BUTTON_MARKUP);
  } else {
    await sendMessage(chatId, resultText, DELETE_BUTTON_MARKUP);
  }

  return;
}

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

  const votes = optionIds.map((i: number) => OPTION_VALUES[i]);
  const voteStr = votes.join(",");

  // SAVE USER GLOBAL VOTE
await supabase
  .from("last_vote_per_user")
  .upsert({
    user_id: userId,
    username: pollAnswer.user?.username || "",
    last_vote: voteStr,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });



  const { data: poll } = await supabase
    .from("polls")
    .select("*")
    .eq("telegram_poll_id", pollId)
    .single();

  if (!poll) return;
  if (poll.sender_user_id !== userId) {
    const voterName = pollAnswer.user?.first_name || "User";
    const pollLink = poll.message_id ? `\n\n👉 <a href="https://t.me/c/${String(poll.chat_id).replace('-100', '')}/${poll.message_id}">Jump to poll</a>` : "";
    await sendMessage(poll.chat_id, `⛔ @${pollAnswer.user?.username || voterName}, only the person who posted the CA can vote on this poll.${pollLink}`);
    return;
  }
  if (poll.vote) return;

  await supabase
    .from("polls")
    .update({ vote: voteStr, voted_at: new Date().toISOString() })
    .eq("id", poll.id);

  if (poll.message_id) {
    await deleteMessage(poll.chat_id, poll.message_id);
  }

  const tokenData = await fetchTokenData(poll.contract_address);
  const coinName = tokenData?.pairName || "Unknown";
  const marketInfo = tokenData
    ? `\n\n📊 <b>Stats</b>\n` +
      `├ USD     ${tokenData.priceUsd} (${tokenData.priceChange})\n` +
      `├ MC      ${tokenData.marketCap}\n` +
      `├ Vol     ${tokenData.volume24h}\n` +
      `├ LP      ${tokenData.liquidity}\n` +
      `├ 1H      ${tokenData.change1h} 🟢${tokenData.buys} 🔴${tokenData.sells}\n` +
      `└ FDV     ${tokenData.fdv}`
    : "";

  const voteLabels = optionIds.map((i: number) => POLL_OPTIONS[i]).join(", ");
  const affiliateText = await buildAffiliateText(poll.contract_address);
  const resultText = `📊 <b>Information about coin</b>\n\n` +
    `🪙 <b>${coinName}</b>\n\n` +
    `CA: <code>${poll.contract_address}</code>\n\n` +
    `Information: <b>${voteLabels}</b>\n\n` +
    `Voted by: @${poll.sender_username || "Unknown"}` +
    marketInfo +
    `\n\n🔽 Buy via:\n\n${affiliateText}`;

  if (tokenData?.imageUrl) {
    await sendPhoto(poll.chat_id, tokenData.imageUrl, resultText, DELETE_BUTTON_MARKUP);
  } else {
    await sendMessage(poll.chat_id, resultText, DELETE_BUTTON_MARKUP);
  }
}

// HTTP server for webhook
Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET" && url.searchParams.get("action") === "register") {
    const webhookUrl = Deno.env.get("WEBHOOK_URL")!;
    const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  }

  if (req.method === "GET" && url.searchParams.get("action") === "status") {
    const res = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
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
    } else if (update.poll_answer) {
      await handlePollAnswer(update.poll_answer);
    } else if (update.callback_query) {
      const cb = update.callback_query;
      if (cb.data === "delete_msg" && cb.message) {
        await deleteMessage(cb.message.chat.id, cb.message.message_id);
        await answerCallbackQuery(cb.id, "Deleted");
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

console.log(`Bot server running on port ${PORT}`);
