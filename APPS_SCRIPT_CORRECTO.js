// ═══════════════════════════════════════════════════════════════════
// DoGameMate - Google Apps Script Web App
// ═══════════════════════════════════════════════════════════════════

const SHEET_ID = '1DPqj8h9wJpl2LBMRyjzHPsgqMPZoKa56ifjIFQ8cRgM';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SHEET_ID);
}

// ═══════════════════════════════════════════════════════════════════
// ENDPOINTS PRINCIPALES
// ═══════════════════════════════════════════════════════════════════

function doGet(e) {
  try {
    if (!e || !e.parameter) {
      return jsonOk({ message: 'DoGameMate API v1.0' });
    }

    const action = e.parameter.action;
    const roomId = e.parameter.roomId;

    switch (action) {
      case 'listPlayers':
        return jsonOk(listPlayers(roomId));
      case 'listRooms':
        return jsonOk(listRooms());
      default:
        return jsonErr('Acción no reconocida: ' + action);
    }
  } catch (err) {
    return jsonErr(err.message);
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonErr('No data provided');
    }

    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    switch (action) {
      case 'registerPlayer':
        return jsonOk(registerPlayer(body));
      case 'createRoom':
        return jsonOk(createRoom(body));
      case 'savePlayerData':
        return jsonOk(savePlayerData(body));
      default:
        return jsonErr('Acción no reconocida: ' + action);
    }
  } catch (err) {
    return jsonErr(err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function jsonOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonErr(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Crear headers según el tipo de hoja
    if (name === 'Players') {
      sheet.appendRow(['playerId', 'playerName', 'avatar', 'lastActive', 'roomId']);
    } else if (name === 'GameRooms') {
      sheet.appendRow(['roomId', 'roomName', 'maxPlayers', 'createdAt', 'status']);
    } else if (name === 'MultiplayerGame') {
      sheet.appendRow(['gameId', 'playerName', 'score', 'timestamp']);
    }
  }
  return sheet;
}

function sheetToArray(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] === '' ? null : row[index];
    });
    return obj;
  });
}

// ═══════════════════════════════════════════════════════════════════
// FUNCIONES DE NEGOCIO
// ═══════════════════════════════════════════════════════════════════

function registerPlayer(data) {
  const sheet = getSheet('Players');
  sheet.appendRow([
    data.playerId,
    data.playerName,
    data.avatar,
    new Date(),
    data.roomId
  ]);
  return { playerId: data.playerId, registered: true };
}

function createRoom(data) {
  const sheet = getSheet('GameRooms');
  sheet.appendRow([
    data.roomId,
    data.roomName,
    data.maxPlayers || 10,
    new Date(),
    'waiting'
  ]);
  return { roomId: data.roomId, created: true };
}

function listPlayers(roomId) {
  const players = sheetToArray('Players');
  return players.filter(p => p.roomId === roomId);
}

function listRooms() {
  return sheetToArray('GameRooms');
}

function savePlayerData(data) {
  const sheet = getSheet('MultiplayerGame');
  sheet.appendRow([
    data.gameId,
    data.playerName,
    data.score,
    new Date()
  ]);
  return { saved: true };
}

// ═══════════════════════════════════════════════════════════════════
// TESTING
// ═══════════════════════════════════════════════════════════════════

function testDrive() {
  const ss = getSpreadsheet();
  Logger.log('Sheets accessible: ' + ss.getName());
  return 'OK';
}
