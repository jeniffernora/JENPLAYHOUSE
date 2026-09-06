const SHEET_ID = '1MALZe1C5SRT05ZfIaFK6Q8X2ieymbM6mFPbB1Tqt7Gc';
const DRIVE_FOLDER_ID = '1C4tYbqaP-muuWj9dp6h1cyD8srpQRVlQ';
const TIMEZONE = 'Asia/Jakarta';

function doGet(e) {
  const action = String(e.parameter.action || '').trim();
  if (action === 'login') return loginUser(e);
  return jsonResponse({ success: false, message: 'Unknown GET action' });
}

function doPost(e) {
  const action = String(e.parameter.action || '').trim();
  if (action === 'createUpdate') return createUpdate(e);
  if (action === 'uploadMedia') return uploadMedia(e);
  return jsonResponse({ success: false, message: 'Unknown POST action' });
}

function loginUser(e) {
  try {
    const email = normalizeEmail(e.parameter.email);
    if (!email) return jsonResponse({ success: false, message: 'Email is required' });
    const user = findUserByEmail(email);
    if (!user) return jsonResponse({ success: false, message: 'Access denied' });
    return jsonResponse({ success: true, user: user });
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
    const thumbnail = String(e.parameter.thumbnail || '').trim();
    const duration = String(e.parameter.duration || '').trim();
    const pinned = String(e.parameter.pinned || 'No').trim();

    if (!email) return jsonResponse({ success: false, message: 'Login email is missing' });
    const user = findUserByEmail(email);
    if (!user) return jsonResponse({ success: false, message: 'User not found or inactive' });
    if (!isYes(user.canPost)) return jsonResponse({ success: false, message: 'This account cannot create posts' });
    if (postType.toLowerCase() === 'text' && !text) return jsonResponse({ success: false, message: 'Write something before saving' });
    if (['photo','carousel','video','voice note'].includes(postType.toLowerCase()) && !media1) {
      return jsonResponse({ success: false, message: 'Upload media before saving this post' });
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Updates');
    if (!sheet) return jsonResponse({ success: false, message: 'Updates sheet not found' });

    const updateId = getNextUpdateId(sheet);
    const now = new Date();
    const date = Utilities.formatDate(now, TIMEZONE, 'dd MMMM yyyy');
    const time = Utilities.formatDate(now, TIMEZONE, 'HH:mm');
    const slug = createSlug(text || postType || updateId) + '-' + updateId.toLowerCase();
    const xTemplate = user.role === 'Owner / Artist'
      ? 'Jeniffer Nora via Updates ♡\n\n{TEXT}\n\n{URL}'
      : 'J-Team Update\n\n{TEXT}\n\n{URL}';

    sheet.appendRow([
      updateId, user.userId, date, time, postType, category, text,
      media1, media2, media3, thumbnail, duration, slug, xTemplate, pinned, status
    ]);

    return jsonResponse({
      success: true,
      message: 'Update saved',
      update: { updateId, authorId: user.userId, author: user.name, displayName: user.displayName,
        verified: user.verified, date, time, postType, category, text, media1, media2, media3,
        thumbnail, duration, slug, pinned, status }
    });
  } catch (error) {
    return jsonResponse({ success: false, message: error.message });
  }
}

function uploadMedia(e) {
  try {
    const email = normalizeEmail(e.parameter.email);
    const fileName = String(e.parameter.fileName || 'upload').trim();
    const mimeType = String(e.parameter.mimeType || 'application/octet-stream').trim();
    const base64Data = String(e.parameter.base64 || '').trim();

    if (!email) return jsonResponse({ success: false, message: 'Login email is missing' });
    const user = findUserByEmail(email);
    if (!user) return jsonResponse({ success: false, message: 'User not found or inactive' });
    if (!isYes(user.canPost)) return jsonResponse({ success: false, message: 'This account cannot upload media' });
    if (!base64Data) return jsonResponse({ success: false, message: 'No file data received' });

    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const bytes = Utilities.base64Decode(base64Data);
    const safeName = createSafeFileName(user.userId, fileName);
    const blob = Utilities.newBlob(bytes, mimeType, safeName);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    const viewUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;
    const downloadUrl = 'https://drive.google.com/uc?export=download&id=' + fileId;
    return jsonResponse({ success: true, message: 'Media uploaded', file: { id: fileId, name: file.getName(), mimeType, url: viewUrl, downloadUrl } });
  } catch (error) {
    return jsonResponse({ success: false, message: error.message });
  }
}

function findUserByEmail(email) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  const headers = data[0];
  const index = {
    userId: headers.indexOf('User ID'), name: headers.indexOf('Name'), displayName: headers.indexOf('Display Name'),
    position: headers.indexOf('Position'), photo: headers.indexOf('Photo'), updateFolder: headers.indexOf('Update Asset Folder'),
    email: headers.indexOf('Email'), role: headers.indexOf('Role'), verified: headers.indexOf('Verified'),
    canPost: headers.indexOf('Can Post'), canEdit: headers.indexOf('Can Edit'), canDelete: headers.indexOf('Can Delete'),
    status: headers.indexOf('Status')
  };
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowEmail = normalizeEmail(row[index.email]);
    const status = String(row[index.status] || '').trim().toLowerCase();
    if (rowEmail === email && status === 'active') {
      return {
        userId: row[index.userId], name: row[index.name], displayName: row[index.displayName], position: row[index.position],
        photo: row[index.photo], updateFolder: row[index.updateFolder], email: rowEmail, role: row[index.role],
        verified: row[index.verified], canPost: row[index.canPost], canEdit: row[index.canEdit], canDelete: row[index.canDelete]
      };
    }
  }
  return null;
}

function getNextUpdateId(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'UPD-001';
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  let highest = 0;
  ids.forEach(function(id) {
    const match = String(id || '').match(/^UPD-(\d+)$/i);
    if (match) highest = Math.max(highest, Number(match[1]));
  });
  return 'UPD-' + String(highest + 1).padStart(3, '0');
}

function createSlug(value) {
  const slug = String(value || 'update').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 50);
  return slug || 'update';
}

function createSafeFileName(userId, fileName) {
  const original = String(fileName || 'upload');
  const dotIndex = original.lastIndexOf('.');
  let extension = '';
  let name = original;
  if (dotIndex !== -1) {
    extension = original.substring(dotIndex).toLowerCase();
    name = original.substring(0, dotIndex);
  }
  const safe = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const timestamp = Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMdd-HHmmss');
  return String(userId || 'USER') + '-' + timestamp + '-' + (safe || 'media') + extension;
}

function normalizeEmail(value) { return String(value || '').trim().toLowerCase(); }
function isYes(value) { return String(value || '').trim().toLowerCase() === 'yes'; }
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
