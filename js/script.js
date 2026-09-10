
function installImageRetryFallback(){
  document.addEventListener('error',e=>{
    const img=e.target;
    if(!(img instanceof HTMLImageElement))return;
    if(img.dataset.retryDone==='1')return;
    const src=img.currentSrc||img.src;
    if(!src)return;
    img.dataset.retryDone='1';
    setTimeout(()=>{
      const sep=src.includes('?')?'&':'?';
      img.src=src+sep+'retry='+Date.now();
    },450);
  },true);
}
installImageRetryFallback();

(()=>{"use strict";
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const C=window.JEN_CONFIG||{}, base=window.JEN_CMS_DATA||{};
let data=JSON.parse(JSON.stringify(base));
const bundledData=JSON.parse(JSON.stringify(data));
if(Array.isArray(bundledData.Updates))bundledData.Updates=normalizeUpdateRows(bundledData.Updates);
if(Array.isArray(data.Updates))data.Updates=normalizeUpdateRows(data.Updates);
try{const x=localStorage.getItem(C.cmsStorageKey);if(x){const o=JSON.parse(x);data={...data,...o}}}catch(e){}
const visible=(rows=[])=>rows.filter(r=>!['hidden','draft','archived'].includes(String(r.Status||'').trim().toLowerCase()));
const img=v=>v||'assets/images/jeniffer.jpg'; const money=n=>'Rp'+Number(n||0).toLocaleString('id-ID');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify=v=>String(v||'').trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
function extractYouTubeId(value){const v=String(value||'').trim();if(!v)return'';if(/^[A-Za-z0-9_-]{11}$/.test(v))return v;try{const u=new URL(v,location.href);if(u.hostname.includes('youtu.be'))return u.pathname.split('/').filter(Boolean)[0]||'';if(u.hostname.includes('youtube.com')){if(u.searchParams.get('v'))return u.searchParams.get('v');const parts=u.pathname.split('/').filter(Boolean);const idx=parts.findIndex(x=>['embed','shorts','live'].includes(x));if(idx>=0&&parts[idx+1])return parts[idx+1]}}catch(e){}const m=v.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);return m?m[1]:''}
function youtubeUrlFor(r){const direct=String(r['YouTube URL']||'').trim();if(direct)return direct;const id=String(r['YouTube Video ID']||'').trim();return id?`https://www.youtube.com/watch?v=${id}`:''}
function shopSlug(r){return String(r.Slug||'').trim()||slugify(r['Product Name'])}
function shopShareUrl(r){const base=(C.baseUrl||location.origin+location.pathname.replace(/\/[^/]*$/,'')).replace(/\/$/,'');return String(r['Share URL']||'').trim()||`${base}/shop/share/${shopSlug(r)}/`}
function setting(k,fb=''){const r=visible(data.Settings).find(x=>x.Key===k);return r?.Value||fb}
function renderHome(){
  const rawTitle=setting('hero_title','Hi, Jeadore ♡');
  const cleanTitle=String(rawTitle||'').replace(/\s*[♡♥❤]\s*$/,'').trim()||'Hi, Jeadore';
  const hasHeart=/[♡♥❤]\s*$/.test(String(rawTitle||''));
  $('#homeTitle').innerHTML=`<span class="home-title-text">${escape(cleanTitle)}</span>${hasHeart?'<span class="home-title-heart" aria-hidden="true">♡</span>':''}`;
  $('#homeDescription').textContent=setting('hero_description','You’ve entered Jeniffer Nora’s universe.');
  $('#homeLabel').textContent=setting('hero_label','Welcome to the universe');
  const staticHero=img(setting('hero_image'));
  const desktopGif=setting('hero_gif_desktop','assets/images/hero/jeniffer-home-desktop.gif');
  const isMobile=window.matchMedia('(max-width: 700px)').matches;
  // V21.7: mobile intentionally keeps the same LANDSCAPE hero asset as desktop.
  const mobileGif=desktopGif;
  const gif=desktopGif;
  $('#homeBackground').style.backgroundImage=`url("${img(gif)}"), url("${staticHero}")`;
  document.body.classList.remove('hero-mobile-fit','hero-mobile-cover');
  if(isMobile){
    const probe=new Image();
    probe.onload=()=>{document.body.classList.remove('hero-mobile-fit');document.body.classList.add('hero-mobile-cover')};
    probe.onerror=()=>{document.body.classList.remove('hero-mobile-cover');document.body.classList.add('hero-mobile-fit')};
    probe.src=desktopGif;
  }
}
function warmCriticalAvatars(){
  const urls=[...new Set((data.Users||[])
    .filter(u=>String(u.Status||'').toLowerCase()==='active')
    .map(u=>img(u.Photo))
    .filter(Boolean))];
  const run=()=>urls.forEach((src,index)=>{
    const probe=new Image();
    probe.decoding='async';
    try{probe.fetchPriority=index<4?'high':'low';}catch(e){}
    probe.src=src;
  });
  // Hero gets the network first; avatars are warmed immediately after.
  if('requestIdleCallback' in window) requestIdleCallback(run,{timeout:700});
  else setTimeout(run,180);
}

let _heroMobileState=window.matchMedia('(max-width: 700px)').matches;
window.addEventListener('resize',()=>{
  const next=window.matchMedia('(max-width: 700px)').matches;
  if(next!==_heroMobileState){_heroMobileState=next;renderHome();}
});


function parseCsv(text){
  const rows=[];let row=[],cell='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(q){if(c==='"'&&n==='"'){cell+='"';i++;}else if(c==='"'){q=false;}else cell+=c;}else{if(c==='"')q=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=c;}}
  if(cell.length||row.length){row.push(cell.replace(/\r$/,''));rows.push(row)}
  return rows;
}
async function fetchLiveSheetRows(sheetName,{fresh=false}={}){
  const sheetId=String(C.liveSheetId||'').trim();
  if(!sheetId||!sheetName)return null;

  const key=`jen-live:${sheetId}:${sheetName}`;
  const ttl=/Users/i.test(sheetName)?300000:45000;

  if(!fresh){
    try{
      const cached=JSON.parse(sessionStorage.getItem(key)||'null');
      if(cached&&Date.now()-cached.time<ttl&&Array.isArray(cached.rows))return cached.rows;
    }catch(e){}
  }

  const sheet=encodeURIComponent(sheetName);
  const cacheBust=fresh?`&_=${Date.now()}`:'';
  const url=`https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:csv&sheet=${sheet}${cacheBust}`;

  if(fresh){
    try{sessionStorage.removeItem(key);}catch(e){}
  }

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  const r=await fetch(url,{cache:fresh?'no-store':'default',signal:controller.signal});
  clearTimeout(timer);
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const table=parseCsv(await r.text());
  if(table.length<2)return [];
  const headers=table[0].map(x=>String(x||'').trim());
  const rows=table.slice(1)
    .filter(cols=>cols.some(v=>String(v||'').trim()))
    .map(cols=>Object.fromEntries(headers.map((h,i)=>[h,String(cols[i]??'').trim()])));
  try{sessionStorage.setItem(key,JSON.stringify({time:Date.now(),rows}));}catch(e){}
  return rows;
}

async function fetchUpdatesFromBackend(){
  const endpoint=String(C.appsScriptUrl||'').trim();
  if(!endpoint)return null;

  const url=`${endpoint}${endpoint.includes('?')?'&':'?'}action=getUpdates&_=${Date.now()}`;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);

  try{
    const response=await fetch(url,{
      method:'GET',
      cache:'no-store',
      signal:controller.signal,
      redirect:'follow'
    });

    if(!response.ok)throw new Error(`HTTP ${response.status}`);

    const payload=await response.json();
    if(!payload || payload.success!==true || !Array.isArray(payload.rows)){
      throw new Error(payload?.message||'Invalid Updates response');
    }

    return normalizeUpdateRows(payload.rows);
  }finally{
    clearTimeout(timer);
  }
}

async function fetchFreshUpdatesRows(){
  // Primary source: Apps Script backend (same source that writes Updates).
  try{
    const rows=await fetchUpdatesFromBackend();
    if(Array.isArray(rows))return rows;
  }catch(e){
    console.warn('Updates backend reader unavailable; falling back to Sheet reader.',e);
  }

  // Safe fallback: existing Google Sheet GViz reader.
  return fetchLiveSheetRows('Updates',{fresh:true});
}

function mergeUpdateRows(...groups){
  const byId=new Map();
  const noId=[];

  groups.flat().filter(Boolean).map(normalizeUpdateRow).forEach((row,idx)=>{
    const id=String(row['Update ID']||'').trim();

    if(id){
      // Later groups win: live backend data overrides bundled copies.
      byId.set(id,{...row});
    }else{
      noId.push({...row,__mergeIndex:idx});
    }
  });

  return [
    ...byId.values(),
    ...noId.map(({__mergeIndex,...row})=>row)
  ];
}

async function loadLiveSheetData(){
  const tasks=[];
  const newsName=C.newsSheetName||'News';
  tasks.push((async()=>{
    try{const rows=await fetchLiveSheetRows(newsName);if(rows&&rows.length)data.News=rows;}
    catch(e){console.warn('Live News sheet unavailable; using bundled CMS fallback.',e)}
  })());
  tasks.push((async()=>{
    try{
      const [updatesResult,usersResult]=await Promise.allSettled([
        fetchFreshUpdatesRows(),
        fetchLiveSheetRows('Users')
      ]);

      if(usersResult.status==='fulfilled' && Array.isArray(usersResult.value) && usersResult.value.length){
        data.Users=usersResult.value;
      }

      if(updatesResult.status==='fulfilled' && Array.isArray(updatesResult.value) && updatesResult.value.length){
        const usable=normalizeUpdateRows(updatesResult.value).filter(r=>
          String(r['Update ID']||'').trim() ||
          String(r['Author ID']||'').trim() ||
          String(r['Text']||'').trim() ||
          String(r['Post Type']||'').trim()
        );

        if(usable.length){
          data.Updates=mergeUpdateRows(
            Array.isArray(bundledData.Updates)?bundledData.Updates:[],
            Array.isArray(data.Updates)?data.Updates:[],
            usable
          );
        }
      }
    }catch(e){
      console.warn('Live Updates/Users unavailable; using bundled CMS fallback.',e);
    }
  })());
  const musicSheets=C.liveMusicSheets||{Albums:'Albums','Korean Albums':'Korean Albums',Singles:'Singles'};
  for(const [key,sheetName] of Object.entries(musicSheets)){
    tasks.push((async()=>{
      try{const rows=await fetchLiveSheetRows(sheetName);if(rows&&rows.length)data[key]=rows;}
      catch(e){console.warn(`Live ${sheetName} sheet unavailable; using bundled CMS fallback.`,e)}
    })());
  }
  await Promise.all(tasks);
}

function roleplay(r){return (r['Roleplay Artist']||'Jeniffer Nora')+(r['Featured Artist']?` feat. ${r['Featured Artist']}`:'')}
function lyricLines(r){return []}
function fullLyrics(r){return String(r['Full Lyrics']||'').trim()}
function originalCredit(r){return String(r['Original Credit']||r['Original Artist']||'').trim()}
function roleplayCreditLine(r){const credit=originalCredit(r);return `${credit?`Original song by ${credit} · `:''}For roleplay purpose`}
let currentSong=null;
let selectedLyricIndex=0;
let selectedLyricText='';
let currentAlbumName='';
function songCard(r,isAlbum=false){const title=r['Song Title'];return `<article class="single-card"><img class="media-cover" src="${escape(img(r['Cover URL or Path']))}" alt="${escape(title)}" loading="lazy" decoding="async" fetchpriority="low"><p class="card-meta">${escape(isAlbum?r['Release / Album']||'Album':'Single')}</p><h3 class="card-title">${escape(title)}</h3><p class="song-roleplay-name">${escape(roleplay(r))}</p><p class="song-original-credit">${escape(roleplayCreditLine(r))}</p><div class="card-actions"><button type="button" class="play-song" data-song="${escape(title)}">Lyrics / Play</button></div></article>`}
function albumGroups(rows){const map=new Map; visible(rows).forEach(r=>{const k=r['Release / Album']||'Album';if(!map.has(k))map.set(k,[]);map.get(k).push(r)});return [...map.entries()].sort((a,b)=>Number(a[1][0]['Release Order']||0)-Number(b[1][0]['Release Order']||0))}
function renderAlbums(rows,target){$(target).innerHTML=albumGroups(rows).map(([name,tracks])=>{const f=tracks[0];return `<article class="album-card"><img class="media-cover" src="${escape(img(f['Cover URL or Path']))}" alt="${escape(name)}" loading="lazy" decoding="async" fetchpriority="low"><p class="card-meta">${escape(f['Release Label']||'Album')} · ${tracks.length} tracks</p><h3 class="card-title">${escape(name)}</h3><div class="card-actions"><button class="open-album" data-album="${escape(name)}">View Tracklist</button></div></article>`}).join('')||'<p>No releases posted.</p>'}
function renderMusic(){renderAlbums(data.Albums,'#albumList');renderAlbums(data['Korean Albums'],'#koreanAlbumList');$('#singleList').innerHTML=visible(data.Singles).sort((a,b)=>Number(a['Release Order'])-Number(b['Release Order'])).map(r=>songCard(r)).join('')||'<p>No singles posted.</p>'}
function allSongs(){return [...visible(data.Albums),...visible(data['Korean Albums']),...visible(data.Singles)]}
function renderLyricChoices(r){
  const box=$('#lyricChoices');if(!box)return;
  const lyrics=fullLyrics(r);
  box.innerHTML=lyrics?`<div class="full-lyrics-copy" id="fullLyricsText">${escape(lyrics)}</div>`:'<p class="no-lyrics">Full lyrics have not been added to the CMS yet.</p>';
}
function setLyric(index){return}
function syncSelectedLyrics(){const quote=$('#lyricQuote');if(quote)quote.textContent=selectedLyricText||'Highlight a lyric excerpt below.';const status=$('#lyricSelectionStatus');if(status)status.textContent=selectedLyricText?'Selected lyrics added to your card ✓':'Highlight the lyrics you want to use.'}
function openSong(title){const r=allSongs().find(x=>x['Song Title']===title);if(!r)return;currentSong=r;selectedLyricIndex=0;$('#playerSongTitle').textContent=r['Song Title'];$('#playerRoleplayArtist').textContent=roleplay(r);$('#playerOriginalCredit').textContent=originalCredit(r)?`Original song by ${originalCredit(r)}`:'Original credit unavailable';const cover=img(r['Cover URL or Path']);const coverEl=$('#lyricCardCover');if(coverEl)coverEl.src=cover;const bg=r['Lyric Background Image']||r['Cover URL or Path'];$('#lyricBackground').style.backgroundImage=`url("${img(bg)}")`;$('#musicModalBackground').style.backgroundImage=`url("${img(bg)}")`;const direct=youtubeUrlFor(r);const id=extractYouTubeId(r['YouTube Video ID']||direct);$('#youtubePlayer').src=id?`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&playsinline=1`:'';$('#openYouTubeButton').href=direct||'#';$('#openYouTubeButton').style.display=direct?'inline-flex':'none';selectedLyricText='';renderLyricChoices(r);syncSelectedLyrics();$('#musicPlayerModal').classList.add('open')}
function findAlbum(name){for(const key of ['Albums','Korean Albums']){const tracks=visible(data[key]).filter(r=>(r['Release / Album']||'Album')===name).sort((a,b)=>Number(a['Track Number']||0)-Number(b['Track Number']||0));if(tracks.length)return tracks}return []}
function openAlbum(name){const tracks=findAlbum(name);if(!tracks.length)return;currentAlbumName=name;const first=tracks[0];$('#albumDetailCover').src=img(first['Cover URL or Path']);$('#albumDetailLabel').textContent=first['Release Label']||'Album';$('#albumDetailTitle').textContent=name;$('#albumTrackList').innerHTML=tracks.map((r,i)=>`<button type="button" class="album-track-row play-song" data-song="${escape(r['Song Title'])}"><span class="track-number">${String(r['Track Number']||i+1).padStart(2,'0')}</span><span class="track-main"><strong>${escape(r['Song Title'])}</strong><small>${escape(roleplay(r))}</small><small class="track-original-credit">${escape(roleplayCreditLine(r))}</small></span><span class="track-action">Lyrics →</span></button>`).join('');$('#albumDetailModal').classList.add('open')}
function renderSchedule(){const rows=visible(data.Schedule||[]).sort((a,b)=>Number(a.Order)-Number(b.Order));const target=$('#scheduleList');if(!target)return;target.innerHTML=rows.map(r=>`<article class="schedule-row"><div class="schedule-date"><span>${escape(r.Day||'')}</span><strong>${escape(r.Date||'')}</strong></div><div class="schedule-event"><p>${escape(r.Category||'Appearance')}</p><h3>${escape(r['Event Name']||'')}</h3>${r.Details?`<small>${escape(r.Details)}</small>`:''}</div>${r['Link URL']?`<a class="schedule-link" href="${escape(r['Link URL'])}" target="_blank" rel="noopener">${escape(r['Link Text']||'Details')}</a>`:'<span></span>'}</article>`).join('')||'<p>No upcoming schedule.</p>'}
let cart=[]; function saveCart(){localStorage.setItem('jen-cart',JSON.stringify(cart));renderCart()}; try{cart=JSON.parse(localStorage.getItem('jen-cart')||'[]')}catch(e){}
function renderShop(cat='all'){const rows=visible(data.Shop).filter(r=>cat==='all'||String(r.Category).toLowerCase()===cat|| (cat==='merch'&&!/album/i.test(r.Category)));$('#shopProductList').innerHTML=rows.map(r=>`<article class="product-card" data-product-slug="${escape(shopSlug(r))}"><img class="media-cover" src="${escape(img(r['Image URL or Path']))}" alt="${escape(r['Product Name']||'Product')}" loading="lazy" decoding="async" fetchpriority="low"><p class="card-meta">${escape(r.Category)} · ${String(r.Status||'').toLowerCase()==='preorder'?'PRE-ORDER':`Stock ${escape(r.Stock)}`}</p><h3 class="card-title">${escape(r['Product Name'])}</h3><p>${escape(r.Description)}</p><strong>${money(r.Price)}</strong>${/shirt|t-shirt|long sleeve|hoodie/i.test(r['Product Name'])?`<div class="product-size-selector"><label>Size</label><select class="product-size-select" data-product-size="${escape(r['Product ID'])}"><option>S</option><option selected>M</option><option>L</option><option>XL</option></select></div>`:''}<div class="card-actions"><button class="add-cart" data-product="${escape(r['Product ID'])}">Add to Bag</button><button class="share-product" data-share-product="${escape(r['Product ID'])}">Share</button></div></article>`).join('')||'<p>No products posted.</p>'}
async function shareProduct(id){const r=(data.Shop||[]).find(x=>x['Product ID']===id);if(!r)return;const url=shopShareUrl(r);const title=r['Product Name']||'Jeniffer Nora Shop';const text=`${title} — Jeniffer Nora`;if(navigator.share){try{await navigator.share({title,text,url});return}catch(e){if(e&&e.name==='AbortError')return}}try{await navigator.clipboard.writeText(url);alert('Product share link copied.')}catch(e){prompt('Copy this product link:',url)}}
function renderCart(){const box=$('#cartItems');if(!cart.length)box.innerHTML='<p class="empty-cart-message">Your bag is empty.</p>';else box.innerHTML=cart.map((x,i)=>`<div class="cart-item"><img src="${escape(img(x.image))}" loading="lazy" decoding="async"><div class="cart-item-info"><strong>${escape(x.name)}</strong><span class="cart-item-size">${escape(x.size||'')}</span><span>${money(x.price)} × ${x.qty}</span></div><button class="remove-cart" data-i="${i}">×</button></div>`).join(''); const sub=cart.reduce((s,x)=>s+x.price*x.qty,0),tax=Math.round(sub*(C.taxRate||.11)),ship=cart.length?(C.shippingFee||25000):0,total=sub+tax+ship; ['cart','checkout'].forEach(p=>{const a=$(`#${p}Subtotal`),b=$(`#${p}Tax`),c=$(`#${p}Shipping`),d=$(`#${p}Total`);if(a)a.textContent=money(sub);if(b)b.textContent=money(tax);if(c)c.textContent=money(ship);if(d)d.textContent=money(total)});$('#cartCount').textContent=cart.reduce((s,x)=>s+x.qty,0);return {sub,tax,ship,total}}
function renderNews(){const rows=visible(data.News).filter(r=>['posted','published',''].includes(String(r.Status||'').toLowerCase())).sort((a,b)=>Number(a.Order)-Number(b.Order));$('#newsList').innerHTML=rows.map(r=>`<article class="news-card" data-news="${escape(r.Slug)}"><img class="media-cover wide" src="${escape(img(r.Image))}" alt="" loading="lazy" decoding="async" fetchpriority="low"><p class="card-meta">${escape(r.Date)}</p><h3 class="card-title">${escape(r.Title)}</h3><p>${escape(r.Description)}</p></article>`).join('')||'<p>No news posted.</p>'}
function openNews(slug){const r=data.News.find(x=>x.Slug===slug);if(!r)return;$('#newsModalImage').src=img(r.Image);$('#newsModalDate').textContent=r.Date||'';$('#newsModalTitle').textContent=r.Title||'';$('#newsModalDescription').textContent=r.Description||'';$('#newsModalBody').textContent=r.Body||'';$('#newsModal').classList.add('open')}
function renderTeam(){const rows=visible(data['J-TEAM']).filter(r=>['posted','published',''].includes(String(r.Status||'').toLowerCase())).sort((a,b)=>Number(a.Order)-Number(b.Order));$('#teamList').innerHTML=rows.map(r=>`<article class="team-card"><img class="media-cover" src="${escape(img(r.Photo))}" alt="" loading="lazy" decoding="async" fetchpriority="low"><p class="card-meta">${escape(r.Position)}</p><h3 class="card-title">${escape(r.Name)}</h3></article>`).join('')||'<p>Team details coming soon.</p>'}
function renderRates(){const rows=visible(data.Ratecard).filter(r=>['posted','published',''].includes(String(r.Status||'').toLowerCase()));const groups={};rows.forEach(r=>(groups[r.Category]??=[]).push(r));$('#ratecardList').innerHTML=Object.entries(groups).map(([g,items])=>`<section class="ratecard-group"><h3>${escape(g)}</h3>${items.sort((a,b)=>Number(a.Order)-Number(b.Order)).map(r=>`<div class="rate-row"><div><div class="rate-service">${escape(r.Service)}</div><div class="rate-note">${escape(r.Notes)}</div></div><span>${escape(r['Scope / Duration'])}</span><strong>${escape(r['Rate USD'])}</strong><strong>${escape(r['Rate IDR'])}</strong></div>`).join('')}</section>`).join('');const fees=data['Commercial Fees']||[];$('#commercialFees').innerHTML=`<h3>Additional Commercial Fees</h3><ul>${fees.map(x=>`<li>${escape(x)}</li>`).join('')}</ul>`}
function renderWorkWithUs(){const valid=rows=>visible(rows||[]).filter(r=>['posted','published',''].includes(String(r.Status||'').toLowerCase())).sort((a,b)=>(Number(a['Section Order'])||0)-(Number(b['Section Order'])||0)||(Number(a.Order)||0)-(Number(b.Order)||0));const termsGroups={};valid(data['Terms & Condition']).forEach(r=>(termsGroups[r.Section||'General']??=[]).push(r));$('#termsList').innerHTML=Object.entries(termsGroups).map(([name,items])=>`<section class="terms-card" data-section="${escape(name.toLowerCase())}"><h3>${escape(name)}</h3><ul>${items.map(r=>`<li><strong>${escape(r.Item||'')}</strong>${r.Details?`<span class="term-detail">${escape(r.Details)}</span>`:''}</li>`).join('')}</ul></section>`).join('')||'<p>No terms posted.</p>';const riderGroups={};valid(data.Riders).forEach(r=>(riderGroups[r.Section||'General']??=[]).push(r));$('#ridersList').innerHTML=Object.entries(riderGroups).map(([name,items])=>`<section class="work-group"><h3>${escape(name)}</h3>${items.map(r=>`<div class="work-item"><strong>${escape(r.Requirement||'')}</strong><p>${escape(r.Details||'')}</p></div>`).join('')}</section>`).join('')||'<p>No riders posted.</p>';const contacts=valid(data.Contact||[]);$('#workContacts').innerHTML=contacts.map(r=>`<div class="work-contact-row"><span>${escape(r.Role||'J-Team')}</span><strong class="work-contact-account">${escape(r['Name / Account']||'')}</strong><span>${escape(r.Description||'')}</span></div>`).join('')||'<p>Contact details coming soon.</p>'}
function setupExtraUI(){
if(!$('#lyricChoices')){const actions=$('.music-player-actions');actions?.insertAdjacentHTML('beforebegin',`<section class="lyric-selector"><p class="section-label">Choose Lyric</p><div id="lyricChoices" class="lyric-choices"></div></section>`)}
if(!$('#albumDetailModal')){document.body.insertAdjacentHTML('beforeend',`<div class="content-modal" id="albumDetailModal"><div class="content-modal-card album-detail-card"><button class="modal-close-button" id="closeAlbumDetail" type="button">×</button><div class="album-detail-head"><img id="albumDetailCover" class="album-detail-cover" src="" alt=""><div><p class="section-label" id="albumDetailLabel">Album</p><h2 id="albumDetailTitle">Album</h2><p>Select a track to open its lyrics and player.</p></div></div><div id="albumTrackList" class="album-track-list"></div></div></div>`)}
}
function normalizeUpdateKey(value){
  return String(value||'').trim().toLowerCase();
}

function findUpdateAuthor(authorId){
  const key=normalizeUpdateKey(authorId);
  return (data.Users||[]).find(u=>
    normalizeUpdateKey(u['User ID'])===key
  ) || null;
}

function safeUpdateText(row){
  return String(
    row?.Text ??
    row?.['Message / Caption'] ??
    row?.Caption ??
    row?.Message ??
    ''
  ).trim();
}

function safeUpdateType(row){
  return String(
    row?.['Post Type'] ??
    row?.Type ??
    'Update'
  ).trim() || 'Update';
}

const ACTIVE_PORTAL_SESSION_KEY='jeniffer-nora-active-session-v1';

function currentPortalUser(){
  try{
    // Global website session: one successful login is valid across Home, Updates,
    // admin and other pages on this same JEN PLAY HOUSE origin until logout.
    if(localStorage.getItem(ACTIVE_PORTAL_SESSION_KEY)!=='1')return null;
    const u=JSON.parse(localStorage.getItem('jeniffer-nora-admin-session-v1')||'null');
    return u&&u.Email&&u.Role?u:null;
  }catch(e){
    return null;
  }
}

function isAllowedPortalRole(role){
  const value=String(role||'').trim().toLowerCase();
  // Existing backend may store administrative accounts as "Manager".
  // Treat Manager as the Admin-equivalent role, not as a public/visitor role.
  return ['usher','admin','manager','owner'].includes(value);
}

function canManageUpdates(){
  const u=currentPortalUser();
  return !!u && isAllowedPortalRole(u.Role);
}

function updateShareButton(r){
  return canManageUpdates()
    ? `<button class="update-share-x" type="button" data-update-share="${escape(r['Update ID'])}">Share Image ↗</button>`
    : '';
}

function updateDeleteButton(r){
  return canManageUpdates()
    ? `<button class="update-delete-usher" type="button" data-update-delete="${escape(r['Update ID'])}">Delete</button>`
    : '';
}
async function deleteUpdateFromFeed(updateId){
  const u=currentPortalUser();
  if(!u||!canManageUpdates())return;
  if(!confirm(`Delete ${updateId}?`))return;
  const body=new URLSearchParams({action:'deleteUpdate',email:u.Email||'',updateId});
  const r=await fetch((C.appsScriptUrl||'')+'?action=deleteUpdate',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'});
  const j=await r.json();
  if(!j.success)throw new Error(j.message||'Could not delete update');
  data.Updates=(data.Updates||[]).filter(x=>x['Update ID']!==updateId);
  try{sessionStorage.removeItem(`jen-live:${C.liveSheetId}:Updates`)}catch(e){}
  renderUpdates(activeUpdateFilter);
  renderHomeUpdatesOnly();
}

let activeUpdateFilter='all';

function normalizeUpdateRow(raw){
  const src=raw||{};
  const clean={};

  Object.entries(src).forEach(([k,v])=>{
    const key=String(k||'')
      .replace(/^\uFEFF/,'')
      .replace(/\s+/g,' ')
      .trim();
    clean[key]=v;
  });

  const lower={};
  Object.entries(clean).forEach(([k,v])=>{
    lower[k.toLowerCase().replace(/[^a-z0-9]+/g,'')]=v;
  });

  const pick=(...names)=>{
    for(const name of names){
      const exact=clean[name];
      if(exact!==undefined && exact!==null && String(exact).trim()!=='')return exact;
      const key=String(name).toLowerCase().replace(/[^a-z0-9]+/g,'');
      const loose=lower[key];
      if(loose!==undefined && loose!==null && String(loose).trim()!=='')return loose;
    }
    return '';
  };

  return {
    ...clean,
    'Update ID': pick('Update ID','UpdateID','ID','Post ID','PostID'),
    'Author ID': pick('Author ID','AuthorID','User ID','UserID','Author'),
    'Post Type': pick('Post Type','PostType','Type','Update Type'),
    'Text': pick('Text','Caption','Message','Content','Update'),
    'Media 1': pick('Media 1','Media1','Media URL','MediaURL','Photo URL','PhotoURL','Image URL','ImageURL'),
    'Media 2': pick('Media 2','Media2'),
    'Media 3': pick('Media 3','Media3'),
    'Media 4': pick('Media 4','Media4'),
    'Thumbnail': pick('Thumbnail','Thumbnail URL','ThumbnailURL','Poster URL','PosterURL'),
    'Date': pick('Date','Post Date','PostDate'),
    'Time': pick('Time','Post Time','PostTime'),
    'Order': pick('Order','Sort Order','SortOrder'),
    'Status': pick('Status','Post Status','PostStatus'),
    'Pinned': pick('Pinned','Pin','Is Pinned','IsPinned'),
    'Category': pick('Category','Update Category','UpdateCategory')
  };
}

function normalizeUpdateRows(rows){
  return (Array.isArray(rows)?rows:[]).map(normalizeUpdateRow);
}

function getUpdateAuthor(id){return (data.Users||[]).find(x=>x['User ID']===id)||{Name:'J-Team',Position:'',Photo:'assets/images/jeniffer.jpg',Verified:'No'}}
function updateVerified(author){return String(author.Verified||'').toLowerCase()==='yes'?'<span class="verified-badge" aria-label="Verified">✓</span>':''}
function updateComments(id){return visible(data['Update Comments']||[]).filter(x=>x['Update ID']===id).sort((a,b)=>Number(a.Order||0)-Number(b.Order||0))}
function renderUpdateMedia(r){const type=String(r['Post Type']||'Text').toLowerCase(),media=[r['Media 1'],r['Media 2'],r['Media 3'],r['Media 4']].filter(Boolean);if(type==='voice note'){if(!r['Media 1'])return '';return `<div class="voice-note"><button type="button" aria-label="Play voice note">▶</button><audio controls preload="metadata" src="${escape(img(r['Media 1']))}"></audio>${r.Duration?`<span>${escape(r.Duration)}</span>`:''}</div>`}if(type==='video'){if(!r['Media 1'])return '';return `<div class="update-media"><video controls playsinline preload="metadata" ${r.Thumbnail?`poster="${escape(img(r.Thumbnail))}"`:''}><source src="${escape(img(r['Media 1']))}"></video></div>`}if(media.length){if(media.length>1||type==='carousel')return `<div class="update-media update-carousel">${media.map(m=>`<img src="${escape(img(m))}" alt="Update photo" loading="lazy" decoding="async" fetchpriority="low">`).join('')}</div>`;return `<div class="update-media"><img src="${escape(img(media[0]))}" alt="Update photo" loading="lazy" decoding="async" fetchpriority="low"></div>`}return ''}
function renderUpdateComments(id){const rows=updateComments(id);if(!rows.length)return '';return `<div class="update-comments">${rows.map(c=>{const a=getUpdateAuthor(c['Author ID']);return `<div class="update-comment"><img src="${escape(img(a.Photo))}" alt="" loading="lazy" decoding="async"><div class="update-comment-body"><strong>${escape(a.Name)}${updateVerified(a)}</strong><p>${escape(c.Comment||'')}</p></div></div>`}).join('')}</div>`}
function renderUpdates(filter=activeUpdateFilter){
  activeUpdateFilter=filter;
  const rows=visible(data.Updates||[]).filter(r=>{
    if(filter==='all')return true;
    const cat=String(r.Category||'').toLowerCase(),type=String(r['Post Type']||'').toLowerCase();
    if(filter==='media')return ['photo','carousel','video','voice note'].includes(type)||cat==='media';
    return cat===filter;
  }).sort((a,b)=>{
    const pa=String(a.Pinned||'').toLowerCase()==='yes'?1:0,pb=String(b.Pinned||'').toLowerCase()==='yes'?1:0;
    return (pb-pa)||String(b['Update ID']||'').localeCompare(String(a['Update ID']||''));
  });

  const titleMap={
    all:['Community','Jeniffer & J-Team','Choose an official profile, or browse every posted update.','All Updates'],
    artist:['Artist Updates','Jeniffer Nora','Updates posted by Jeniffer Nora.','Artist Updates'],
    'j-team':['From the Team','Updates from J-Team','Choose a team member to filter their updates.','J-Team Updates'],
    media:['Media','Photo, Video & Voice','Official media updates from Jeniffer and J-Team.','Media Updates'],
    notice:['Official Notice','Notices','Official notices from Jeniffer and J-Team.','Notices'],
    schedule:['Schedule','Schedule Updates','Performance, appearance, and schedule moments.','Schedule Updates']
  };
  const copy=titleMap[filter]||titleMap.all;
  const eyebrow=$('#updatesCommunityEyebrow'),communityTitle=$('#updatesCommunityTitle'),communityCopy=$('#updatesCommunityCopy'),feedTitle=$('#updatesFeedTitle');
  if(eyebrow)eyebrow.textContent=copy[0];
  if(communityTitle)communityTitle.textContent=copy[1];
  if(communityCopy)communityCopy.textContent=copy[2];
  if(feedTitle)feedTitle.textContent=copy[3];

  const feed=$('#updatesFeed');
  if(feed)feed.innerHTML=rows.map(r=>{const a=getUpdateAuthor(r['Author ID']);return `<article class="update-post ${String(r.Pinned||'').toLowerCase()==='yes'?'pinned':''}"><div class="update-post-head"><img class="update-post-avatar" src="${escape(img(a.Photo))}" alt="" loading="lazy" decoding="async"><div class="update-post-author"><strong>${escape(a.Name)}${updateVerified(a)}</strong><span>${escape(a.Position||a.Role||'')} · ${escape(r.Date||'')} ${escape(r.Time||'')}</span></div><span class="update-post-type">${escape(r['Post Type']||r.Category||'Update')}</span></div>${r.Text?`<p class="update-post-text">${escape(r.Text)}</p>`:''}${renderUpdateMedia(r)}<div class="update-post-actions"><span>${String(r.Pinned||'').toLowerCase()==='yes'?'Pinned · ':''}${escape(r.Category||'Update')}</span>${updateShareButton(r)}${updateDeleteButton(r)}</div>${renderUpdateComments(r['Update ID'])}</article>`}).join('')||'<p class="updates-empty">No updates posted yet.</p>';

  const authors=$('#updatesAuthors');
  const memberFilters=$('#jteamMemberFilters');
  if(authors){
    if(filter==='j-team'){
      authors.hidden=true;
      authors.innerHTML='';
    }else{
      authors.hidden=false;
      const seen=new Set;
      let list=(data.Users||[]).filter(a=>String(a.Status||'').toLowerCase()==='active'&&String(a.Verified||'').toLowerCase()==='yes'&&rows.some(r=>r['Author ID']===a['User ID']));
      if(filter==='artist')list=list.filter(a=>String(a['User ID']||'').startsWith('JN-')||/artist/i.test(String(a.Role||a.Position||'')));
      authors.innerHTML=list.filter(a=>!seen.has(a['User ID'])&&seen.add(a['User ID'])).map(a=>`<button type="button" class="update-author-bubble" data-author-filter="${escape(a['User ID'])}"><img src="${escape(img(a.Photo))}" alt="" loading="lazy" decoding="async"><span class="update-author-name">${escape(a['Display Name']||a.Name)}${updateVerified(a)}</span></button>`).join('');
    }
  }
  if(memberFilters){
    if(filter==='j-team'){
      const members=(data.Users||[]).filter(a=>String(a.Status||'').toLowerCase()==='active'&&String(a['User ID']||'').startsWith('JT-'));
      memberFilters.hidden=false;
      memberFilters.innerHTML=`<button class="jteam-member-filter jteam-member-bubble active" type="button" data-jteam-author="all"><span class="jteam-all-avatar">J</span><span class="jteam-member-name">All</span></button>`+members.map(a=>`<button class="jteam-member-filter jteam-member-bubble" type="button" data-jteam-author="${escape(a['User ID'])}"><img src="${escape(img(a.Photo))}" alt="${escape(a['Display Name']||a.Name||'J-Team')}" loading="lazy" decoding="async"><span class="jteam-member-name">${escape(a['Display Name']||String(a.Name||'').split(/\s+/)[0])}${updateVerified(a)}</span></button>`).join('');
    }else{
      memberFilters.hidden=true;
      memberFilters.innerHTML='';
    }
  }
}
async function loadCanvasImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=reject;im.src=img(src)})}
function wrapCanvasText(ctx,text,maxWidth){const words=String(text||'').split(/\s+/),lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=word}else line=next}if(line)lines.push(line);return lines}
function canvasToBlob(canvas){return new Promise(resolve=>canvas.toBlob(resolve,'image/png',.95))}
async function buildUpdateShareCard(id){const r=(data.Updates||[]).find(x=>x['Update ID']===id);if(!r)return null;const a=getUpdateAuthor(r['Author ID']);const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');ctx.fillStyle='#f7f7f5';ctx.fillRect(0,0,1080,1350);ctx.fillStyle='#171717';ctx.font='700 42px Arial';ctx.fillText('Jeniffer Nora',70,78);ctx.strokeStyle='#dfdfda';ctx.lineWidth=2;ctx.strokeRect(48,112,984,1190);try{const avatar=await loadCanvasImage(a.Photo);ctx.save();ctx.beginPath();ctx.arc(118,195,44,0,Math.PI*2);ctx.clip();ctx.drawImage(avatar,74,151,88,88);ctx.restore()}catch(e){}ctx.fillStyle='#171717';ctx.font='700 34px Arial';ctx.fillText(a.Name||'Jeniffer Nora',184,190);if(String(a.Verified||'').toLowerCase()==='yes'){const x=Math.min(930,202+ctx.measureText(a.Name||'Jeniffer Nora').width);ctx.fillStyle='#41b7d8';ctx.beginPath();ctx.arc(x,180,11,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='700 14px Arial';ctx.fillText('✓',x-5,185)}ctx.fillStyle='#929292';ctx.font='22px Arial';ctx.fillText(`${a.Position||a.Role||''} · ${r.Date||''} ${r.Time||''}`,184,226);let y=305;ctx.fillStyle='#222';ctx.font='36px Arial';wrapCanvasText(ctx,r.Text||'',880).slice(0,7).forEach(line=>{ctx.fillText(line,82,y);y+=50});const media=[r['Media 1'],r['Media 2'],r['Media 3'],r['Media 4']].filter(Boolean);const type=String(r['Post Type']||'').toLowerCase();if(media.length&&['photo','carousel'].includes(type)){try{const m=await loadCanvasImage(media[0]);const boxY=Math.max(y+25,500),boxH=650,scale=Math.max(900/m.width,boxH/m.height),w=m.width*scale,h=m.height*scale;ctx.save();ctx.beginPath();ctx.rect(90,boxY,900,boxH);ctx.clip();ctx.drawImage(m,90+(900-w)/2,boxY+(boxH-h)/2,w,h);ctx.restore();y=boxY+boxH+40}catch(e){}}else if(type==='video'||type==='voice note'){const boxY=Math.max(y+25,500);ctx.fillStyle='#ececea';ctx.fillRect(90,boxY,900,260);ctx.fillStyle='#171717';ctx.font='700 42px Arial';ctx.fillText(type==='video'?'VIDEO UPDATE':'VOICE NOTE',130,boxY+145);y=boxY+310}ctx.fillStyle='#777';ctx.font='20px Arial';ctx.fillText(`${r.Category||'Update'} · Fictional roleplay artist`,82,1260);ctx.fillStyle='#171717';ctx.font='700 24px Arial';ctx.fillText('Jeniffer Nora',802,1260);return {blob:await canvasToBlob(canvas),canvas,r,a}}
async function shareUpdateToX(id){const card=await buildUpdateShareCard(id);if(!card||!card.blob)return;const file=new File([card.blob],`jeniffer-nora-${slugify(card.r['Update ID']||'update')}.png`,{type:'image/png'});if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:'Jeniffer Nora'});return}catch(e){if(e&&e.name==='AbortError')return}}const link=document.createElement('a');link.download=file.name;link.href=URL.createObjectURL(card.blob);link.click();setTimeout(()=>URL.revokeObjectURL(link.href),2000);alert('Share card saved as an image. Attach the image when posting to X.')}
function handleDeepLinks(){const p=new URLSearchParams(location.search);const song=p.get('song');if(song){setView('music',false);setTimeout(()=>openSong(song),50)}const product=p.get('product');if(product){setView('shop',false);setTimeout(()=>{const card=document.querySelector(`[data-product-slug="${CSS.escape(product)}"]`);if(card){card.classList.add('product-shared-focus');card.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>card.classList.remove('product-shared-focus'),2500)}},100)}const update=p.get('update');if(update)setView('updates',false)}

let updatesPortalRefreshInFlight=null;
async function refreshUpdatesPortal(){
  if(updatesPortalRefreshInFlight)return updatesPortalRefreshInFlight;

  updatesPortalRefreshInFlight=(async()=>{
    try{
      const rows=await fetchFreshUpdatesRows();
      if(Array.isArray(rows)){
        const usable=normalizeUpdateRows(rows).filter(r=>
          String(r['Update ID']||'').trim() ||
          String(r['Author ID']||'').trim() ||
          String(r['Text']||'').trim() ||
          String(r['Post Type']||'').trim()
        );

        // Merge fresh live rows with the bundled/base Updates instead of replacing them.
        // This preserves the previously existing posts while still pulling newly posted rows.
        data.Updates=mergeUpdateRows(
          Array.isArray(bundledData.Updates)?bundledData.Updates:[],
          Array.isArray(data.Updates)?data.Updates:[],
          usable
        );
        renderUpdates(activeUpdateFilter||'all');
        renderHomeUpdatesOnly();
      }
    }catch(e){
      console.warn('Could not refresh Updates portal; keeping current data.',e);
    }finally{
      updatesPortalRefreshInFlight=null;
    }
  })();

  return updatesPortalRefreshInFlight;
}

const routedSections=['home','music','updates','schedule','shop','news','team','signup'];
function setView(id,scroll=true){id=routedSections.includes(id)?id:'home';document.body.classList.add('section-routing-enabled');document.body.classList.toggle('view-home',id==='home');routedSections.forEach(key=>{const el=document.getElementById(key);if(el)el.classList.toggle('active-view',key===id)});$$('.navigation a[href^="#"]').forEach(a=>a.classList.toggle('active-nav',a.getAttribute('href')===`#${id}`));$('#navigation')?.classList.remove('open');if(scroll)window.scrollTo({top:0,behavior:'auto'});if(id==='home'||id==='updates'){
  refreshUpdatesPortal().finally(()=>{
    if(id==='updates')renderUpdates(activeUpdateFilter||'all');
    if(id==='home')renderHomeUpdatesOnly();
  });
}}
function setupSectionRouting(){const initial=(location.hash||'#home').slice(1);setView(initial,false);window.addEventListener('hashchange',()=>setView((location.hash||'#home').slice(1),false));document.addEventListener('click',e=>{const homeTab=e.target.closest('[data-home-update-filter]');if(homeTab){homeUpdateFilter=homeTab.dataset.homeUpdateFilter||'all';homeUpdateAuthor='all';$$('.home-update-tab').forEach(x=>x.classList.toggle('active',x===homeTab));renderHomeUpdatesOnly();return;}const homeAuthor=e.target.closest('[data-home-update-author]');if(homeAuthor){homeUpdateAuthor=homeAuthor.dataset.homeUpdateAuthor||'all';renderHomeUpdatesOnly();return;}const a=e.target.closest('a[href^="#"]');if(!a)return;const id=a.getAttribute('href').slice(1);if(routedSections.includes(id)){e.preventDefault();history.pushState(null,'',`#${id}`);setView(id,true)}})}
let homeUpdateFilter='all';
let homeUpdateAuthor='all';
function homeUpdateUsers(){
  const users=visible(data.Users||[]);
  const artist=users.find(u=>/artist/i.test(String(u.Role||u.Position||'')) || u['User ID']==='JN-001');
  const team=users.filter(u=>/^JT-/i.test(String(u['User ID']||'')) || /j-team|manager|dancer|makeup|photographer|videographer/i.test(String(u.Role||u.Position||'')));
  return {artist,team};
}
function renderHomeUpdateProfiles(){
  const target=$('#homeUpdateProfiles'); if(!target)return;
  const {artist,team}=homeUpdateUsers();
  const profile=(u,active=false)=>`<button type="button" class="home-profile-bubble${active?' active':''}" data-home-update-author="${escape(u['User ID']||'')}"><img src="${escape(img(u.Photo||''))}" alt="" loading="eager" decoding="async" fetchpriority="high"><span>${escape(u['Display Name']||u.Name||'')}</span>${String(u.Verified||'').toLowerCase()==='yes'?'<i>✓</i>':''}</button>`;
  if(homeUpdateFilter==='artist'){
    target.innerHTML=artist?profile(artist,true):'';
    return;
  }
  if(homeUpdateFilter==='j-team'){
    const all=`<button type="button" class="home-profile-bubble home-profile-all${homeUpdateAuthor==='all'?' active':''}" data-home-update-author="all"><span class="home-profile-mark">J</span><span>All</span></button>`;
    target.innerHTML=all+team.map(u=>profile(u,homeUpdateAuthor===u['User ID'])).join('');
    return;
  }
  const people=[artist,...team].filter(Boolean);
  target.innerHTML=people.slice(0,9).map(u=>profile(u,false)).join('');
}
function renderHomeUpdatesOnly(){
  const target=$('#homeUpdatesPreview'); if(!target)return;
  const {artist,team}=homeUpdateUsers();
  const teamIds=new Set(team.map(u=>u['User ID']));
  let rows=visible(data.Updates||[]).filter(r=>{
    if(homeUpdateFilter==='artist') return artist && r['Author ID']===artist['User ID'];
    if(homeUpdateFilter==='j-team'){
      if(homeUpdateAuthor!=='all') return r['Author ID']===homeUpdateAuthor;
      return teamIds.has(r['Author ID']);
    }
    return true;
  }).sort((a,b)=>{const pa=String(a.Pinned||'').toLowerCase()==='yes'?1:0,pb=String(b.Pinned||'').toLowerCase()==='yes'?1:0;return (pb-pa)||String(b['Update ID']||'').localeCompare(String(a['Update ID']||''))}).slice(0,2);
  const label=$('#homeUpdatesLabel'); if(label) label.textContent=homeUpdateFilter==='artist'?'Latest Artist Update':homeUpdateFilter==='j-team'?'Updates from J-Team':'Latest Updates';
  target.innerHTML=rows.map(r=>{const a=getUpdateAuthor(r['Author ID']);const media=[r['Media 1'],r['Media 2'],r['Media 3'],r['Media 4']].filter(Boolean)[0];const type=String(r['Post Type']||'').toLowerCase();return `<article class="home-update-card"><div class="home-update-head"><img src="${escape(img(a.Photo))}" alt="" loading="eager" decoding="async" fetchpriority="high"><div><strong>${escape(a['Display Name']||a.Name)}${updateVerified(a)}</strong><span>${escape(r.Date||'')} ${escape(r.Time||'')}</span></div></div>${r.Text?`<p>${escape(r.Text)}</p>`:''}${media&&['photo','carousel'].includes(type)?`<img class="home-update-media" src="${escape(img(media))}" alt="" loading="lazy" decoding="async" fetchpriority="low">`:''}<a href="#updates" class="home-card-link">Open update →</a></article>`}).join('')||'<p class="loading-text">No updates posted yet.</p>';
  renderHomeUpdateProfiles();
}
function renderHomePreview(){
  const updatesTarget=$('#homeUpdatesPreview'),newsTarget=$('#homeNewsPreview'),scheduleTarget=$('#homeSchedulePreview');
  if(updatesTarget){ renderHomeUpdatesOnly(); }
  if(newsTarget){
    const rows=visible(data.News||[]).filter(r=>['posted','published',''].includes(String(r.Status||'').toLowerCase())).sort((a,b)=>Number(a.Order)-Number(b.Order)).slice(0,2);
    newsTarget.innerHTML=rows.map(r=>`<article class="home-news-card" data-news="${escape(r.Slug)}">${r.Image?`<img src="${escape(img(r.Image))}" alt="" loading="lazy" decoding="async" fetchpriority="low">`:''}<div><span>${escape(r.Date||'')}</span><strong>${escape(r.Title||'News')}</strong></div></article>`).join('')||'<p class="loading-text">No news posted.</p>';
  }
  if(scheduleTarget){
    const rows=visible(data.Schedule||[]).sort((a,b)=>Number(a.Order)-Number(b.Order)).slice(0,3);
    scheduleTarget.innerHTML=rows.map(r=>`<article class="home-schedule-row"><div><span>${escape(r.Day||'')}</span><strong>${escape(r.Date||'')}</strong></div><div><small>${escape(r.Category||'Appearance')}</small><strong>${escape(r['Event Name']||'')}</strong></div></article>`).join('')||'<p class="loading-text">No upcoming schedule.</p>';
  }
}
function renderAll(){renderHome();renderMusic();renderUpdates();renderSchedule();renderShop();renderNews();renderTeam();renderCart();renderHomePreview();$('#currentYear').textContent=new Date().getFullYear()}
function setupAdmin(){}

function captureHighlightedLyrics(){
  const box=$('#fullLyricsText');
  if(!box)return;
  const selection=window.getSelection?.();
  if(!selection||selection.rangeCount===0||selection.isCollapsed)return;
  const range=selection.getRangeAt(0);
  const node=range.commonAncestorContainer.nodeType===1?range.commonAncestorContainer:range.commonAncestorContainer.parentElement;
  if(!node||!box.contains(node))return;
  const text=selection.toString().replace(/\u00a0/g,' ').trim();
  if(!text)return;
  selectedLyricText=text;
  syncSelectedLyrics();
}
let lyricSelectionTimer=null;
document.addEventListener('selectionchange',()=>{
  clearTimeout(lyricSelectionTimer);
  lyricSelectionTimer=setTimeout(captureHighlightedLyrics,80);
});
document.addEventListener('mouseup',captureHighlightedLyrics);
document.addEventListener('touchend',()=>setTimeout(captureHighlightedLyrics,120),{passive:true});

function bind(){document.addEventListener('click',e=>{const album=e.target.closest('.open-album');if(album)openAlbum(album.dataset.album);const lyric=e.target.closest('.lyric-choice');if(lyric)setLyric(lyric.dataset.lyricIndex);const play=e.target.closest('.play-song');if(play){$('#albumDetailModal')?.classList.remove('open');openSong(play.dataset.song);}const add=e.target.closest('.add-cart');if(add){const r=data.Shop.find(x=>x['Product ID']===add.dataset.product);if(r){const size=$(`[data-product-size="${CSS.escape(r['Product ID'])}"]`)?.value||'';const ex=cart.find(x=>x.id===r['Product ID']&&x.size===size);if(ex)ex.qty++;else cart.push({id:r['Product ID'],name:r['Product Name'],price:Number(r.Price),image:r['Image URL or Path'],size,qty:1});saveCart();$('#cartDrawer').classList.add('open')}}const shopShare=e.target.closest('[data-share-product]');if(shopShare){shareProduct(shopShare.dataset.shareProduct);return;}const rem=e.target.closest('.remove-cart');if(rem){cart.splice(Number(rem.dataset.i),1);saveCart()}const news=e.target.closest('.news-card');if(news)openNews(news.dataset.news);const updDel=e.target.closest('[data-update-delete]');if(updDel){deleteUpdateFromFeed(updDel.dataset.updateDelete).catch(err=>alert(err.message||'Could not delete update.'));return;}const share=e.target.closest('[data-update-share]');
if(share){
  if(!canManageUpdates())return;
  shareUpdateToX(share.dataset.updateShare);
}const jt=e.target.closest('[data-jteam-author]');if(jt){$$('.jteam-member-filter').forEach(x=>x.classList.toggle('active',x===jt));const id=jt.dataset.jteamAuthor;if(id==='all'){renderUpdates('j-team');return;}const rows=visible(data.Updates||[]).filter(r=>r['Author ID']===id);const feed=$('#updatesFeed');feed.innerHTML=rows.map(r=>{const a=getUpdateAuthor(r['Author ID']);return `<article class="update-post"><div class="update-post-head"><img class="update-post-avatar" src="${escape(img(a.Photo))}" alt="" loading="lazy" decoding="async"><div class="update-post-author"><strong>${escape(a.Name)}${updateVerified(a)}</strong><span>${escape(a.Position||'')} · ${escape(r.Date||'')} ${escape(r.Time||'')}</span></div><span class="update-post-type">${escape(r['Post Type']||'Update')}</span></div>${r.Text?`<p class="update-post-text">${escape(r.Text)}</p>`:''}${renderUpdateMedia(r)}<div class="update-post-actions"><span>${escape(r.Category||'Update')}</span>${updateShareButton(r)}${updateDeleteButton(r)}</div>${renderUpdateComments(r['Update ID'])}</article>`}).join('')||'<p>No updates from this J-Team member yet.</p>';return;}const author=e.target.closest('[data-author-filter]');if(author){const id=author.dataset.authorFilter;const user=getUpdateAuthor(id);activeUpdateFilter=String(user.Role||'').includes('Artist')?'artist':'j-team';$$('.update-tab').forEach(x=>x.classList.toggle('active',x.dataset.updateFilter===activeUpdateFilter));const rows=visible(data.Updates||[]).filter(r=>r['Author ID']===id);const feed=$('#updatesFeed');feed.innerHTML=rows.map(r=>{const a=getUpdateAuthor(r['Author ID']);return `<article class="update-post"><div class="update-post-head"><img class="update-post-avatar" src="${escape(img(a.Photo))}" alt="" loading="lazy" decoding="async"><div class="update-post-author"><strong>${escape(a.Name)}${updateVerified(a)}</strong><span>${escape(a.Position||'')} · ${escape(r.Date||'')} ${escape(r.Time||'')}</span></div><span class="update-post-type">${escape(r['Post Type']||'Update')}</span></div>${r.Text?`<p class="update-post-text">${escape(r.Text)}</p>`:''}${renderUpdateMedia(r)}<div class="update-post-actions"><span>${escape(r.Category||'Update')}</span>${updateShareButton(r)}${updateDeleteButton(r)}</div>${renderUpdateComments(r['Update ID'])}</article>`}).join('')||'<p>No updates from this author.</p>'}});$$('.music-tab').forEach(b=>b.onclick=()=>{$$('.music-tab').forEach(x=>x.classList.remove('active'));$$('.music-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#'+b.dataset.target).classList.add('active')});$$('.shop-tab').forEach(b=>b.onclick=()=>{$$('.shop-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderShop(b.dataset.category)});$$('.update-tab').forEach(b=>b.onclick=()=>{$$('.update-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderUpdates(b.dataset.updateFilter)});$('#menuButton').onclick=()=>$('#navigation').classList.toggle('open');$('#openCartButton').onclick=()=>$('#cartDrawer').classList.add('open');$('#closeCartButton').onclick=()=>$('#cartDrawer').classList.remove('open');$('#closeMusicPlayer').onclick=()=>{$('#musicPlayerModal').classList.remove('open');$('#youtubePlayer').src=''};$('#closeNewsModal').onclick=()=>$('#newsModal').classList.remove('open');$('#closeAlbumDetail').onclick=()=>$('#albumDetailModal').classList.remove('open');$('#checkoutButton').onclick=()=>{if(cart.length){renderCart();$('#checkoutModal').classList.add('open')}};$('#closeCheckoutButton').onclick=()=>$('#checkoutModal').classList.remove('open');$('#fictionalCheckoutForm').onsubmit=e=>{e.preventDefault();const totals=renderCart();const fd=new FormData(e.target),num='JN-'+String(Math.floor(Math.random()*999999)).padStart(6,'0');$('#orderNumber').textContent=num;$('#successFullName').textContent=fd.get('fullName');$('#successOrderTotal').textContent=money(totals.total);$('#successPaymentMethod').textContent=fd.get('paymentMethod')||'Fictional Payment';cart=[];saveCart();$('#checkoutModal').classList.remove('open');$('#successModal').classList.add('open');};$('#closeSuccessButton').onclick=()=>$('#successModal').classList.remove('open');$('#signupForm').onsubmit=e=>{e.preventDefault();$('#formMessage').textContent='Welcome to the Jeadore List ♡';e.target.reset()};
async function buildLyricCardBlob(){if(!currentSong)return null;const quote=selectedLyricText.trim();if(!quote){alert('Highlight the lyric lines you want to use first.');return null;}const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1080;const ctx=canvas.getContext('2d');ctx.fillStyle='#efbcc8';ctx.fillRect(0,0,1080,1080);const bg=currentSong['Lyric Background Image']||currentSong['Cover URL or Path'];try{const background=await loadCanvasImage(bg);ctx.globalAlpha=.18;const scale=Math.max(1080/background.width,1080/background.height),w=background.width*scale,h=background.height*scale;ctx.drawImage(background,(1080-w)/2,(1080-h)/2,w,h);ctx.globalAlpha=1}catch(e){}ctx.fillStyle='rgba(255,255,255,.28)';ctx.fillRect(58,58,964,964);try{const cover=await loadCanvasImage(currentSong['Cover URL or Path']);ctx.drawImage(cover,100,105,105,105)}catch(e){}ctx.fillStyle='#4b1d22';ctx.font='700 38px Arial';ctx.fillText(currentSong['Song Title']||'',235,142);ctx.font='30px Arial';ctx.fillText('Jeniffer Nora',235,184);ctx.font='20px Arial';ctx.globalAlpha=.75;ctx.fillText(originalCredit(currentSong)?`Original song by ${originalCredit(currentSong)}`:'Original credit unavailable',235,215);ctx.globalAlpha=1;ctx.font='700 58px Arial';const lines=wrapCanvasText(ctx,quote,850).slice(0,9);let y=365;for(const line of lines){ctx.fillText(line,100,y);y+=67}ctx.font='700 34px Arial';ctx.fillText('Jeniffer Nora',100,940);ctx.font='18px Arial';ctx.globalAlpha=.65;ctx.fillText('Fictional artist · For roleplay purpose',100,978);ctx.globalAlpha=1;return {blob:await canvasToBlob(canvas),canvas}}
$('#saveLyricCard').onclick=async()=>{const card=await buildLyricCardBlob();if(!card)return;const link=document.createElement('a');link.download=`${slugify(currentSong['Song Title']||'jeniffer-lyric')}-lyric.png`;link.href=URL.createObjectURL(card.blob);link.click();setTimeout(()=>URL.revokeObjectURL(link.href),2000)};
$('#shareSongButton').onclick=async()=>{const card=await buildLyricCardBlob();if(!card)return;const file=new File([card.blob],`${slugify(currentSong['Song Title']||'jeniffer-lyric')}-jeniffer-nora.png`,{type:'image/png'});if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:`${currentSong['Song Title']} · Jeniffer Nora`});return}catch(e){if(e&&e.name==='AbortError')return}}const link=document.createElement('a');link.download=file.name;link.href=URL.createObjectURL(card.blob);link.click();setTimeout(()=>URL.revokeObjectURL(link.href),2000);alert('Lyric card saved as an image. You can attach it to X or another app.');};}
window.addEventListener('pageshow',()=>{
  const route=(location.hash||'#home').slice(1);
  if(route==='home'||route==='updates'){
    refreshUpdatesPortal().finally(()=>{
      if(route==='updates')renderUpdates(activeUpdateFilter||'all');
      if(route==='home')renderHomeUpdatesOnly();
    });
  }
});
(async()=>{await loadLiveSheetData();warmCriticalAvatars();setupExtraUI();renderAll();bind();setupAdmin();setupSectionRouting();handleDeepLinks();})();})();
/* V21.12 — robust mobile navigation patch. Existing navigation and
   section routing remain intact. This only guarantees the hamburger
   has a reliable click/tap target and closes after a destination. */
(function(){
  const btn=document.getElementById('menuButton');
  const nav=document.getElementById('navigation');
  if(!btn||!nav) return;

  btn.setAttribute('aria-expanded',nav.classList.contains('open')?'true':'false');

  btn.addEventListener('click',function(){
    requestAnimationFrame(()=>{
      btn.setAttribute('aria-expanded',nav.classList.contains('open')?'true':'false');
    });
  });

  nav.querySelectorAll('a[href^="#"]').forEach(link=>{
    link.addEventListener('click',()=>{
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded','false');
    });
  });
})();

window.addEventListener('jen-live-data-ready',()=>{
  try{
    renderUpdates(activeUpdateFilter||'all');
    renderHomeUpdatesOnly();
  }catch(e){
    console.warn('Updates rerender failed',e);
  }
});
