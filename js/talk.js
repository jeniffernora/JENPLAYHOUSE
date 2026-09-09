(()=>{
"use strict";

const C=window.JEN_CONFIG||{};
const bundled=window.JEN_CMS_DATA||{};
let data=JSON.parse(JSON.stringify(bundled||{}));

const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const img=v=>String(v||"").trim()||"assets/images/jeniffer.jpg";
const clean=v=>{
  if(v===null||v===undefined)return"";
  if(typeof v==="object"){
    if("v" in v)return clean(v.v);
    if("value" in v)return clean(v.value);
    if("text" in v)return clean(v.text);
    if("label" in v)return clean(v.label);
    if("name" in v)return clean(v.name);
    if("displayName" in v)return clean(v.displayName);
    return"";
  }
  return String(v).trim();
};
const visible=rows=>(rows||[]).filter(r=>!["hidden","draft","archived"].includes(clean(r.Status).toLowerCase()));

try{
  const saved=localStorage.getItem(C.cmsStorageKey);
  if(saved)data={...data,...JSON.parse(saved)};
}catch(e){}

function parseCsv(text){
  const rows=[];let row=[],cell="",q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(q){
      if(c==='"'&&n==='"'){cell+='"';i++;}
      else if(c==='"')q=false;
      else cell+=c;
    }else{
      if(c==='"')q=true;
      else if(c===','){row.push(cell);cell='';}
      else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}
      else cell+=c;
    }
  }
  if(cell.length||row.length){row.push(cell.replace(/\r$/,''));rows.push(row)}
  return rows;
}

async function fetchSheet(sheetName){
  const id=clean(C.liveSheetId);
  if(!id)return null;
  const url=`https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&_=${Date.now()}`;
  const r=await fetch(url,{cache:"no-store"});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const table=parseCsv(await r.text());
  if(table.length<2)return [];
  const headers=table[0].map(x=>clean(x));
  return table.slice(1)
    .filter(cols=>cols.some(v=>clean(v)))
    .map(cols=>Object.fromEntries(headers.map((h,i)=>[h,clean(cols[i])])));
}

async function loadLive(){
  try{
    const users=await fetchSheet("Users");
    if(users&&users.length)data.Users=users;
  }catch(e){console.warn("Talk: live Users unavailable",e)}
  try{
    const rows=await fetchSheet(C.talkMessagesSheetName||"Talk Messages");
    if(rows)data["Talk Messages"]=rows;
  }catch(e){console.warn("Talk: live Talk Messages unavailable; using fallback.",e)}
}

function officialUsers(){
  return visible(data.Users||[])
    .filter(u=>{
      const id=clean(u["User ID"]);
      const role=clean(u.Role||u.Position).toLowerCase();
      return /^JN-/i.test(id)||/^JT-/i.test(id)||/artist|j-team/.test(role);
    });
}

function sampleMessages(users){
  const openingByName={
    "Jeniffer":"hey Jeadore ♡ what are u doing?",
    "Jeniffer Nora":"hey Jeadore ♡ what are u doing?",
    "Helena":"wait i need to show u something 😭",
    "Ranu":"hellooo where have u been",
    "Nona":"i just remembered something funny lol",
    "Manu":"should i tell u what happened today...",
    "Gadis":"look what i found!!!",
    "Atharya":"tiny update before i disappear again",
    "Niki":"did u eat yet?",
    "Ed":"i have something to tell u"
  };

  return users.map((u,i)=>{
    const name=authorName(u);
    return {
      "Message ID":`DEMO-${clean(u["User ID"])||i+1}`,
      "Author ID":clean(u["User ID"]),
      Type:"Text",
      Message:openingByName[name]||"hey ♡ i have a little update for u",
      Date:"08 September 2026",
      Time:`${String(10+(i%7)).padStart(2,"0")}:${String(12+i*3).slice(-2)}`,
      Order:String(i+1),
      Status:"Published",
      Demo:"yes"
    };
  });
}

function authorName(u){
  if(!u)return"Jeniffer Nora";

  const candidates=[
    u["Display Name"],
    u["Name"],
    u["Artist Name"],
    u["Username"],
    u["User Name"],
    u["displayName"],
    u["name"]
  ];

  for(const value of candidates){
    const text=clean(value);
    if(text && text!=="[object Object]")return text;
  }

  return"Jeniffer Nora";
}
function authorRole(u){
  const r=clean(u.Role||u.Position);
  if(/artist/i.test(r)||/^JN-/i.test(clean(u["User ID"])))return"Artist";
  return"J-Team";
}
function verified(u){return clean(u.Verified).toLowerCase()==="yes"||clean(u.Verified).toLowerCase()==="true"}

function messageType(m){return clean(m.Type||m["Post Type"]||"Text").toLowerCase()}
function messageText(m){return clean(m.Message||m.Text||m.Caption||m.Body)}
function mediaUrl(m){return clean(m["Media URL"]||m.Media||m.URL||m["File URL"])}
function posterUrl(m){return clean(m["Poster URL"]||m.Thumbnail||m["Thumbnail URL"]||mediaUrl(m))}
function duration(m){return clean(m.Duration||m["Voice Duration"]||"0:18")}
function stamp(m){return [clean(m.Date),clean(m.Time)].filter(Boolean).join(" · ")}

function preview(m){
  if(!m)return"No messages yet";
  const t=messageType(m);
  if(t==="photo"||t==="image")return"📷 Photo";
  if(t==="video")return"▶ Video";
  if(t.includes("voice")||t==="audio")return`🎙 Voice note · ${duration(m)}`;
  return messageText(m)||"New message";
}

function sortMessages(rows){
  return [...rows].sort((a,b)=>{
    const ao=Number(a.Order||a["Message Order"]||0);
    const bo=Number(b.Order||b["Message Order"]||0);
    if(ao||bo)return ao-bo;
    return String(a["Message ID"]||"").localeCompare(String(b["Message ID"]||""));
  });
}

let users=[];
let messages=[];
let demoMessages=[];
let currentUser=null;

const TALK_SESSION_KEY="jeniffer-nora-admin-session-v1";
const CLOUDINARY_CLOUD_NAME="rle84npy";
const CLOUDINARY_UPLOAD_PRESET="jeniffer_updates";
const CLOUDINARY_UPLOAD_URL=`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
let loggedInUser=null;

function normalizeLoginUser(raw,email){
  if(!raw)return null;
  return {
    "User ID":raw.userId||raw["User ID"]||"",
    Name:raw.name||raw.Name||"",
    "Display Name":raw.displayName||raw["Display Name"]||raw.name||raw.Name||"",
    Role:raw.role||raw.Role||"",
    Verified:raw.verified||raw.Verified||"",
    "Can Post":raw.canPost||raw["Can Post"]||"",
    Photo:raw.photo||raw.Photo||"",
    Email:email||raw.Email||""
  };
}

function saveTalkSession(user){
  localStorage.setItem(TALK_SESSION_KEY,JSON.stringify(user));
}

function clearTalkSession(){
  localStorage.removeItem(TALK_SESSION_KEY);
  loggedInUser=null;
}

function canTalkPost(user){
  return user && String(user["Can Post"]||"").toLowerCase()==="yes";
}

function isElevated(user){
  return /owner|manager/i.test(String(user?.Role||""));
}

function canPostToRoom(roomUser){
  if(!loggedInUser||!roomUser||!canTalkPost(loggedInUser))return false;
  return isElevated(loggedInUser) || clean(loggedInUser["User ID"])===clean(roomUser["User ID"]);
}

function canDeleteTalkMessage(message){
  if(!loggedInUser||!message||!canTalkPost(loggedInUser))return false;
  if(isElevated(loggedInUser))return true;
  return clean(loggedInUser["User ID"])===clean(message["Author ID"]);
}

function syncTalkLoginUI(){
  const btn=$("#talkLoginButton");
  const label=$("#talkLoginUser");

  if(loggedInUser){
    if(btn)btn.hidden=true;
    if(label){
      label.hidden=false;
      label.innerHTML=`${esc(loggedInUser["Display Name"]||loggedInUser.Name||"J-Team")} · <button type="button" id="talkLogoutButton" style="border:0;background:transparent;color:#C92F45;padding:0;cursor:pointer">Logout</button>`;
    }
  }else{
    if(btn)btn.hidden=false;
    if(label){label.hidden=true;label.innerHTML=""}
  }

  updateRoomComposerState();
}

async function talkLogin(email,silent=false){
  email=clean(email);
  const status=$("#talkLoginStatus");

  if(!email){
    if(!silent&&status)status.textContent="Enter your registered email.";
    return false;
  }
  if(!C.appsScriptUrl){
    if(status)status.textContent="Apps Script URL is missing.";
    return false;
  }

  if(!silent&&status)status.textContent="Checking account…";

  try{
    const r=await fetch(C.appsScriptUrl+"?action=login&email="+encodeURIComponent(email),{cache:"no-store"});
    const j=await r.json();

    if(j.success===true||j.ok===true){
      const user=normalizeLoginUser(j.user,email);
      if(!canTalkPost(user)){
        if(status)status.textContent="This account does not have posting permission.";
        return false;
      }
      loggedInUser=user;
      saveTalkSession(user);
      syncTalkLoginUI();
      if(status)status.textContent="Logged in.";
      const modal=$("#talkAuthModal");
      if(modal)setTimeout(()=>modal.hidden=true,250);
      return true;
    }

    clearTalkSession();
    syncTalkLoginUI();
    if(status)status.textContent=j.message||j.error||"Access denied.";
    return false;
  }catch(e){
    console.error(e);
    if(status)status.textContent="Could not reach the login server.";
    return false;
  }
}

async function restoreTalkLogin(){
  try{
    const saved=JSON.parse(localStorage.getItem(TALK_SESSION_KEY)||"null");
    if(saved&&saved.Email){
      await talkLogin(saved.Email,true);
    }
  }catch(e){
    clearTalkSession();
  }
  syncTalkLoginUI();
}

function updateRoomComposerState(){
  const btn=$("#roomComposeButton");
  const input=document.querySelector(".room-input input");
  if(!btn)return;

  const allowed=canPostToRoom(currentUser);
  btn.disabled=!allowed;
  btn.title=allowed?"Send a message":"Login as this J-Team member to send";

  if(input){
    input.value=allowed
      ?"Send a new message…"
      :"Only Jen & J-Team can send messages ♡";
  }
}

function mediaKindForTalk(type){
  if(type==="Photo")return "image";
  if(type==="Video")return "video";
  if(type==="Voice Note")return "audio";
  return "none";
}

async function uploadTalkMedia(file){
  const form=new FormData();
  form.append("file",file);
  form.append("upload_preset",CLOUDINARY_UPLOAD_PRESET);
  form.append("folder","jen-playhouse-talk");

  let response;
  try{
    response=await fetch(CLOUDINARY_UPLOAD_URL,{
      method:"POST",
      body:form
    });
  }catch(networkError){
    throw new Error("Could not reach Cloudinary.");
  }

  const raw=await response.text();
  let result={};

  try{
    result=JSON.parse(raw);
  }catch(e){
    throw new Error(`Cloudinary returned an invalid response (${response.status}).`);
  }

  if(!response.ok||!result.secure_url){
    throw new Error(
      result?.error?.message ||
      `Cloudinary upload failed (${response.status}).`
    );
  }

  return {
    url:result.secure_url,
    resourceType:result.resource_type||"",
    duration:result.duration||"",
    publicId:result.public_id||""
  };
}

function cloudinaryVideoPoster(url){
  if(!url)return "";
  try{
    return url
      .replace("/upload/","/upload/so_0/")
      .replace(/\.[a-z0-9]+(?:\?.*)?$/i,".jpg");
  }catch(e){
    return "";
  }
}

function openTalkComposer(){
  if(!currentUser||!canPostToRoom(currentUser))return;

  $("#talkComposeModal").hidden=false;
  $("#talkComposeAs").textContent=`Posting as ${authorName(currentUser)}`;
  $("#talkComposeText").value="";
  $("#talkComposeType").value="Text";
  $("#talkComposeMedia").value="";
  $("#talkComposeStatus").textContent="";
  syncComposeType();
}

function syncComposeType(){
  const type=$("#talkComposeType").value;
  const field=$("#talkComposeMediaField");
  const file=$("#talkComposeMedia");
  const hint=$("#talkComposeMediaHint");
  const kind=mediaKindForTalk(type);

  field.hidden=kind==="none";

  if(kind==="image"){
    file.accept="image/*";
    hint.textContent="Upload 1 image.";
  }else if(kind==="video"){
    file.accept="video/*";
    hint.textContent="Upload 1 video. A poster image will be generated from Cloudinary.";
  }else if(kind==="audio"){
    file.accept="audio/*";
    hint.textContent="Upload 1 audio / voice-note file.";
  }else{
    file.accept="";
    hint.textContent="";
  }
}


async function postTalkAction(params){
  if(!C.appsScriptUrl){
    throw new Error("Apps Script URL is missing.");
  }

  const body=new URLSearchParams(params);
  const action=clean(params&&params.action);
  const postUrl=action
    ? C.appsScriptUrl + (C.appsScriptUrl.includes("?") ? "&" : "?") + "action=" + encodeURIComponent(action)
    : C.appsScriptUrl;

  const response=await fetch(postUrl,{
    method:"POST",
    headers:{
      "Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"
    },
    body:body.toString(),
    cache:"no-store"
  });

  const raw=await response.text();

  let result=null;
  try{
    result=JSON.parse(raw);
  }catch(e){
    // Common case when doPost does not route the new action and returns HTML/plain text.
    const preview=clean(raw).slice(0,180);
    throw new Error(
      preview
        ? `Talk backend did not return JSON: ${preview}`
        : "Talk backend returned an empty response."
    );
  }

  if(!(result.success===true||result.ok===true)){
    throw new Error(result.message||result.error||"Talk backend rejected the request.");
  }

  return result;
}


function sleep(ms){
  return new Promise(resolve=>setTimeout(resolve,ms));
}

function sameTalkMessage(row, expected){
  return clean(row["Author ID"])===clean(expected.authorId)
    && messageType(row)===clean(expected.type).toLowerCase()
    && messageText(row)===clean(expected.message)
    && (!expected.mediaUrl || mediaUrl(row)===clean(expected.mediaUrl));
}

async function waitForSavedTalkMessage(expected, attempts=10){
  for(let i=0;i<attempts;i++){
    await sleep(i===0?1000:1400);
    try{
      const rows=await fetchSheet(C.talkMessagesSheetName||"Talk Messages");
      if((rows||[]).some(row=>sameTalkMessage(row,expected))){
        data["Talk Messages"]=rows||[];
        return true;
      }
    }catch(e){
      console.warn("Talk: polling sheet after save failed",e);
    }
  }
  return false;
}

async function fireTalkPostNoCors(params){
  if(!C.appsScriptUrl){
    throw new Error("Apps Script URL is missing.");
  }

  const action=clean(params&&params.action);
  const postUrl=action
    ? C.appsScriptUrl + (C.appsScriptUrl.includes("?") ? "&" : "?") + "action=" + encodeURIComponent(action)
    : C.appsScriptUrl;

  // Mobile-safe fallback:
  // submit a normal HTML form into a hidden iframe.
  // This avoids fetch/CORS/redirect quirks seen on iPhone/Android browsers.
  const iframeName="talkPostSink_"+Date.now()+"_"+Math.random().toString(36).slice(2);
  const iframe=document.createElement("iframe");
  iframe.name=iframeName;
  iframe.hidden=true;
  iframe.setAttribute("aria-hidden","true");

  const form=document.createElement("form");
  form.method="POST";
  form.action=postUrl;
  form.target=iframeName;
  form.hidden=true;
  form.acceptCharset="UTF-8";

  Object.entries(params||{}).forEach(([key,value])=>{
    const input=document.createElement("input");
    input.type="hidden";
    input.name=key;
    input.value=value==null?"":String(value);
    form.appendChild(input);
  });

  document.body.appendChild(iframe);
  document.body.appendChild(form);

  try{
    form.submit();
    // Give Safari/Chrome mobile enough time to actually dispatch the POST
    // before verification starts.
    await sleep(1200);
  }finally{
    setTimeout(()=>{
      try{ form.remove(); }catch(e){}
      try{ iframe.remove(); }catch(e){}
    },5000);
  }
}

async function submitTalkMessage(){
  const status=$("#talkComposeStatus");
  const send=$("#talkComposeSend");

  if(!loggedInUser||!currentUser||!canPostToRoom(currentUser)){
    status.textContent="Login as this profile first.";
    return;
  }

  const type=$("#talkComposeType").value;
  const text=clean($("#talkComposeText").value);
  const file=$("#talkComposeMedia").files[0]||null;
  const kind=mediaKindForTalk(type);

  if(type==="Text"&&!text){
    status.textContent="Write a message first.";
    return;
  }

  if(kind!=="none"&&!file){
    status.textContent=`${type} needs one media file.`;
    return;
  }

  if(kind==="image"&&!file.type.startsWith("image/")){
    status.textContent="Choose an image file.";
    return;
  }

  if(kind==="video"&&!file.type.startsWith("video/")){
    status.textContent="Choose a video file.";
    return;
  }

  if(kind==="audio"&&!file.type.startsWith("audio/")){
    status.textContent="Choose an audio file.";
    return;
  }

  send.disabled=true;
  const old=send.textContent;

  let mediaUrl="";
  let posterUrl="";
  let voiceDuration="";

  try{
    // STEP 1: upload media when needed
    if(file){
      send.textContent="Uploading…";
      status.textContent="1/2 Uploading media to Cloudinary…";

      try{
        const upload=await uploadTalkMedia(file);
        mediaUrl=upload.url;

        if(type==="Video")posterUrl=cloudinaryVideoPoster(mediaUrl);
        if(type==="Voice Note"&&upload.duration){
          voiceDuration=String(Math.round(Number(upload.duration)));
        }
      }catch(uploadError){
        console.error("Talk media upload failed:",uploadError);
        throw new Error(`Media upload failed: ${uploadError.message||uploadError}`);
      }
    }

    // STEP 2: save the message row
    send.textContent="Saving…";
    status.textContent=file
      ?"2/2 Saving message to Talk Messages…"
      :"Saving message to Talk Messages…";

    const savePayload={
      action:"createTalkMessage",
      email:loggedInUser.Email||"",
      authorId:currentUser["User ID"]||"",
      type,
      message:text,
      mediaUrl,
      posterUrl,
      duration:voiceDuration,
      status:"Published"
    };

    try{
      await postTalkAction(savePayload);
    }catch(saveError){
      const msg=String(saveError?.message||saveError||"");
      const redirectish=/unknown (?:get|post) action|did not return json|failed to fetch|network/i.test(msg);

      if(!redirectish)throw saveError;

      // Apps Script can occasionally surface its redirect as a GET response
      // after a media POST. Retry as a simple no-CORS POST and verify from Sheet.
      status.textContent="Finishing message save…";
      try{
        await fireTalkPostNoCors(savePayload);
      }catch(e){
        console.warn("Talk no-cors retry failed",e);
      }

      const found=await waitForSavedTalkMessage({
        authorId:savePayload.authorId,
        type:savePayload.type,
        message:savePayload.message,
        mediaUrl:savePayload.mediaUrl
      });

      if(!found){
        throw new Error(
          file
            ?"Media uploaded, but the message was not found in Talk Messages."
            :"Message was not found in Talk Messages."
        );
      }
    }

    status.textContent="Sent ♡";
    $("#talkComposeText").value="";
    $("#talkComposeMedia").value="";

    // Refresh from the public sheet.
    try{
      const rows=await fetchSheet(C.talkMessagesSheetName||"Talk Messages");
      data["Talk Messages"]=rows||[];
    }catch(refreshError){
      console.warn("Talk message saved, but sheet refresh failed:",refreshError);
    }

    messages=visible(data["Talk Messages"]||[]);
    demoMessages=visible(sampleMessages(users));
    renderList();

    const roomUser=currentUser;
    renderRoom(roomUser);

    setTimeout(()=>{
      $("#talkComposeModal").hidden=true;
    },350);

  }catch(e){
    console.error("Talk submit failed:",e);
    status.textContent=e.message||"Could not send the message.";
  }finally{
    send.disabled=false;
    send.textContent=old;
  }
}

function renderList(){
  const list=$("#talkList");
  if(!users.length){
    list.innerHTML='<p class="empty">No official profiles found yet.</p>';
    return;
  }

  list.innerHTML=users.map(u=>{
    const uid=clean(u["User ID"]);
    const own=sortMessages(messages.filter(m=>clean(m["Author ID"])===uid));
    const demo=demoMessages.find(m=>clean(m["Author ID"])===uid);
    const last=own[own.length-1]||demo;

    return `<button class="talk-person" type="button" data-talk-user="${esc(uid)}">
      <img class="talk-avatar" src="${esc(img(u.Photo))}" alt="">
      <span class="talk-person-main">
        <span class="talk-person-name">${esc(authorName(u))}${verified(u)?'<span class="talk-verified">✓</span>':''}</span>
        <span class="talk-preview">${esc(preview(last))}</span>
      </span>
      <span class="talk-chevron">›</span>
    </button>`;
  }).join("");
}

function waveform(){
  const heights=[8,16,23,12,27,18,10,24,29,14,21,9,26,17,12,23,28,15,20,8];
  return heights.map(h=>`<i style="height:${h}px"></i>`).join("");
}

function messageContent(m){
  const type=messageType(m);
  const text=messageText(m);

  if(type==="photo"||type==="image"){
    const src=mediaUrl(m);
    return `
      ${src?`<img class="message-media" src="${esc(src)}" alt="">`:""}
      ${text?`<div class="message-caption" style="margin-top:10px">${esc(text)}</div>`:""}
    `;
  }

  if(type==="video"){
    const src=posterUrl(m);
    return `
      <div class="video-wrap">
        ${src?`<img class="message-media" src="${esc(src)}" alt="">`:""}
        <span class="video-play">▶</span>
      </div>
      ${text?`<div class="message-caption" style="margin-top:10px">${esc(text)}</div>`:""}
    `;
  }

  if(type.includes("voice")||type==="audio"){
    return `
      <div class="voice-note">
        <span class="voice-icon">♪</span>
        <span class="voice-wave">${waveform()}</span>
        <span class="voice-duration">${esc(duration(m))}</span>
      </div>
      ${text?`<div class="message-caption" style="margin-top:10px">${esc(text)}</div>`:""}
    `;
  }

  return `<div class="message-caption">${esc(text||"…")}</div>`;
}


function talkThemeForUser(u){
  const name=authorName(u).toLowerCase().replace(/\s+/g," ").trim();

  const FEMALE=new Set([
    "jeniffer",
    "jeniffer nora",
    "helena",
    "ranu",
    "nona",
    "gadis"
  ]);

  const MALE=new Set([
    "manu",
    "atharya",
    "niki",
    "ed"
  ]);

  if(FEMALE.has(name))return"female";
  if(MALE.has(name))return"male";

  const id=clean(u&&u["User ID"]).toLowerCase();

  const femaleIds=["jeniffer","helena","ranu","nona","gadis"];
  const maleIds=["manu","atharya","niki","ed"];

  if(femaleIds.some(key=>id.includes(key)))return"female";
  if(maleIds.some(key=>id.includes(key)))return"male";

  return"female";
}

function applyTalkTheme(u){
  const room=document.querySelector(".talk-room");
  if(!room)return;
  room.classList.remove("theme-female","theme-male");
  room.classList.add(`theme-${talkThemeForUser(u)}`);
}

function renderRoom(u){
  applyTalkTheme(u);
  currentUser=u;
  document.body.classList.add("room-open");
  $("#talkRoom").setAttribute("aria-hidden","false");
  $("#roomAvatar").src=img(u.Photo);
  $("#roomName").textContent=authorName(u);
  $("#roomRole").textContent=authorRole(u);
  $("#roomVerified").style.display=verified(u)?"inline-grid":"none";
  updateRoomComposerState();

  const own=sortMessages(messages.filter(m=>clean(m["Author ID"])===clean(u["User ID"])));
  $("#roomMessages").innerHTML=own.length?own.map((m,i)=>`
    <article class="message">
      <img class="message-avatar" src="${esc(img(u.Photo))}" alt="">
      <div class="message-stack">
        <div class="message-author">${esc(authorName(u))}</div>
        <div class="message-bubble">${messageContent(m)}</div>
        <span class="message-time">${esc(clean(m.Time)||clean(m.Date))}</span>
        <div class="message-actions">
          ${canShareTalkImage(loggedInUser)?`<button class="share-message" type="button" data-share-message="${esc(m["Message ID"]||String(i))}">Share image ↗</button>`:""}
          ${canDeleteTalkMessage(m)?`<button class="delete-message" type="button" data-delete-message="${esc(m["Message ID"]||String(i))}">Delete</button>`:""}
        </div>
      </div>
    </article>
  `).join(""):'<p class="empty">No messages here yet.</p>';

  const url=new URL(location.href);
  url.searchParams.set("with",clean(u["User ID"]));
  history.replaceState(null,"",url);
  scrollTo(0,0);
}

function closeRoom(){
  currentUser=null;
  document.body.classList.remove("room-open");
  $("#talkRoom").setAttribute("aria-hidden","true");
  const url=new URL(location.href);
  url.searchParams.delete("with");
  history.replaceState(null,"",url);
  scrollTo(0,0);
}

function rounded(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);ctx.lineTo(x+w-rr,y);ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
  ctx.lineTo(x+w,y+h-rr);ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);
  ctx.lineTo(x+rr,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-rr);
  ctx.lineTo(x,y+rr);ctx.quadraticCurveTo(x,y,x+rr,y);ctx.closePath();
}

async function loadImage(src){
  if(!src)return null;
  return await new Promise(resolve=>{
    const im=new Image();
    im.crossOrigin="anonymous";
    im.onload=()=>resolve(im);
    im.onerror=()=>resolve(null);
    im.src=src;
  });
}

function cover(ctx,im,x,y,w,h){
  if(!im)return;
  const s=Math.max(w/im.width,h/im.height);
  const dw=im.width*s,dh=im.height*s;
  ctx.drawImage(im,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
}

function wrap(ctx,text,maxW){
  const words=String(text||"").split(/\s+/),lines=[];let line="";
  for(const word of words){
    const test=line?`${line} ${word}`:word;
    if(ctx.measureText(test).width>maxW&&line){lines.push(line);line=word}else line=test;
  }
  if(line)lines.push(line);
  return lines;
}


async function getChatSaveStatus(){
  const now=new Date();

  const time=now.toLocaleTimeString("en-US",{
    hour:"numeric",
    minute:"2-digit",
    hour12:true
  });

  let batteryLevel=null;
  let charging=false;

  try{
    if(navigator.getBattery){
      const battery=await navigator.getBattery();
      batteryLevel=Math.round((battery.level||0)*100);
      charging=!!battery.charging;
    }
  }catch(e){
    console.warn("Battery API unavailable",e);
  }

  if(batteryLevel===null || !Number.isFinite(batteryLevel)){
    batteryLevel=78;
  }

  return {time,batteryLevel,charging};
}

function drawIOSStatusBar(ctx,status,W){
  const ink="#2A1718";

  ctx.save();
  ctx.fillStyle=ink;
  ctx.textBaseline="middle";

  // realtime local time from the user's device
  ctx.font='700 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial';
  ctx.textAlign="left";
  ctx.fillText(status.time,72,62);

  // cellular signal
  const sx=W-252;
  const sy=62;
  ctx.fillStyle=ink;
  [8,13,18,23].forEach((h,i)=>{
    ctx.beginPath();
    ctx.roundRect(sx+i*13,sy-h/2,7,h,2);
    ctx.fill();
  });

  // Wi-Fi icon
  const wx=W-176;
  ctx.strokeStyle=ink;
  ctx.lineWidth=4;
  ctx.lineCap="round";

  ctx.beginPath();
  ctx.arc(wx,sy+2,24,Math.PI*1.18,Math.PI*1.82);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(wx,sy+4,15,Math.PI*1.18,Math.PI*1.82);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(wx,sy+6,6,Math.PI*1.18,Math.PI*1.82);
  ctx.stroke();

  // battery percentage
  ctx.fillStyle=ink;
  ctx.font='600 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial';
  ctx.textAlign="right";
  ctx.fillText(`${status.batteryLevel}%`,W-83,62);

  // battery shell
  const bx=W-70, by=49, bw=34, bh=22;
  ctx.lineWidth=2.5;
  ctx.strokeStyle=ink;
  rounded(ctx,bx,by,bw,bh,5);
  ctx.stroke();

  ctx.fillStyle=ink;
  ctx.fillRect(bx+bw+3,by+7,3,8);

  const innerPad=3;
  const fillW=(bw-innerPad*2)*Math.max(0,Math.min(1,status.batteryLevel/100));
  ctx.fillStyle=status.charging ? "#7A0F24" : ink;
  rounded(ctx,bx+innerPad,by+innerPad,Math.max(2,fillW),bh-innerPad*2,3);
  ctx.fill();

  ctx.restore();
}

async function shareMessage(m,u){
  const W=1080,H=1920;
  const c=document.createElement("canvas");
  c.width=W;
  c.height=H;
  const ctx=c.getContext("2d");
  const roomTheme=talkThemeForUser(u);

  const cream="#FFF9F4";
  const warm="#F8F0E6";
  const blush="#FBE3E8";
  const bubbleBottom="#F3AFC0";
  const maroon="#7A0F24";
  const ink="#2A1718";
  const muted="#7B666B";
  const cyan="#44B8DB";

  // LIVE-ROOM-LIKE BACKGROUND, matching the selected profile theme
  const bg=ctx.createLinearGradient(0,0,0,H);

  if(roomTheme==="male"){
    bg.addColorStop(0,"#F8FBFF");
    bg.addColorStop(.42,"#DCEAFF");
    bg.addColorStop(.76,"#F9FBFF");
    bg.addColorStop(1,warm);
  }else{
    bg.addColorStop(0,"#FFF7F6");
    bg.addColorStop(.42,"#FAD4DE");
    bg.addColorStop(.76,"#FFF8F3");
    bg.addColorStop(1,warm);
  }

  ctx.fillStyle=bg;
  ctx.fillRect(0,0,W,H);

  let glow=ctx.createRadialGradient(220,300,0,220,300,430);
  glow.addColorStop(
    0,
    roomTheme==="male"
      ?"rgba(186,218,255,.48)"
      :"rgba(255,170,195,.48)"
  );
  glow.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);

  glow=ctx.createRadialGradient(870,580,0,870,580,420);
  glow.addColorStop(
    0,
    roomTheme==="male"
      ?"rgba(88,136,205,.10)"
      :"rgba(201,47,69,.10)"
  );
  glow.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);

  // Clean share image: no phone status bar/signal/battery.

  // FRAME
  ctx.strokeStyle="rgba(42,23,24,.82)";
  ctx.lineWidth=4;
  rounded(ctx,38,34,W-76,H-68,48);
  ctx.stroke();

  ctx.strokeStyle="rgba(122,15,36,.16)";
  ctx.lineWidth=2;
  rounded(ctx,50,46,W-100,H-92,40);
  ctx.stroke();

  // HEADER
  ctx.fillStyle=ink;
  ctx.font="700 46px Arial";
  ctx.fillText("←",76,158);

  const av=await loadImage(img(u.Photo));
  if(av){
    ctx.save();
    ctx.beginPath();
    ctx.arc(176,137,43,0,Math.PI*2);
    ctx.clip();
    cover(ctx,av,133,94,86,86);
    ctx.restore();
  }

  const displayName=authorName(u);
  ctx.fillStyle=ink;
  ctx.font="700 34px Arial";
  ctx.fillText(displayName,244,136);

  if(verified(u)){
    const nameW=ctx.measureText(displayName).width;
    const vx=244+nameW+24, vy=125;
    ctx.fillStyle=cyan;
    ctx.beginPath();ctx.arc(vx,vy,14,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff";
    ctx.font="700 16px Arial";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText("✓",vx,vy+1);
    ctx.textAlign="left";
    ctx.textBaseline="alphabetic";
  }

  ctx.fillStyle=muted;
  ctx.font="400 21px Arial";
  ctx.fillText(authorRole(u),244,168);

  ctx.fillStyle=ink;
  ctx.font="700 44px Arial";
  ctx.fillText("⋮",944,156);

  ctx.strokeStyle="rgba(122,15,36,.16)";
  ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(68,208);ctx.lineTo(W-68,208);ctx.stroke();

  // MESSAGE HEADER
  const avatarX=118, avatarY=318;
  if(av){
    ctx.save();
    ctx.beginPath();ctx.arc(avatarX,avatarY,30,0,Math.PI*2);ctx.clip();
    cover(ctx,av,avatarX-30,avatarY-30,60,60);
    ctx.restore();
  }

  ctx.fillStyle=ink;
  ctx.font="700 24px Arial";
  ctx.fillText(displayName,160,300);

  const type=messageType(m);
  const bubbleX=160;
  const bubbleY=326;
  const maxBubbleW=760;
  const padX=28;
  const padY=23;

  let bubbleW=0, bubbleH=0;
  let textLines=[];
  let mediaImage=null;
  let mediaDrawW=0, mediaDrawH=0;
  let captionLines=[];

  const liveFontSize=40;
  const liveLineHeight=52;

  if(type==="text"||!type){
    ctx.font=`400 ${liveFontSize}px -apple-system, BlinkMacSystemFont, "Apple Color Emoji", "Segoe UI Emoji", Arial`;
    textLines=wrap(ctx,messageText(m)||"…",690);
    const widest=Math.max(...textLines.map(line=>ctx.measureText(line).width),80);
    bubbleW=Math.min(maxBubbleW,Math.max(160,Math.ceil(widest)+padX*2));
    bubbleH=padY*2+(textLines.length*liveLineHeight)-8;
  }else if(type==="photo"||type==="image"||type==="video"){
    const src=type==="video"?posterUrl(m):mediaUrl(m);
    mediaImage=await loadImage(src);

    const innerMaxW=716;
    const innerMaxH=800;

    if(mediaImage){
      const ratio=mediaImage.naturalWidth/mediaImage.naturalHeight;
      mediaDrawW=innerMaxW;
      mediaDrawH=mediaDrawW/ratio;

      if(mediaDrawH>innerMaxH){
        mediaDrawH=innerMaxH;
        mediaDrawW=mediaDrawH*ratio;
      }
    }else{
      mediaDrawW=innerMaxW;
      mediaDrawH=480;
    }

    const cap=messageText(m);
    if(cap){
      ctx.font='400 31px -apple-system, BlinkMacSystemFont, "Apple Color Emoji", "Segoe UI Emoji", Arial';
      captionLines=wrap(ctx,cap,Math.max(260,mediaDrawW-20));
    }

    bubbleW=Math.min(maxBubbleW,Math.max(260,mediaDrawW+36));
    bubbleH=18+mediaDrawH+18+(captionLines.length?captionLines.length*42+12:0);
  }else{
    bubbleW=650;
    bubbleH=178+(messageText(m)?70:0);
  }

  // LIVE-LIKE BUBBLE SHADOW
  ctx.save();
  ctx.shadowColor=roomTheme==="male"?"rgba(65,105,165,.18)":"rgba(169,32,70,.18)";
  ctx.shadowBlur=14;
  ctx.shadowOffsetY=8;
  const bubbleGrad=ctx.createLinearGradient(0,bubbleY,0,bubbleY+bubbleH);

  if(roomTheme==="male"){
    bubbleGrad.addColorStop(0,"#FFFFFF");
    bubbleGrad.addColorStop(.28,"#F6FAFF");
    bubbleGrad.addColorStop(.70,"#BFD8FF");
    bubbleGrad.addColorStop(1,"#8EB8F2");
  }else{
    bubbleGrad.addColorStop(0,"#FFFDFB");
    bubbleGrad.addColorStop(.27,"#FFF5F7");
    bubbleGrad.addColorStop(.70,"#F7BFD0");
    bubbleGrad.addColorStop(1,"#EF94AE");
  }
  ctx.fillStyle=bubbleGrad;
  rounded(ctx,bubbleX,bubbleY,bubbleW,bubbleH,30);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle="rgba(42,23,24,.88)";
  ctx.lineWidth=4;
  rounded(ctx,bubbleX,bubbleY,bubbleW,bubbleH,30);
  ctx.stroke();

  // CONTENT
  if(type==="photo"||type==="image"||type==="video"){
    const mx=bubbleX+(bubbleW-mediaDrawW)/2;
    const my=bubbleY+18;

    if(mediaImage){
      ctx.save();
      rounded(ctx,mx,my,mediaDrawW,mediaDrawH,22);
      ctx.clip();
      // Draw exact image ratio — no crop.
      ctx.drawImage(mediaImage,mx,my,mediaDrawW,mediaDrawH);
      ctx.restore();
    }

    if(type==="video"){
      const cx=bubbleX+bubbleW/2, cy=my+mediaDrawH/2;
      ctx.fillStyle="rgba(255,249,244,.94)";
      ctx.strokeStyle="rgba(42,23,24,.65)";
      ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(cx,cy,54,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle=maroon;
      ctx.font="700 43px Arial";
      ctx.fillText("▶",cx-15,cy+15);
    }

    if(captionLines.length){
      ctx.fillStyle=ink;
      ctx.font='400 31px -apple-system, BlinkMacSystemFont, "Apple Color Emoji", "Segoe UI Emoji", Arial';
      const capY=my+mediaDrawH+48;
      captionLines.forEach((line,i)=>{
        ctx.fillText(line,bubbleX+26,capY+i*42);
      });
    }
  }else if(type.includes("voice")||type==="audio"){
    ctx.fillStyle=maroon;
    ctx.beginPath();ctx.arc(bubbleX+66,bubbleY+84,32,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="700 29px Arial";ctx.fillText("♪",bubbleX+56,bubbleY+95);

    for(let i=0;i<28;i++){
      const hh=12+Math.abs(Math.sin(i*.74))*40;
      ctx.fillStyle=maroon;ctx.globalAlpha=.74;
      ctx.fillRect(bubbleX+120+i*14,bubbleY+84-hh/2,5,hh);
    }
    ctx.globalAlpha=1;
    ctx.fillStyle=muted;ctx.font="400 21px Arial";
    ctx.fillText(duration(m),bubbleX+bubbleW-90,bubbleY+92);

    const txt=messageText(m);
    if(txt){
      ctx.fillStyle=ink;ctx.font='400 28px -apple-system, BlinkMacSystemFont, "Apple Color Emoji", "Segoe UI Emoji", Arial';
      ctx.fillText(txt,bubbleX+26,bubbleY+150);
    }
  }else{
    ctx.fillStyle=ink;
    ctx.font=`400 ${liveFontSize}px -apple-system, BlinkMacSystemFont, "Apple Color Emoji", "Segoe UI Emoji", Arial`;
    textLines.forEach((line,i)=>{
      ctx.fillText(line,bubbleX+padX,bubbleY+padY+37+i*liveLineHeight);
    });
  }

  // TIME: close to the bubble like live view
  ctx.fillStyle=muted;
  ctx.font="700 22px Arial";
  ctx.textAlign="right";
  ctx.fillText(clean(m.Time)||clean(m.Date),bubbleX+bubbleW,bubbleY+bubbleH+34);
  ctx.textAlign="left";

  // COMPOSER — closer to footer
  const composerY=H-178;
  ctx.fillStyle="rgba(248,240,230,.92)";
  ctx.fillRect(52,composerY-18,W-104,96);

  ctx.fillStyle=cream;
  ctx.strokeStyle="rgba(42,23,24,.62)";
  ctx.lineWidth=3;
  rounded(ctx,82,composerY,772,66,33);
  ctx.fill();ctx.stroke();

  ctx.fillStyle="#8C7379";
  ctx.font="400 21px Arial";
  ctx.fillText("Enter a message.",116,composerY+41);

  ctx.fillStyle="#F3AFC0";
  ctx.strokeStyle="rgba(42,23,24,.62)";
  ctx.beginPath();ctx.arc(916,composerY+33,33,0,Math.PI*2);ctx.fill();ctx.stroke();

  ctx.fillStyle=maroon;
  ctx.font="700 25px Arial";
  ctx.fillText("➤",904,composerY+42);

  // BOLD, CAPS, CENTERED, CLOSE TO BOTTOM BUT SAFE
  ctx.fillStyle=maroon;
  ctx.font="700 15px Arial";
  ctx.textAlign="center";
  ctx.fillText(
    "JEN PLAY HOUSE APP 2026 — ROLEPLAY PURPOSE",
    W/2,
    H-64
  );
  ctx.textAlign="left";

  const blob=await new Promise((resolve,reject)=>{
    c.toBlob(b=>b?resolve(b):reject(new Error("PNG export failed")),"image/png");
  });

  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  const slug=displayName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  a.href=url;
  a.download=`talk-with-${slug}-${clean(m["Message ID"]||"message")}.png`;
  a.style.display="none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}


async function deleteTalkMessage(messageId){
  const id=clean(messageId);
  const message=messages.find(m=>clean(m["Message ID"])===id);

  if(!message||!canDeleteTalkMessage(message)){
    alert("You don't have permission to delete this message.");
    return;
  }

  if(!window.confirm("Delete this message permanently?"))return;

  try{
    await postTalkAction({
      action:"deleteTalkMessage",
      email:loggedInUser.Email||"",
      messageId:id
    });

    const rows=await fetchSheet(C.talkMessagesSheetName||"Talk Messages");
    data["Talk Messages"]=rows||[];
    messages=visible(data["Talk Messages"]||[]);
    demoMessages=visible(sampleMessages(users));

    renderList();

    if(currentUser){
      const uid=clean(currentUser["User ID"]);
      const u=users.find(x=>clean(x["User ID"])===uid)||currentUser;
      renderRoom(u);
    }
  }catch(err){
    console.error("Delete Talk Message failed:",err);
    alert(err.message||"Could not delete this message.");
  }
}

function bind(){
  document.addEventListener("click",e=>{

    if(e.target.closest("#talkLoginButton")){
      $("#talkAuthModal").hidden=false;
      $("#talkLoginStatus").textContent="";
      $("#talkLoginEmail").focus();
      return;
    }

    if(e.target.closest("#talkLogoutButton")){
      clearTalkSession();
      syncTalkLoginUI();
      return;
    }

    if(e.target.closest("#roomComposeButton")){
      openTalkComposer();
      return;
    }

    const close=e.target.closest("[data-close-modal]");
    if(close){
      const modal=document.getElementById(close.dataset.closeModal);
      if(modal)modal.hidden=true;
      return;
    }
    const person=e.target.closest("[data-talk-user]");
    if(person){
      const u=users.find(x=>clean(x["User ID"])===clean(person.dataset.talkUser));
      if(u)renderRoom(u);
      return;
    }
    if(e.target.closest("#roomClose")){closeRoom();return}
    const del=e.target.closest("[data-delete-message]");
    if(del){
      deleteTalkMessage(del.dataset.deleteMessage);
      return;
    }

    const share=e.target.closest("[data-share-message]");
    if(share&&currentUser){
      if(!canShareTalkImage(loggedInUser)){
        alert("Share Image is available to Usher accounts only.");
        return;
      }
      const own=sortMessages(messages.filter(m=>clean(m["Author ID"])===clean(currentUser["User ID"])));
      const m=own.find((x,i)=>clean(x["Message ID"]||String(i))===clean(share.dataset.shareMessage));
      if(m)shareMessage(m,currentUser).catch(err=>{console.error(err);alert("Could not export this chat image.")});
    }
  });
}

async function init(){
  $("#talkLoginSubmit")?.addEventListener("click",()=>talkLogin($("#talkLoginEmail").value));
  $("#talkLoginEmail")?.addEventListener("keydown",e=>{
    if(e.key==="Enter"){e.preventDefault();$("#talkLoginSubmit").click();}
  });
  $("#talkComposeType")?.addEventListener("change",syncComposeType);
  $("#talkComposeSend")?.addEventListener("click",submitTalkMessage);

  await loadLive();
  users=officialUsers();
  messages=visible(data["Talk Messages"]||[]);
  demoMessages=visible(sampleMessages(users));
  renderList();
  bind();
  await restoreTalkLogin();

  const target=new URL(location.href).searchParams.get("with");
  if(target){
    const u=users.find(x=>clean(x["User ID"])===clean(target));
    if(u)renderRoom(u);
  }
}

init();
})();