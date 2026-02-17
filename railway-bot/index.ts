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
  inline_keyboard: [[{ text:"🗑️", callback_data:"delete_msg"}]],
};

function extractSolanaCA(text:string){
  const match=text.match(/\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/);
  return match?match[0]:null;
}

function formatNumber(num:number){
  if(!num) return "N/A";
  if(num>=1e9) return (num/1e9).toFixed(2)+"B";
  if(num>=1e6) return (num/1e6).toFixed(2)+"M";
  if(num>=1e3) return (num/1e3).toFixed(1)+"K";
  return num.toString();
}

async function buildAffiliateText(ca:string){
  return `<a href="https://gmgn.ai/token/${ca}">GM</a>`;
}

/* ================= FETCH DATA ================= */

async function fetchDexData(ca:string){
  try{
    const r=await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`);
    const j=await r.json();
    return j?.pairs?.[0]||null;
  }catch{return null;}
}

async function fetchSecurityData(ca:string){
  try{
    const r=await fetch(`https://api.rugcheck.xyz/v1/tokens/${ca}`);
    const j=await r.json();
    return{
      fresh:j?.stats?.fresh_wallets_pct??"N/A",
      top10:j?.stats?.top10_pct??"N/A",
      devSold:j?.dev?.sold?"🔴 Yes":"🟢 No",
      dexPaid:j?.dex?.paid?"🟢 Paid":"🔴 Unpaid"
    };
  }catch{return null;}
}

/* ================= BUILD RESULT ================= */

async function buildFullMessage(ca:string,labels:string,voter:string){

  const pair=await fetchDexData(ca);
  const security=await fetchSecurityData(ca);
  const affiliate=await buildAffiliateText(ca);

  const stats=pair?`
📊 <b>Stats</b>
├ USD     $${pair.priceUsd??"N/A"} (${pair.priceChange?.h24??"N/A"}%)
├ MC      $${formatNumber(pair.marketCap)}
├ Vol     $${formatNumber(pair.volume?.h24)}
├ LP      $${formatNumber(pair.liquidity?.usd)}
├ 1H      ${pair.priceChange?.h1??"N/A"}% 🟢${pair.txns?.h1?.buys??0} 🔴${pair.txns?.h1?.sells??0}
└ FDV     $${formatNumber(pair.fdv)}
`:"";

  const socials=pair?.info?.socials?.length
    ?`\n🔗 <b>Socials</b>\n`+
      pair.info.socials.map((s:any)=>`• <a href="${s.url}">${s.type}</a>`).join("\n")
    :"";

  const securityText=security?`
\n🔒 <b>Security</b>
├ Fresh     ${security.fresh}
├ Top 10    ${security.top10}
├ Dev Sold  ${security.devSold}
└ DEX Paid  ${security.dexPaid}
`:"";

  const text=
`📊 <b>Information about coin</b>\n\n`+
`CA: <code>${ca}</code>\n\n`+
`Information: <b>${labels}</b>\n\n`+
`Voted by: ${voter}`+
stats+
socials+
securityText+
`\n\n${affiliate}`;

  return{ text,image:pair?.info?.imageUrl };
}

/* ================= TELEGRAM HELPERS ================= */

async function sendPoll(chatId:number){
  const r=await fetch(`${TELEGRAM_API}/sendPoll`,{
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
  return r.json();
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

async function sendPhoto(chatId:number,url:string,caption:string){
  await fetch(`${TELEGRAM_API}/sendPhoto`,{
    method:"POST",
    headers:{ "Content-Type":"application/json"},
    body:JSON.stringify({
      chat_id:chatId,
      photo:url,
      caption,
      parse_mode:"HTML",
      reply_markup:JSON.stringify(DELETE_BUTTON_MARKUP)
    })
  });
}

async function deleteMessage(chatId:number,id:number){
  await fetch(`${TELEGRAM_API}/deleteMessage`,{
    method:"POST",
    headers:{ "Content-Type":"application/json"},
    body:JSON.stringify({chat_id:chatId,message_id:id})
  });
}

async function answerCallbackQuery(id:string){
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`,{
    method:"POST",
    headers:{ "Content-Type":"application/json"},
    body:JSON.stringify({callback_query_id:id})
  });
}

/* ================= HANDLE MESSAGE ================= */

async function handleMessage(message:any){

  const text=message.text;
  if(!text) return;

  const chatId=message.chat.id;
  const userId=message.from.id;
  const username=message.from.username||message.from.first_name||"Unknown";

  const ca=extractSolanaCA(text);
  if(!ca) return;

  /* 1️⃣ GROUP RESULT EXISTS */
  const {data:group}=await supabase
    .from("polls")
    .select("*")
    .eq("chat_id",chatId)
    .eq("contract_address",ca)
    .not("vote","is",null)
    .maybeSingle();

  if(group?.vote){

    const labels=group.vote
      .split(",")
      .map((v:string)=>POLL_OPTIONS[OPTION_VALUES.indexOf(v)]||v)
      .join(", ");

    const msg=await buildFullMessage(ca,labels,`@${group.sender_username}`);

    if(msg.image) await sendPhoto(chatId,msg.image,msg.text);
    else await sendMessage(chatId,msg.text,DELETE_BUTTON_MARKUP);

    return;
  }

  /* 2️⃣ SAME USER VOTED BEFORE (ANY GROUP) */
  const {data:userVote}=await supabase
    .from("user_ca_votes")
    .select("*")
    .eq("user_id",userId)
    .eq("contract_address",ca)
    .maybeSingle();

  if(userVote?.vote){

    await supabase.from("polls").insert({
      chat_id:chatId,
      contract_address:ca,
      sender_user_id:userId,
      sender_username:username,
      vote:userVote.vote,
      voted_at:new Date().toISOString()
    });

    const labels=userVote.vote
      .split(",")
      .map((v:string)=>POLL_OPTIONS[OPTION_VALUES.indexOf(v)]||v)
      .join(", ");

    const msg=await buildFullMessage(ca,labels,`@${username}`);

    if(msg.image) await sendPhoto(chatId,msg.image,msg.text);
    else await sendMessage(chatId,msg.text,DELETE_BUTTON_MARKUP);

    return;
  }

  /* 3️⃣ CREATE POLL */
  const sent=await sendPoll(chatId);

  await supabase.from("polls").insert({
    chat_id:chatId,
    contract_address:ca,
    sender_user_id:userId,
    sender_username:username,
    message_id:sent.result?.message_id,
    telegram_poll_id:sent.result?.poll?.id
  });
}

/* ================= HANDLE POLL ANSWER ================= */

async function handlePollAnswer(pollAnswer:any){

  const pollId=pollAnswer.poll_id;
  const userId=pollAnswer.user?.id;
  const optionIds=pollAnswer.option_ids;
  if(!optionIds?.length) return;

  const voteStr=optionIds.map((i:number)=>OPTION_VALUES[i]).join(",");

  const {data:poll}=await supabase
    .from("polls")
    .select("*")
    .eq("telegram_poll_id",pollId)
    .maybeSingle();

  if(!poll||poll.vote||poll.sender_user_id!==userId) return;

  await supabase.from("polls")
    .update({vote:voteStr,voted_at:new Date().toISOString()})
    .eq("id",poll.id);

  await supabase.from("user_ca_votes").upsert({
    user_id:userId,
    contract_address:poll.contract_address,
    vote:voteStr,
    username:pollAnswer.user?.username||""
  },{onConflict:"user_id,contract_address"});

  if(poll.message_id) await deleteMessage(poll.chat_id,poll.message_id);

  const labels=optionIds.map((i:number)=>POLL_OPTIONS[i]).join(", ");
  const msg=await buildFullMessage(poll.contract_address,labels,`@${poll.sender_username}`);

  if(msg.image) await sendPhoto(poll.chat_id,msg.image,msg.text);
  else await sendMessage(poll.chat_id,msg.text,DELETE_BUTTON_MARKUP);
}

/* ================= SERVER ================= */

Deno.serve({port:PORT},async(req)=>{

  const url=new URL(req.url);

  if(req.method==="GET" && url.searchParams.get("action")==="register"){
    const webhookUrl=Deno.env.get("WEBHOOK_URL")!;
    const r=await fetch(`${TELEGRAM_API}/setWebhook`,{
      method:"POST",
      headers:{ "Content-Type":"application/json"},
      body:JSON.stringify({
        url:webhookUrl,
        allowed_updates:["message","poll","poll_answer","callback_query"]
      })
    });
    return new Response(await r.text());
  }

  if(req.method==="GET" && url.searchParams.get("action")==="status"){
    const r=await fetch(`${TELEGRAM_API}/getWebhookInfo`);
    return new Response(await r.text());
  }

  if(req.method==="GET"){
    return new Response(JSON.stringify({status:"ok"}));
  }

  try{
    const update=await req.json();

    if(update.message) await handleMessage(update.message);
    else if(update.poll_answer) await handlePollAnswer(update.poll_answer);
    else if(update.callback_query){
      const cb=update.callback_query;
      if(cb.data==="delete_msg" && cb.message){
        await deleteMessage(cb.message.chat.id,cb.message.message_id);
        await answerCallbackQuery(cb.id);
      }
    }

    return new Response(JSON.stringify({ok:true}));
  }
  catch(e){
    console.error(e);
    return new Response("error",{status:500});
  }

});
