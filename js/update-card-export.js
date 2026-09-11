(() => {
  "use strict";

  /*
   * JEN PLAY HOUSE — UPDATES SAVE IMAGE EXPORT ONLY
   * This file does NOT change the visible Updates website UI.
   * Public API preserved:
   *   JenUpdateCardExport.export(update)
   *   JenUpdateCardExport.render(update)
   */

  const CFG = Object.freeze({
    width: 1080,
    side: 56,
    radius: 34,
    footer: 58,
    ink: "#171717",
    muted: "#7A6D70",
    femaleTop: "#FFF6F8",
    femaleBottom: "#F7B8C9",
    maleTop: "#F4F9FF",
    maleBottom: "#B8D8F7",
    border: "#2A2526",
    verified: "#44B8DB",
    footerText: "JEN PLAY HOUSE APP 2026 — ROLEPLAY PURPOSE"
  });

  const get = (obj, keys, fallback = "") => {
    for (const key of keys) {
      const value = obj?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return fallback;
  };

  const clean = v => String(v ?? "").trim();
  const getType = update => clean(get(update,["Post Type","postType","type","Type"],"Text")).toLowerCase();
  const getName = update => clean(get(update,["Author","Author Name","Display Name","displayName","Name","name"],"Jeniffer Nora"));
  const getAvatar = update => clean(get(update,["Author Photo","Avatar","Photo","photo","Profile Photo","profilePhoto"],""));
  const getText = update => clean(get(update,["Text","text","Caption","caption","Post Text","postText"],""));
  const getDate = update => clean(get(update,["Date","date","Created At","createdAt","Timestamp","timestamp"],""));
  const getTime = update => clean(get(update,["Time","time"],""));
  const getThumbnail = update => clean(get(update,["Thumbnail","thumbnail","Poster","poster","Video Thumbnail","videoThumbnail"],""));
  const isVerified = update => ["yes","true","1","verified"].includes(clean(get(update,["Verified","verified"],"yes")).toLowerCase());

  function getMedia(update){
    if(Array.isArray(update?.media)) return update.media.filter(Boolean).map(String).slice(0,4);
    const out=[];
    ["Media 1","Media1","media1","Media 2","Media2","media2","Media 3","Media3","media3","Media 4","Media4","media4"].forEach(k=>{
      const v=update?.[k];
      if(v && !out.includes(String(v))) out.push(String(v));
    });
    return out.slice(0,4);
  }

  function bodyFont(){
    try{return getComputedStyle(document.body).fontFamily||"Arial, sans-serif"}catch{return "Arial, sans-serif"}
  }
  const font=(size,weight=400)=>`${weight} ${size}px ${bodyFont()}`;

  function genderTheme(update){
    const explicit=clean(get(update,["Gender","gender","Sex","sex"],"")).toLowerCase();
    if(/male|man|boy|laki/.test(explicit)) return "male";
    if(/female|woman|girl|perempuan/.test(explicit)) return "female";
    const n=getName(update).toLowerCase();
    const males=["manu","atharya","niki","ed","nathan"];
    const females=["jeniffer","helena","ranu","nona","gadis"];
    if(males.some(x=>n.includes(x))) return "male";
    if(females.some(x=>n.includes(x))) return "female";
    return "female";
  }

  function makeCanvas(w,h){
    const node=document.createElement("canvas"); node.width=w; node.height=h;
    const ctx=node.getContext("2d",{alpha:false});
    return {node,ctx};
  }

  function rounded(ctx,x,y,w,h,r){
    const rr=Math.min(r,w/2,h/2);
    ctx.beginPath(); ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr); ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr); ctx.arcTo(x,y,x+w,y,rr); ctx.closePath();
  }

  async function loadImage(url){
    if(!url) return null;
    return new Promise(resolve=>{const im=new Image(); im.crossOrigin="anonymous"; im.onload=()=>resolve(im); im.onerror=()=>resolve(null); im.src=url;});
  }

  function cover(ctx,im,x,y,w,h){
    if(!im){ctx.fillStyle="rgba(255,255,255,.28)";ctx.fillRect(x,y,w,h);return;}
    const s=Math.max(w/im.width,h/im.height), sw=w/s, sh=h/s, sx=(im.width-sw)/2, sy=(im.height-sh)/2;
    ctx.drawImage(im,sx,sy,sw,sh,x,y,w,h);
  }

  function contain(ctx,im,x,y,w,h){
    if(!im){ctx.fillStyle="rgba(255,255,255,.28)";ctx.fillRect(x,y,w,h);return;}
    const s=Math.min(w/im.width,h/im.height), dw=im.width*s, dh=im.height*s;
    ctx.drawImage(im,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
  }

  function wrap(ctx,text,maxW){
    const paragraphs=String(text||"").split(/\n/), lines=[];
    paragraphs.forEach(p=>{
      if(!p.trim()){lines.push("");return;}
      let line="";
      p.split(/\s+/).forEach(word=>{
        const test=line?`${line} ${word}`:word;
        if(line && ctx.measureText(test).width>maxW){lines.push(line);line=word}else line=test;
      });
      if(line)lines.push(line);
    });
    return lines;
  }

  function themeGradient(ctx,h,theme){
    const g=ctx.createLinearGradient(0,0,0,h);
    if(theme==="male"){g.addColorStop(0,CFG.maleTop);g.addColorStop(1,CFG.maleBottom)}
    else{g.addColorStop(0,CFG.femaleTop);g.addColorStop(1,CFG.femaleBottom)}
    return g;
  }

  function drawCardShell(ctx,w,h,theme){
    ctx.fillStyle="#FFF9F4"; ctx.fillRect(0,0,w,h);
    ctx.save();
    ctx.shadowColor="rgba(42,23,24,.12)";ctx.shadowBlur=22;ctx.shadowOffsetY=10;
    ctx.fillStyle=themeGradient(ctx,h-40,theme); rounded(ctx,28,28,w-56,h-86,CFG.radius);ctx.fill();ctx.restore();
    ctx.strokeStyle=CFG.border;ctx.lineWidth=4;rounded(ctx,28,28,w-56,h-86,CFG.radius);ctx.stroke();
  }

  async function drawHeader(ctx,update,y=66){
    const av=await loadImage(getAvatar(update)); const size=64, x=64;
    ctx.save();ctx.beginPath();ctx.arc(x+size/2,y+size/2,size/2,0,Math.PI*2);ctx.clip();cover(ctx,av,x,y,size,size);ctx.restore();
    const tx=x+size+18;
    ctx.fillStyle=CFG.ink;ctx.font=font(28,700);ctx.fillText(getName(update),tx,y+29);
    if(isVerified(update)){
      const nw=ctx.measureText(getName(update)).width, vx=tx+nw+18,vy=y+21;
      ctx.fillStyle=CFG.verified;ctx.beginPath();ctx.arc(vx,vy,11,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="700 14px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("✓",vx,vy+1);ctx.textAlign="left";ctx.textBaseline="alphabetic";
    }
    const meta=[getDate(update),getTime(update)].filter(Boolean).join(" · ");
    ctx.fillStyle=CFG.muted;ctx.font=font(16,400);ctx.fillText(meta,tx,y+54);
    ctx.fillStyle=CFG.muted;ctx.font="700 34px Arial";ctx.fillText("⋮",975,y+36);
    return y+size;
  }

  function drawCaption(ctx,update,y,w){
    const text=getText(update); if(!text) return y;
    ctx.fillStyle=CFG.ink;ctx.font=font(29,400);
    const lines=wrap(ctx,text,w); const lh=40;
    lines.forEach((line,i)=>ctx.fillText(line,64,y+i*lh));
    return y+lines.length*lh;
  }

  function drawFooter(ctx,w,h){
    ctx.fillStyle="#7A0F24";ctx.font="700 13px Arial";ctx.textAlign="center";ctx.fillText(CFG.footerText,w/2,h-24);ctx.textAlign="left";
  }

  async function renderText(update){
    const probe=document.createElement("canvas").getContext("2d");probe.font=font(29,400);
    const lines=wrap(probe,getText(update),CFG.width-128); const textH=Math.max(1,lines.length)*40;
    const h=Math.max(330,66+64+34+textH+92);
    const {node,ctx}=makeCanvas(CFG.width,h);const theme=genderTheme(update);drawCardShell(ctx,CFG.width,h,theme);
    let y=await drawHeader(ctx,update,66); y+=34; drawCaption(ctx,update,y,CFG.width-128); drawFooter(ctx,CFG.width,h); return node;
  }

  async function renderSinglePhoto(update,url,kind="photo"){
    const im=await loadImage(url); const innerW=CFG.width-128; const ratio=im?.width&&im?.height?im.width/im.height:4/5;
    const mediaH=Math.max(280,Math.min(980,innerW/ratio));
    const probe=document.createElement("canvas").getContext("2d");probe.font=font(29,400);const lines=wrap(probe,getText(update),innerW);const capH=getText(update)?lines.length*40+22:0;
    const h=Math.round(66+64+28+capH+mediaH+96);
    const {node,ctx}=makeCanvas(CFG.width,h);const theme=genderTheme(update);drawCardShell(ctx,CFG.width,h,theme);
    let y=await drawHeader(ctx,update,66);y+=28;if(getText(update)){y=drawCaption(ctx,update,y,innerW)+22;}
    ctx.save();rounded(ctx,64,y,innerW,mediaH,24);ctx.clip();contain(ctx,im,64,y,innerW,mediaH);ctx.restore();
    if(kind==="video"){ctx.fillStyle="rgba(0,0,0,.55)";ctx.beginPath();ctx.arc(CFG.width/2,y+mediaH/2,44,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.beginPath();ctx.moveTo(CFG.width/2-10,y+mediaH/2-18);ctx.lineTo(CFG.width/2+22,y+mediaH/2);ctx.lineTo(CFG.width/2-10,y+mediaH/2+18);ctx.closePath();ctx.fill();}
    drawFooter(ctx,CFG.width,h); return node;
  }

  async function renderTwoPhotos(update,urls){
    const H=1350, W=1080, theme=genderTheme(update), {node,ctx}=makeCanvas(W,H); drawCardShell(ctx,W,H,theme);
    let y=await drawHeader(ctx,update,66);y+=28;if(getText(update)) y=drawCaption(ctx,update,y,W-128)+20;
    const gap=14, x=64, totalW=W-128, cellW=(totalW-gap)/2, footerTop=H-84, mediaH=Math.max(380,footerTop-y-22);
    const ims=await Promise.all(urls.slice(0,2).map(loadImage));
    ims.forEach((im,i)=>{const xx=x+i*(cellW+gap);ctx.save();rounded(ctx,xx,y,cellW,mediaH,22);ctx.clip();cover(ctx,im,xx,y,cellW,mediaH);ctx.restore();});
    drawFooter(ctx,W,H);return node;
  }

  async function renderMasonry(update,urls){
    const W=1080, theme=genderTheme(update), colGap=14, x=64, totalW=W-128, colW=(totalW-colGap)/2;
    const imgs=await Promise.all(urls.slice(0,4).map(loadImage));
    const probe=document.createElement("canvas").getContext("2d");probe.font=font(29,400);const lines=wrap(probe,getText(update),totalW);const capH=getText(update)?lines.length*40+20:0;
    const mediaStart=66+64+28+capH; const cols=[[],[]], heights=[0,0];
    imgs.forEach((im,i)=>{const ratio=im?.width&&im?.height?im.width/im.height:1;const h=Math.max(180,Math.min(620,colW/ratio));const col=heights[0]<=heights[1]?0:1;cols[col].push({im,h});heights[col]+=h+(cols[col].length>1?colGap:0);});
    const H=Math.round(mediaStart+Math.max(...heights)+110);
    const {node,ctx}=makeCanvas(W,H);drawCardShell(ctx,W,H,theme);
    let y=await drawHeader(ctx,update,66);y+=28;if(getText(update)) y=drawCaption(ctx,update,y,totalW)+20;
    cols.forEach((items,col)=>{let yy=y;items.forEach(item=>{const xx=x+col*(colW+colGap);ctx.save();rounded(ctx,xx,yy,colW,item.h,20);ctx.clip();contain(ctx,item.im,xx,yy,colW,item.h);ctx.restore();yy+=item.h+colGap;});});
    drawFooter(ctx,W,H);return node;
  }

  function filename(update,suffix){return `${getName(update)}-${getDate(update)||"update"}-${suffix}`.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90)+".png";}
  const toBlob=node=>new Promise((res,rej)=>node.toBlob(b=>b?res(b):rej(new Error("Could not create image.")),"image/png",1));
  async function save(node,name){const blob=await toBlob(node),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}

  async function render(update={}){
    await document.fonts?.ready;
    const type=getType(update), media=getMedia(update);
    if(type.includes("video")){const src=getThumbnail(update)||media[0];if(!src)throw new Error("Video post needs a thumbnail/poster.");return [await renderSinglePhoto(update,src,"video")];}
    if(type.includes("photo")||type.includes("image")||type.includes("carousel")){
      if(!media.length)throw new Error("Media post has no media.");
      if(media.length===1)return [await renderSinglePhoto(update,media[0],"photo")];
      if(media.length===2)return [await renderTwoPhotos(update,media)];
      return [await renderMasonry(update,media)];
    }
    return [await renderText(update)];
  }

  async function exportUpdate(update={}){
    const outputs=await render(update);for(let i=0;i<outputs.length;i++)await save(outputs[i],filename(update,outputs.length>1?`part-${i+1}`:"update"));
  }

  window.JenUpdateCardExport=Object.freeze({export:exportUpdate,render,config:CFG});
})();
