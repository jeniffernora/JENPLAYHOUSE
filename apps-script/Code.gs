const SHEET_ID = '1MALZe1C5SRT05ZfIaFK6Q8X2ieymbM6mFPbB1Tqt7Gc';
const TIMEZONE = 'Asia/Jakarta';

function doGet(e) {
  const action = String(e.parameter.action || '').trim();
  if (action === 'login') return loginUser(e);
  return jsonResponse({ success: false, message: 'Unknown GET action' });
}

function doPost(e) {
  const action = String(e.parameter.action || '').trim();
  if (action === 'createUpdate') return createUpdate(e);
  return jsonResponse({ success: false, message: 'Unknown POST action' });
}

function loginUser(e) {
  try {
    const email = normalizeEmail(e.parameter.email);
    if (!email) return jsonResponse({ success: false, message: 'Email is required' });
    const user = findUserByEmail(email);
    if (!user) return jsonResponse({ success: false, message: 'Access denied' });
    return jsonResponse({ success: true, user });
  } catch (error) {
    return jsonResponse({ success: false, message: error.message });
  }
}

function createUpdate(e) {
  try {
    const email = normalizeEmail(e.parameter.email);
    const postType = String(e.parameter.postType || 'Text').trim();
    const category = String(e.parameter.category || 'Artist').trim();
    const text = String(e.parameter.text || '').trim();
    const status = String(e.parameter.status || 'Draft').trim();
    const media1 = String(e.parameter.media1 || '').trim();
    const media2 = String(e.parameter.media2 || '').trim();
    const media3 = String(e.parameter.media3 || '').trim();
    const media4 = String(e.parameter.media4 || '').trim();
    const thumbnail = String(e.parameter.thumbnail || '').trim();
    const duration = String(e.parameter.duration || '').trim();
    const pinned = String(e.parameter.pinned || 'No').trim();

    if (!email) return jsonResponse({ success: false, message: 'Login email is missing' });
    const user = findUserByEmail(email);
    if (!user) return jsonResponse({ success: false, message: 'User not found or inactive' });
    if (!isYes(user.canPost)) return jsonResponse({ success: false, message: 'This account cannot create posts' });
    if (postType.toLowerCase() === 'text' && !text) return jsonResponse({ success: false, message: 'Write something before saving' });

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Updates');
    if (!sheet) return jsonResponse({ success: false, message: 'Updates sheet not found' });

    ensureUpdatesHeaders(sheet);
    const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    const updateId = getNextUpdateId(sheet);
    const now = new Date();
    const date = Utilities.formatDate(now, TIMEZONE, 'dd MMMM yyyy');
    const time = Utilities.formatDate(now, TIMEZONE, 'HH:mm');
    const slug = createSlug(text || postType || updateId) + '-' + updateId.toLowerCase();
    const xTemplate = user.role === 'Owner / Artist'
      ? 'Jeniffer Nora via Updates ♡\n\n{TEXT}\n\n{URL}'
      : 'J-Team Update\n\n{TEXT}\n\n{URL}';

    const record = {
      'Update ID': updateId, 'Author ID': user.userId, 'Date': date, 'Time': time,
      'Post Type': postType, 'Category': category, 'Text': text,
      'Media 1': media1, 'Media 2': media2, 'Media 3': media3, 'Media 4': media4,
      'Thumbnail': thumbnail, 'Duration': duration, 'Slug': slug,
      'X Template': xTemplate, 'Pinned': pinned, 'Status': status
    };
    sheet.appendRow(headers.map(h => record[h] !== undefined ? record[h] : ''));

    return jsonResponse({ success: true, message: 'Update saved', update: {
      updateId, authorId:user.userId, author:user.name, displayName:user.displayName,
      verified:user.verified, date, time, postType, category, text,
      media1, media2, media3, media4, thumbnail, duration, slug, pinned, status
    }});
  } catch (error) {
    return jsonResponse({ success: false, message: error.message });
  }
}

function ensureUpdatesHeaders(sheet){
  const desired=['Update ID','Author ID','Date','Time','Post Type','Category','Text','Media 1','Media 2','Media 3','Media 4','Thumbnail','Duration','Slug','X Template','Pinned','Status'];
  const last=Math.max(sheet.getLastColumn(),1);
  const headers=sheet.getRange(1,1,1,last).getValues()[0].map(String);
  desired.forEach(h=>{if(!headers.includes(h)){sheet.getRange(1,sheet.getLastColumn()+1).setValue(h);headers.push(h);}});
}

function findUserByEmail(email) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  const headers = data[0];
  const ix = n => headers.indexOf(n);
  for (let i=1;i<data.length;i++) {
    const row=data[i];
    const rowEmail=normalizeEmail(row[ix('Email')]);
    const state=String(row[ix('Status')]||'').trim().toLowerCase();
    if(rowEmail===email && state==='active') return {
      userId:row[ix('User ID')], name:row[ix('Name')], displayName:row[ix('Display Name')],
      position:row[ix('Position')], photo:row[ix('Photo')], updateFolder:row[ix('Update Asset Folder')],
      email:rowEmail, role:row[ix('Role')], verified:row[ix('Verified')],
      canPost:row[ix('Can Post')], canEdit:row[ix('Can Edit')], canDelete:row[ix('Can Delete')]
    };
  }
  return null;
}

function getNextUpdateId(sheet) {
  const lastRow=sheet.getLastRow();
  if(lastRow<2) return 'UPD-001';
  const ids=sheet.getRange(2,1,lastRow-1,1).getValues().flat();
  let highest=0;
  ids.forEach(id=>{const m=String(id||'').match(/^UPD-(\d+)$/i);if(m) highest=Math.max(highest,Number(m[1]));});
  return 'UPD-'+String(highest+1).padStart(3,'0');
}
function createSlug(value){return String(value||'update').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').substring(0,50)||'update';}
function normalizeEmail(value){return String(value||'').trim().toLowerCase();}
function isYes(value){return String(value||'').trim().toLowerCase()==='yes';}
function jsonResponse(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
