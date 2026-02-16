import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

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

// ─── Telegram helpers ───

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

async function sendPoll(chatId: number, ca: string): Promise<any> {
  const question = "Info about coin\n(you can select multiple options)";
  const res = await fetch(`${TELEGRAM_API}/sendPoll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      question,
      options: POLL_OPTIONS.map(opt => ({ text: opt })),
      is_anonymous: false,
      allows_multiple_answers: true,
    }),
  });
  return res.json();
}

async function sendMessage(chatId: number, text: string, reply_markup?: any): Promise<any> {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
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
  return res.json();
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

async function editMessageText(chatId: number, messageId: number, text: string, reply_markup?: any) {
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
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

function getResultMarkup(ca: string) {
  return {
    inline_keyboard: [[
      { text: "🗑️", callback_data: "delete_msg" },
      { text: "🔄", callback_data: `refresh_${ca}` },
    ]],
  };
}

// ─── Formatting ───

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

// ─── Token Data ───

interface TokenData {
  priceUsd: string;
  priceUsdRaw: number;
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
  twitterUrl: string | null;
  websiteUrl: string | null;
  telegramUrl: string | null;
  dexPaid: boolean;
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

      if (maxPrice > 0 && pair.marketCap) {
        const currentMC = Number(pair.marketCap);
        const athMC = currentPrice > 0 ? (maxPrice / currentPrice) * currentMC : 0;
        const athChangePct = ((currentPrice - maxPrice) / maxPrice) * 100;
        athStr = athMC > 0 ? `$${formatNumber(athMC)}` : "N/A";
        if (currentPrice < maxPrice) {
          athStr += ` (${athChangePct.toFixed(0)}%)`;
        }
      }
    }

    const socials = pair.info?.socials || [];
    let twitterUrl: string | null = null;
    let websiteUrl: string | null = null;
    let telegramUrl: string | null = null;

    for (const s of socials) {
      if (s.type === "twitter" || s.platform === "twitter") twitterUrl = s.url;
      if (s.type === "telegram" || s.platform === "telegram") telegramUrl = s.url;
    }
    if (pair.info?.websites?.length) {
      websiteUrl = pair.info.websites[0]?.url || null;
    }

    const dexPaid = !!(pair.boosts?.active || pair.labels?.includes("boost"));

    return {
      priceUsd: pair.priceUsd ? `$${pair.priceUsd}` : "N/A",
      priceUsdRaw: currentPrice,
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
      twitterUrl,
      websiteUrl,
      telegramUrl,
      dexPaid,
    };
  } catch (err) {
    console.error("DexScreener fetch error:", err);
    return null;
  }
}

// Fetch just the current price for a CA (lightweight)
async function fetchCurrentPrice(ca: string): Promise<number> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
    const data = await res.json();
    const pair = data?.pairs?.[0];
    return pair?.priceUsd ? Number(pair.priceUsd) : 0;
  } catch {
    return 0;
  }
}

// Get the first caller for a CA with price change and time elapsed
async function getFirstCaller(ca: string): Promise<{ username: string; mcFormatted: string; changeStr: string; timeAgo: string } | null> {
  const { data } = await supabase
    .from("polls")
    .select("sender_username, entry_price_usd, created_at")
    .eq("contract_address", ca)
    .not("entry_price_usd", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!data) return null;

  // Calculate time ago
  const createdAt = new Date(data.created_at).getTime();
  const now = Date.now();
  const diffMs = now - createdAt;
  const diffMin = Math.floor(diffMs / 60000);
  let timeAgo: string;
  if (diffMin < 1) timeAgo = "now";
  else if (diffMin < 60) timeAgo = `${diffMin}m`;
  else if (diffMin < 1440) timeAgo = `${Math.floor(diffMin / 60)}h`;
  else timeAgo = `${Math.floor(diffMin / 1440)}d`;

  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
    const apiData = await res.json();
    const pair = apiData?.pairs?.[0];
    if (pair && pair.priceUsd && pair.marketCap) {
      const currentPrice = Number(pair.priceUsd);
      const currentMC = Number(pair.marketCap);
      const entryPrice = Number(data.entry_price_usd);
      if (currentPrice > 0 && entryPrice > 0) {
        const ratio = currentMC / currentPrice;
        const entryMC = entryPrice * ratio;
        const changePct = ((currentPrice - entryPrice) / entryPrice) * 100;

        let changeStr: string;
        if (changePct >= 100) {
          const multiplier = currentPrice / entryPrice;
          changeStr = `${multiplier.toFixed(1)}x`;
        } else if (changePct >= 0) {
          changeStr = `+${changePct.toFixed(0)}%`;
        } else {
          changeStr = `${changePct.toFixed(0)}%`;
        }

        return {
          username: data.sender_username || "Unknown",
          mcFormatted: `$${formatNumber(entryMC)}`,
          changeStr,
          timeAgo,
        };
      }
    }
  } catch {}

  return {
    username: data.sender_username || "Unknown",
    mcFormatted: "N/A",
    changeStr: "",
    timeAgo,
  };
}

// ─── Build result message ───

function buildResultMessage(
  ca: string,
  voteLabels: string,
  senderUsername: string,
  tokenData: TokenData | null,
  affiliateText: string,
  firstCaller?: { username: string; mcFormatted: string; changeStr: string; timeAgo: string } | null,
): string {
  const coinName = tokenData?.pairName || "Unknown";

  let msg = `📊 <b>Information about coin</b>\n\n`;
  msg += `🪙 <b>${coinName}</b>\n\n`;
  msg += `CA: <code>${ca}</code>\n\n`;
  msg += `Information: <b>${voteLabels}</b>\n`;
  msg += `Voted by: @${senderUsername}`;

  if (tokenData) {
    const socialLinks: string[] = [];
    if (tokenData.twitterUrl) socialLinks.push(`<a href="${tokenData.twitterUrl}">𝕏</a>`);
    if (tokenData.websiteUrl) socialLinks.push(`<a href="${tokenData.websiteUrl}">🌐 Web</a>`);
    if (tokenData.telegramUrl) socialLinks.push(`<a href="${tokenData.telegramUrl}">📱 TG</a>`);

    if (socialLinks.length > 0) {
      msg += `\n\n🔗 <b>Socials</b>\n`;
      msg += socialLinks.join(" • ");
    }
  }

  if (tokenData) {
    msg += `\n\n📊 <b>Stats</b>\n`;
    msg += `├ USD     ${tokenData.priceUsd} (${tokenData.priceChange})\n`;
    msg += `├ MC      ${tokenData.marketCap}\n`;
    msg += `├ Vol     ${tokenData.volume24h}\n`;
    msg += `├ LP      ${tokenData.liquidity}\n`;
    msg += `├ 1H      ${tokenData.change1h} 🟢${tokenData.buys} 🔴${tokenData.sells}\n`;
    msg += `├ FDV     ${tokenData.fdv}\n`;
    msg += `└ ATH     ${tokenData.ath}`;
  }

  if (tokenData) {
    msg += `\n\n🛡 <b>Security</b>\n`;
    msg += `└ DEX Paid  ${tokenData.dexPaid ? "✅ Yes" : "❌ No"}`;
  }

  if (firstCaller && firstCaller.mcFormatted) {
    const changePart = firstCaller.changeStr ? ` [${firstCaller.changeStr}]` : "";
    const timePart = firstCaller.timeAgo ? ` (${firstCaller.timeAgo})` : "";
    msg += `\n\n😈 @${firstCaller.username} @ ${firstCaller.mcFormatted}${changePart}${timePart}`;
  }

  msg += `\n\n🔽 Buy via:\n\n${affiliateText}`;

  return msg;
}

// ─── Leaderboard ───

// Command → vote filter mapping
const LEADERBOARD_COMMANDS: Record<string, { filter: string | null; title: string }> = {
  "/lb": { filter: null, title: "Leaderboard" },
  "/ga": { filter: "gamble", title: "Gamble Leaderboard" },
  "/ct": { filter: "cto", title: "CTO Leaderboard" },
  "/vo": { filter: "volume", title: "Volume Leaderboard" },
  "/gd": { filter: "good_dev", title: "Good Dev Leaderboard" },
  "/al": { filter: "alpha", title: "Alpha Leaderboard" },
};

const FILTER_TITLES: Record<string, string> = {
  "": "Leaderboard",
  "gamble": "🎰 Gamble Leaderboard",
  "cto": "👑 CTO Leaderboard",
  "volume": "📈 Volume Leaderboard",
  "good_dev": "👨‍💻 Good Dev Leaderboard",
  "alpha": "🔮 Alpha Leaderboard",
};

const PERIOD_LABELS: Record<string, string> = {
  "12h": "12h",
  "1d": "1d",
  "1w": "1w",
  "2w": "2w",
};

const PERIOD_HOURS: Record<string, number> = {
  "12h": 12,
  "1d": 24,
  "1w": 168,
  "2w": 336,
};

function getLeaderboardMarkup(activePeriod: string, voteFilter: string = "") {
  const filterPrefix = voteFilter ? `${voteFilter}_` : "";
  return {
    inline_keyboard: [
      [
        { text: activePeriod === "12h" ? "☑️ 12H" : "12H", callback_data: `lb_${filterPrefix}12h` },
        { text: activePeriod === "1d" ? "☑️ 1D" : "1D", callback_data: `lb_${filterPrefix}1d` },
        { text: activePeriod === "1w" ? "☑️ 1W" : "1W", callback_data: `lb_${filterPrefix}1w` },
        { text: activePeriod === "2w" ? "☑️ 2W" : "2W", callback_data: `lb_${filterPrefix}2w` },
      ],
      [{ text: "🗑️", callback_data: "delete_msg" }],
    ],
  };
}

const RANK_EMOJIS = ["🏆", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

async function buildLeaderboardText(chatId: number, period: string, voteFilter: string = ""): Promise<string> {
  const hours = PERIOD_HOURS[period] || 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("polls")
    .select("*")
    .eq("chat_id", chatId)
    .not("vote", "is", null)
    .not("entry_price_usd", "is", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  // Filter by vote category if specified
  if (voteFilter) {
    query = query.like("vote", `%${voteFilter}%`);
  }

  const { data: polls } = await query;

  const title = FILTER_TITLES[voteFilter] || "🏆 Leaderboard";

  if (!polls || polls.length === 0) {
    return `${title}\n\n📊 <b>Group Stats</b>\n├ Period    ${PERIOD_LABELS[period]}\n└ Calls     0\n\nNo calls in this period.`;
  }

  const uniqueCAs = [...new Set(polls.map(p => p.contract_address))];
  const priceMap: Record<string, number> = {};

  const batches: string[][] = [];
  for (let i = 0; i < uniqueCAs.length; i += 10) {
    batches.push(uniqueCAs.slice(i, i + 10));
  }

  for (const batch of batches) {
    const results = await Promise.all(batch.map(async (ca) => {
      const price = await fetchCurrentPrice(ca);
      return { ca, price };
    }));
    for (const r of results) {
      priceMap[r.ca] = r.price;
    }
  }

  for (const poll of polls) {
    const currentPrice = priceMap[poll.contract_address] || 0;
    const existingPeak = poll.peak_price_usd ? Number(poll.peak_price_usd) : 0;
    if (currentPrice > existingPeak) {
      await supabase
        .from("polls")
        .update({ peak_price_usd: currentPrice })
        .eq("id", poll.id);
      poll.peak_price_usd = currentPrice;
    }
  }

  interface CallResult {
    coinName: string;
    username: string;
    returnX: number;
    ca: string;
  }

  const callResults: CallResult[] = [];

  for (const poll of polls) {
    const entryPrice = Number(poll.entry_price_usd);
    const peakPrice = poll.peak_price_usd ? Number(poll.peak_price_usd) : (priceMap[poll.contract_address] || 0);
    if (entryPrice <= 0) continue;

    const returnX = peakPrice / entryPrice;

    const { data: athData } = await supabase
      .from("token_ath")
      .select("coin_name")
      .eq("contract_address", poll.contract_address)
      .single();

    callResults.push({
      coinName: athData?.coin_name || poll.contract_address.slice(0, 6),
      username: poll.sender_username || "Unknown",
      returnX,
      ca: poll.contract_address,
    });
  }

  callResults.sort((a, b) => b.returnX - a.returnX);

  const totalCalls = callResults.length;
  const hits = callResults.filter(c => c.returnX >= 2).length;
  const hitRate = totalCalls > 0 ? Math.round((hits / totalCalls) * 100) : 0;
  const returns = callResults.map(c => c.returnX).sort((a, b) => a - b);
  const medianReturn = returns.length > 0 ? returns[Math.floor(returns.length / 2)] : 0;
  const bestReturn = returns.length > 0 ? returns[returns.length - 1] : 0;
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;

  let msg = `${title}\n\n`;
  msg += `📊 <b>Group Stats</b>\n`;
  msg += `├ Period    <b>${PERIOD_LABELS[period]}</b>\n`;
  msg += `├ Calls     <b>${totalCalls}</b>\n`;
  msg += `├ Hit Rate  <b>${hitRate}%</b>\n`;
  msg += `├ Median    <b>${medianReturn.toFixed(1)}x</b>\n`;
  msg += `└ Return    <b>${bestReturn.toFixed(1)}x</b> (Avg: ${avgReturn.toFixed(1)}x)\n`;

  const top10 = callResults.slice(0, 10);
  if (top10.length > 0) {
    msg += `\n`;
    for (let i = 0; i < top10.length; i++) {
      const c = top10[i];
      const emoji = RANK_EMOJIS[i] || `${i + 1}`;
      msg += `${emoji} <b>${c.coinName}</b> ≫ @${c.username} [${c.returnX.toFixed(1)}x]\n`;
    }
  }

  return msg;
}

async function handleLeaderboard(chatId: number, period: string = "1d", voteFilter: string = "") {
  const text = await buildLeaderboardText(chatId, period, voteFilter);
  const markup = getLeaderboardMarkup(period, voteFilter);
  await sendMessage(chatId, text, markup);
}

// ─── Card Command ───

function formatPerformance(entryPrice: number, currentPrice: number): string {
  if (entryPrice <= 0) return "N/A";
  const changePct = ((currentPrice - entryPrice) / entryPrice) * 100;
  if (changePct >= 100) {
    const multiplier = currentPrice / entryPrice;
    return `${multiplier.toFixed(1)}x 🚀`;
  } else if (changePct >= 0) {
    return `+${changePct.toFixed(1)}% 📈`;
  } else {
    return `${changePct.toFixed(1)}% 📉`;
  }
}

function getPerformanceBar(entryPrice: number, currentPrice: number): string {
  if (entryPrice <= 0) return "░░░░░░░░░░";
  const ratio = currentPrice / entryPrice;
  const filled = Math.min(Math.max(Math.round(ratio * 5), 0), 10);
  return "▓".repeat(filled) + "░".repeat(10 - filled);
}

// Vote category → card color theme mapping
const VOTE_THEME_MAP: Record<string, { bg: string; accent: string; label: string }> = {
  gamble: { bg: "dark purple gradient", accent: "purple neon glow", label: "GAMBLE" },
  cto: { bg: "dark blue/navy gradient", accent: "cyan/blue neon glow", label: "CTO" },
  volume: { bg: "dark orange/black gradient", accent: "orange neon glow", label: "VOLUME" },
  good_dev: { bg: "dark green/black gradient", accent: "emerald green neon glow", label: "GOOD DEV" },
  alpha: { bg: "dark black/gold gradient", accent: "gold/yellow neon glow", label: "ALPHA" },
};

const DEFAULT_THEME = { bg: "dark gray/black gradient", accent: "white glow", label: "NO VOTE" };

function getCardTheme(vote: string | null): { bg: string; accent: string; label: string } {
  if (!vote) return DEFAULT_THEME;
  const votes = vote.split(",").map(v => v.trim());
  const primaryVote = votes[0];
  return VOTE_THEME_MAP[primaryVote] || DEFAULT_THEME;
}

function getVoteCategoryLabels(vote: string | null): string {
  if (!vote) return "No vote";
  const votes = vote.split(",").map(v => v.trim());
  return votes.map(v => POLL_OPTIONS[OPTION_VALUES.indexOf(v)] || v).join(", ");
}

async function handleCardCommand(chatId: number, ca: string) {
  const { data: poll } = await supabase
    .from("polls")
    .select("*")
    .eq("chat_id", chatId)
    .eq("contract_address", ca)
    .single();

  if (!poll) {
    await sendMessage(chatId, "❌ No call found for this CA in this group.");
    return;
  }

  const tokenData = await fetchTokenData(ca);
  if (!tokenData) {
    await sendMessage(chatId, "❌ Could not fetch token data.");
    return;
  }

  const entryPrice = poll.entry_price_usd ? Number(poll.entry_price_usd) : 0;
  const currentPrice = tokenData.priceUsdRaw || 0;
  const peakPrice = poll.peak_price_usd ? Number(poll.peak_price_usd) : currentPrice;

  if (currentPrice > peakPrice) {
    await supabase.from("polls").update({ peak_price_usd: currentPrice }).eq("id", poll.id);
  }

  const actualPeak = Math.max(peakPrice, currentPrice);
  const callerUsername = poll.sender_username || "Unknown";
  const coinName = tokenData.pairName || "Unknown";

  // Calculate current performance string
  let perfStr = "N/A";
  if (entryPrice > 0 && currentPrice > 0) {
    const changePct = ((currentPrice - entryPrice) / entryPrice) * 100;
    if (changePct >= 100) {
      const multiplier = currentPrice / entryPrice;
      perfStr = `${multiplier.toFixed(1)}x`;
    } else if (changePct >= 0) {
      perfStr = `+${changePct.toFixed(1)}%`;
    } else {
      perfStr = `${changePct.toFixed(1)}%`;
    }
  }

  // Calculate highest X (peak multiplier since CA was posted)
  let highestXStr = "N/A";
  if (entryPrice > 0 && actualPeak > 0) {
    const peakChangePct = ((actualPeak - entryPrice) / entryPrice) * 100;
    if (peakChangePct >= 100) {
      const peakMultiplier = actualPeak / entryPrice;
      highestXStr = `${peakMultiplier.toFixed(1)}x`;
    } else if (peakChangePct >= 0) {
      highestXStr = `+${peakChangePct.toFixed(1)}%`;
    } else {
      highestXStr = `${peakChangePct.toFixed(1)}%`;
    }
  }

  // Calculate entry MC
  let entryMCStr = "N/A";
  if (entryPrice > 0 && currentPrice > 0 && tokenData.marketCap) {
    const mcNum = Number(tokenData.marketCap.replace(/[$,]/g, ""));
    if (mcNum > 0) {
      const ratio = mcNum / currentPrice;
      entryMCStr = formatNumber(entryPrice * ratio);
    }
  }

  // Calculate time since call
  const createdAt = new Date(poll.created_at).getTime();
  const diffMs = Date.now() - createdAt;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  let timeStr: string;
  if (diffD > 0) timeStr = `${diffD}d, ${diffH % 24}h`;
  else if (diffH > 0) timeStr = `${diffH}h, ${diffMin % 60}m`;
  else timeStr = `${diffMin}m`;

  // Get vote categories and theme
  const voteCategories = getVoteCategoryLabels(poll.vote);
  const theme = getCardTheme(poll.vote);

  // Determine color based on performance
  const isPositive = entryPrice > 0 && currentPrice >= entryPrice;
  // Generate card image using AI with vote-based theme
  const prompt = `Create a crypto trading PNL alert card image with a ${theme.bg} background and ${theme.accent} effects. The card should have:
- Top left: bold white text "${theme.label}" as category label badge
- Left side: a cool anime mascot character matching the ${theme.accent} color scheme
- Right side large bold text: "${coinName}" token name in white
- Below that: "called at $${entryMCStr}" in gray/white text
- Center/right: HUGE bold text "${perfStr}" in ${isPositive ? "bright glowing " + theme.accent : "red"} color, this should be the most prominent element
- Below performance: "🏆 Highest: ${highestXStr}" in golden/yellow color
- Category info: "${voteCategories}" displayed as tags/badges
- Below that: "👤 ${callerUsername.toUpperCase()}" in white bold
- Below that: "⏱ ${timeStr}" in gray
- Bottom stats row: Entry MC $${entryMCStr} | Current MC ${tokenData.marketCap} | Price ${tokenData.priceUsd} | ATH ${tokenData.ath}
- Overall style: sleek modern card with rounded corners, ${theme.accent} border glow, anime mascot character
- Aspect ratio: 16:9 landscape
- Do NOT include any real photos, use anime/illustrated style`;

  try {
    await sendMessage(chatId, "🎨 Generating card...");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    const aiData = await aiRes.json();
    const imageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageBase64) {
      console.error("AI image generation failed:", JSON.stringify(aiData));
      await sendMessage(chatId, "❌ Failed to generate card image.");
      return;
    }

    // Extract base64 data (remove data:image/png;base64, prefix)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Build caption with vote categories
    let caption = `🃏 <b>Call Card</b> — <b>${voteCategories}</b>\n\n`;
    caption += `🪙 <b>${coinName}</b>\n`;
    caption += `📊 Performance: <b>${perfStr}</b>\n`;
    caption += `💰 Called at: <b>$${entryMCStr}</b> MC\n`;
    caption += `👤 Caller: @${callerUsername}\n`;
    caption += `⏱ ${timeStr}\n`;
    caption += `\nCA: <code>${ca}</code>`;

    const markup = {
      inline_keyboard: [[
        { text: "🗑️", callback_data: "delete_msg" },
        { text: "🔄", callback_data: `card_${ca}` },
      ]],
    };

    // Send photo via multipart form data
    const formData = new FormData();
    formData.append("chat_id", String(chatId));
    formData.append("photo", new Blob([binaryData], { type: "image/png" }), "card.png");
    formData.append("caption", caption);
    formData.append("parse_mode", "HTML");
    formData.append("reply_markup", JSON.stringify(markup));

    await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    console.error("Card generation error:", err);
    await sendMessage(chatId, "❌ Failed to generate card. Try again.");
  }
}

async function handleMessage(message: any) {
  const text = message.text;
  if (!text) return;

  const chatId = message.chat.id;
  const userId = message.from.id;
  const username = message.from.username || message.from.first_name || "Unknown";

  // Handle commands
  const cmdMatch = text.trim().match(/^\/(\w+)/);
  if (cmdMatch) {
    const cmd = `/${cmdMatch[1].toLowerCase()}`;
    
    // Handle /ca command - list all commands
    if (cmd === "/ca" || cmd === "/start" || cmd === "/help") {
      let helpMsg = `🤖 <b>Available Commands</b>\n\n`;
      helpMsg += `📋 <b>General</b>\n`;
      helpMsg += `├ /ca - Show all commands\n`;
      helpMsg += `├ /card &lt;CA&gt; - Generate call card\n`;
      helpMsg += `└ /lb - Full leaderboard\n\n`;
      helpMsg += `🏆 <b>Category Leaderboards</b>\n`;
      helpMsg += `├ /ga - Gamble leaderboard\n`;
      helpMsg += `├ /ct - CTO leaderboard\n`;
      helpMsg += `├ /vo - Volume leaderboard\n`;
      helpMsg += `├ /gd - Good Dev leaderboard\n`;
      helpMsg += `└ /al - Alpha leaderboard\n\n`;
      helpMsg += `💡 Send any Solana CA to create a poll!`;
      await sendMessage(chatId, helpMsg);
      return;
    }

    // Handle /card command
    if (cmd === "/card") {
      const ca = extractSolanaCA(text);
      if (!ca) {
        await sendMessage(chatId, "⚠️ Usage: /card <contract_address>");
        return;
      }
      await handleCardCommand(chatId, ca);
      return;
    }

    // Handle leaderboard commands: /lb, /ga, /ct, /vo, /gd, /al
    const lbConfig = LEADERBOARD_COMMANDS[cmd];
    if (lbConfig) {
      await handleLeaderboard(chatId, "1d", lbConfig.filter || "");
      return;
    }
  }

  const ca = extractSolanaCA(text);
  if (!ca) return;

  const { data: existing } = await supabase
    .from("polls")
    .select("*")
    .eq("chat_id", chatId)
    .eq("contract_address", ca)
    .single();

  if (existing) {
    if (existing.vote) {
      const [tokenData, affiliateText, firstCaller] = await Promise.all([
        fetchTokenData(ca),
        buildAffiliateText(ca),
        getFirstCaller(ca),
      ]);
      const voteLabels = existing.vote.split(",").map((v: string) => POLL_OPTIONS[OPTION_VALUES.indexOf(v)] || v).join(", ");
      const resultText = buildResultMessage(ca, voteLabels, existing.sender_username || "Unknown", tokenData, affiliateText, firstCaller);
      const markup = getResultMarkup(ca);

      if (tokenData?.imageUrl) {
        await sendPhoto(chatId, tokenData.imageUrl, resultText, markup);
      } else {
        await sendMessage(chatId, resultText, markup);
      }
    } else {
      const pollLink = existing.message_id ? `\n\n👉 <a href="https://t.me/c/${String(chatId).replace('-100', '')}/${existing.message_id}">Jump to poll</a>` : "";
      await sendMessage(chatId, `⏳ Poll for this CA is still open. Waiting for @${existing.sender_username || "Unknown"} to vote.${pollLink}`);
    }
    return;
  }

  // Fetch entry price and token data before creating poll
  const tokenData = await fetchTokenData(ca);
  const entryPrice = tokenData?.priceUsdRaw || 0;
  const entryMC = tokenData?.marketCap || null;

  const sentMsg = await sendPoll(chatId, ca);
  const messageId = sentMsg.result?.message_id;
  const pollId = sentMsg.result?.poll?.id;

  // Send first call as separate message below the poll
  if (entryMC) {
    await sendMessage(chatId, `😈 @${username} @ ${entryMC}`);
  }

  await supabase.from("polls").insert({
    chat_id: chatId,
    contract_address: ca,
    sender_user_id: userId,
    sender_username: username,
    message_id: messageId,
    telegram_poll_id: pollId || null,
    entry_price_usd: entryPrice > 0 ? entryPrice : null,
    peak_price_usd: entryPrice > 0 ? entryPrice : null,
  });
}

async function handlePollAnswer(pollAnswer: any) {
  const pollId = pollAnswer.poll_id;
  const userId = pollAnswer.user?.id;
  const optionIds = pollAnswer.option_ids;

  if (!optionIds || optionIds.length === 0) return;

  const votes = optionIds.map((i: number) => OPTION_VALUES[i]);
  const voteStr = votes.join(",");

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
    // Also delete the first call message (sent right after the poll)
    await deleteMessage(poll.chat_id, poll.message_id + 1);
  }

  const [tokenData, affiliateText, firstCaller] = await Promise.all([
    fetchTokenData(poll.contract_address),
    buildAffiliateText(poll.contract_address),
    getFirstCaller(poll.contract_address),
  ]);

  const voteLabels = optionIds.map((i: number) => POLL_OPTIONS[i]).join(", ");
  const resultText = buildResultMessage(poll.contract_address, voteLabels, poll.sender_username || "Unknown", tokenData, affiliateText, firstCaller);
  const markup = getResultMarkup(poll.contract_address);

  if (tokenData?.imageUrl) {
    await sendPhoto(poll.chat_id, tokenData.imageUrl, resultText, markup);
  } else {
    await sendMessage(poll.chat_id, resultText, markup);
  }
}

async function handleCallbackQuery(cb: any) {
  const data = cb.data;
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;

  if (!chatId || !messageId) return;

  if (data === "delete_msg") {
    await deleteMessage(chatId, messageId);
    await answerCallbackQuery(cb.id, "Deleted");
    return;
  }


  // Card refresh: card_{ca}
  if (data?.startsWith("card_")) {
    const ca = data.replace("card_", "");
    await handleCardCommand(chatId, ca);
    await answerCallbackQuery(cb.id, "Refreshed ✅");
    return;
  }

  // Refresh button: refresh_{ca}
  if (data?.startsWith("refresh_")) {
    const ca = data.replace("refresh_", "");
    const { data: poll } = await supabase
      .from("polls")
      .select("*")
      .eq("chat_id", chatId)
      .eq("contract_address", ca)
      .not("vote", "is", null)
      .single();

    if (poll) {
      const [tokenData, affiliateText, firstCaller] = await Promise.all([
        fetchTokenData(ca),
        buildAffiliateText(ca),
        getFirstCaller(ca),
      ]);
      const voteLabels = poll.vote.split(",").map((v: string) => POLL_OPTIONS[OPTION_VALUES.indexOf(v)] || v).join(", ");
      const resultText = buildResultMessage(ca, voteLabels, poll.sender_username || "Unknown", tokenData, affiliateText, firstCaller);
      const markup = getResultMarkup(ca);

      if (cb.message?.photo) {
        await fetch(`${TELEGRAM_API}/editMessageCaption`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            caption: resultText,
            parse_mode: "HTML",
            reply_markup: JSON.stringify(markup),
          }),
        });
      } else {
        await editMessageText(chatId, messageId, resultText, markup);
      }
    }
    await answerCallbackQuery(cb.id, "Refreshed ✅");
    return;
  }

  // Leaderboard period buttons: lb_12h, lb_gamble_1d, etc.
  if (data?.startsWith("lb_")) {
    const parts = data.replace("lb_", "");
    let period = parts;
    let voteFilter = "";

    const lastUnderscore = parts.lastIndexOf("_");
    if (lastUnderscore > 0) {
      const possiblePeriod = parts.slice(lastUnderscore + 1);
      if (PERIOD_HOURS[possiblePeriod]) {
        voteFilter = parts.slice(0, lastUnderscore);
        period = possiblePeriod;
      }
    }

    if (PERIOD_HOURS[period]) {
      const text = await buildLeaderboardText(chatId, period, voteFilter);
      const markup = getLeaderboardMarkup(period, voteFilter);
      await editMessageText(chatId, messageId, text, markup);
      await answerCallbackQuery(cb.id);
    }
    return;
  }
}

// ─── HTTP Server ───

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  if (req.method === "GET" && url.searchParams.get("action") === "register") {
    try {
      const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-webhook`;
      const [webhookRes, cmdRes] = await Promise.all([
        fetch(`${TELEGRAM_API}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: webhookUrl }),
        }),
        fetch(`${TELEGRAM_API}/setMyCommands`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commands: [
              { command: "ca", description: "Show all commands" },
              { command: "card", description: "Generate call card for a CA" },
              { command: "lb", description: "Full leaderboard" },
              { command: "ga", description: "Gamble leaderboard" },
              { command: "ct", description: "CTO leaderboard" },
              { command: "vo", description: "Volume leaderboard" },
              { command: "gd", description: "Good Dev leaderboard" },
              { command: "al", description: "Alpha leaderboard" },
            ],
          }),
        }),
      ]);
      const data = await webhookRes.json();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, description: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

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
      // Legacy: keep for backward compat with any existing native polls
      await handlePollAnswer(update.poll_answer);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
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
