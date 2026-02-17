import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const PORT = Number(Deno.env.get("PORT") || "3000");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const POLL_OPTIONS = ["CTO","Volume","Good dev","Gamble","Alpha"];
const OPTION_VALUES = ["cto","volume","good_dev","gamble","alpha"];

const DELETE_BUTTON_MARKUP = {
  inline_keyboard: [[{ text: "🗑️", callback_data: "delete_msg" }]],
};

function extractSolanaCA(text: string): string | null {
  const match = text.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/);
  return match ? match[0] : null;
}

async function buildAffiliateText(ca: string) {
  return `<a href="https://gmgn.ai/token/${ca}">GM</a>`;
}

async function sendPoll(chatId:number, ca:string) {
  const res = await fetch(`${TELEGRAM_API}/sendPoll`,{
    method:"POST",
    headers:{ "Content-Type":"application/json"},
    body:JSON.stringify({
      chat_id:chatId,
      question:"Info about coin",
      options:POLL_OPTIONS.map(t=>({text:t})),
      is_anonymous:false,
      allows_multiple_answers:true
    })
  });
  return res.json();
}

async function sendMessage(chatId:number,text:string,markup?:any){
  await fetch(`${TELEGRAM_API}/sendMessage`,{
    method:"POST",
    headers:{ "Content-Type":"application/json"},
    body:JSON.stringify({
      chat_id:chatId,
      text,
      parse_mode:"HTML",
      disable_web_page_preview:true,
      reply_markup:markup?JSON.stringify(markup):undefined
    })
  });
}

async function deleteMessage(chatId:number,messageId:number){
  await fetch(`${TELEGRAM_API}/deleteMessage`,{
    method:"POST",
    headers:{ "Content-Type":"application/json"},
    body:JSON.stringify({ chat_id:chatId,message_id:messageId })
  });
}

async function answerCallbackQuery(id:string){
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`,{
    method:"POST",
    headers:{ "Content-Type":"application/json"},
    body:JSON.stringify({ callback_query_id:id })
  });
}

/* ===========================
   HANDLE MESSAGE
=========================== */
async function handleMessage(message:any){

  const text = message.text;
  if(!text) return;

  const chatId = message.chat.id;
  const userId = message.from.id;
  const username = message.from.username || message.from.first_name || "Unknown";

  const ca = extractSolanaCA(text);
  if(!ca) return;

  /* ✅ CHECK GLOBAL USER VOTE */
  const { data: previousVote } = await supabase
    .from("last_vote_per_user")
    .select("last_vote")
    .eq("user_id",userId)
    .maybeSingle();

  if(previousVote?.last_vote){

    const labels = previousVote.last_vote
      .split(",")
      .map((v:string)=>POLL_OPTIONS[OPTION_VALUES.indexOf(v)]||v)
      .join(", ");

    const affiliate = await buildAffiliateText(ca);

    await sendMessage(
      chatId,
      `📊 <b>Information about coin</b>\n\nCA: <code>${ca}</code>\n\nInformation: <b>${labels}</b>\n\nVoted by: @${username}\n\n🔁 Auto-used your previous vote\n\n${affiliate}`,
      DELETE_BUTTON_MARKUP
    );

    return;
  }

  /* CHECK EXISTING POLL */
  const { data: existing } = await supabase
    .from("polls")
    .select("*")
    .eq("chat_id",chatId)
    .eq("contract_address",ca)
    .maybeSingle();

  if(existing){
    if(existing.vote){
      const labels = existing.vote
        .split(",")
        .map((v:string)=>POLL_OPTIONS[OPTION_VALUES.indexOf(v)]||v)
        .join(", ");

      await sendMessage(
        chatId,
        `📊 <b>Information about coin</b>\n\nCA: <code>${ca}</code>\n\nInformation: <b>${labels}</b>\n\nVoted by: @${existing.sender_username}`,
        DELETE_BUTTON_MARKUP
      );
    }else{
      await sendMessage(chatId,"⏳ Poll still open.");
    }
    return;
  }

  /* CREATE POLL */
  const sent = await sendPoll(chatId,ca);

  await supabase.from("polls").insert({
    chat_id:chatId,
    contract_address:ca,
    sender_user_id:userId,
    sender_username:username,
    message_id:sent.result?.message_id,
    telegram_poll_id:sent.result?.poll?.id
  });
}

/* ===========================
   HANDLE POLL ANSWER
=========================== */
async function handlePollAnswer(pollAnswer:any){

  const pollId = pollAnswer.poll_id;
  const userId = pollAnswer.user?.id;
  const optionIds = pollAnswer.option_ids;

  if(!optionIds?.length) return;

  const voteStr = optionIds.map((i:number)=>OPTION_VALUES[i]).join(",");

  const { data: poll } = await supabase
    .from("polls")
    .select("*")
    .eq("telegram_poll_id",pollId)
    .maybeSingle();

  if(!poll) return;
  if(poll.sender_user_id!==userId) return;
  if(poll.vote) return;

  /* SAVE POLL RESULT */
  await supabase.from("polls")
    .update({ vote:voteStr, voted_at:new Date().toISOString() })
    .eq("id",poll.id);

  /* ✅ SAVE GLOBAL USER VOTE */
 const { data:debugData, error:debugError } = await supabase
  .from("last_vote_per_user")
  .upsert({
    user_id:userId,
    username:pollAnswer.user?.username || "",
    last_vote:voteStr,
    updated_at:new Date().toISOString()
  });

console.log("GLOBAL SAVE RESULT:", debugData, debugError);


  if(poll.message_id){
    await deleteMessage(poll.chat_id,poll.message_id);
  }

  const labels = optionIds.map((i:number)=>POLL_OPTIONS[i]).join(", ");
  const affiliate = await buildAffiliateText(poll.contract_address);

  await sendMessage(
    poll.chat_id,
    `📊 <b>Information about coin</b>\n\nCA: <code>${poll.contract_address}</code>\n\nInformation: <b>${labels}</b>\n\nVoted by: @${poll.sender_username}\n\n${affiliate}`,
    DELETE_BUTTON_MARKUP
  );
}

/* ===========================
   SERVER
=========================== */
Deno.serve({ port: PORT }, async (req) => {

  const url = new URL(req.url);

  /* ✅ REGISTER WEBHOOK */
  if (req.method === "GET" && url.searchParams.get("action") === "register") {

    const webhookUrl = Deno.env.get("WEBHOOK_URL")!;

    const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: [
          "message",
          "poll_answer",
          "callback_query"
        ]
      }),
    });

    const data = await res.json();
    console.log("Webhook registered:", data);

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  }

  /* ✅ CHECK WEBHOOK STATUS */
  if (req.method === "GET" && url.searchParams.get("action") === "status") {

    const res = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  }

  /* ✅ HEALTH CHECK */
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", bot: "running" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  /* ✅ TELEGRAM UPDATES */
  try {

    const update = await req.json();
    console.log("UPDATE RECEIVED:", JSON.stringify(update));

    if (update.message) {
      await handleMessage(update.message);
    }
    else if (update.poll_answer) {
      console.log("POLL ANSWER RECEIVED");
      await handlePollAnswer(update.poll_answer);
    }
    else if (update.callback_query) {
      const cb = update.callback_query;
      if (cb.data === "delete_msg" && cb.message) {
        await deleteMessage(cb.message.chat.id, cb.message.message_id);
        await answerCallbackQuery(cb.id);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("error", { status: 500 });
  }

});
