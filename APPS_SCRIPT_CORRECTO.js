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
    if (!e || !e.parameter || !e.parameter.action) {
      return jsonOk({ message: 'DoGameMate API v1.0' });
    }

    const action = e.parameter.action;
    const roomId = e.parameter.roomId;
    const problemId = e.parameter.problemId;

    switch (action) {
      case 'listPlayers':
        return jsonOk(listPlayers(roomId));
      case 'listRooms':
        return jsonOk(listRooms());
      case 'getGameState':
        return jsonOk(getGameState(roomId));
      case 'getAnswers':
        return jsonOk(getAnswers(roomId, problemId));
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
      case 'startGame':
        return jsonOk(startGame(body));
      case 'submitAnswer':
        return jsonOk(submitAnswer(body));
      case 'updateGameState':
        return jsonOk(updateGameState(body));
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
      sheet.appendRow(['playerId', 'playerName', 'avatar', 'lastActive', 'roomId', 'teamId']);
    } else if (name === 'GameRooms') {
      sheet.appendRow(['roomId', 'roomName', 'maxPlayers', 'createdAt', 'status', 'currentProblem', 'hostId', 'ballPosition', 'scoreTeamA', 'scoreTeamB', 'currentTeam']);
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
    data.roomId,
    data.teamId || 'A'
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
    'waiting',
    '', // currentProblem
    '', // hostId
    'A', // ballPosition (empieza en equipo A)
    0, // scoreTeamA
    0, // scoreTeamB
    'A' // currentTeam (empieza equipo A)
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

// Iniciar juego (cambiar estado de sala a "playing")
function startGame(data) {
  const sheet = getSheet('GameRooms');
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const roomIdCol = headers.indexOf('roomId');
  const statusCol = headers.indexOf('status');
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][roomIdCol] === data.roomId) {
      sheet.getRange(i + 1, statusCol + 1).setValue('playing');
      sheet.getRange(i + 1, headers.indexOf('currentProblem') + 1 || 6).setValue(data.currentProblem || '');
      sheet.getRange(i + 1, headers.indexOf('hostId') + 1 || 7).setValue(data.hostId || '');
      return { started: true };
    }
  }
  return { started: false, error: 'Room not found' };
}

// Enviar respuesta de jugador
function submitAnswer(data) {
  const sheet = getSheet('GameAnswers');
  // Crear headers si no existen
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['answerId', 'roomId', 'problemId', 'playerId', 'playerName', 'answer', 'isCorrect', 'points', 'timestamp']);
  }
  
  const answerId = `ans_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`;
  sheet.appendRow([
    answerId,
    data.roomId,
    data.problemId,
    data.playerId,
    data.playerName,
    data.answer,
    data.isCorrect,
    data.points || 0,
    new Date()
  ]);
  
  return { answerId: answerId, submitted: true };
}

// Obtener estado del juego
function getGameState(roomId) {
  const rooms = sheetToArray('GameRooms');
  const room = rooms.find(r => r.roomId === roomId);
  if (!room) return { error: 'Room not found' };
  
  return {
    roomId: room.roomId,
    status: room.status,
    currentProblem: room.currentProblem || null,
    hostId: room.hostId || null,
    ballPosition: room.ballPosition || 'A',
    scoreTeamA: room.scoreTeamA || 0,
    scoreTeamB: room.scoreTeamB || 0,
    currentTeam: room.currentTeam || 'A'
  };
}

// Obtener respuestas de un problema
function getAnswers(roomId, problemId) {
  const sheet = getSheet('GameAnswers');
  if (sheet.getLastRow() === 0) return [];
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  return data.slice(1)
    .filter(row => row[1] === roomId && row[2] === problemId)
    .map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
}

// Actualizar estado del juego
function updateGameState(data) {
  const sheet = getSheet('GameRooms');
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const roomIdCol = headers.indexOf('roomId');
  
  // Asegurar que existen las columnas necesarias
  const requiredCols = ['currentProblem', 'hostId', 'ballPosition', 'scoreTeamA', 'scoreTeamB', 'currentTeam'];
  requiredCols.forEach(col => {
    if (headers.indexOf(col) === -1) {
      headers.push(col);
      sheet.getRange(1, headers.length).setValue(col);
    }
  });
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][roomIdCol] === data.roomId) {
      if (data.status) {
        sheet.getRange(i + 1, headers.indexOf('status') + 1).setValue(data.status);
      }
      if (data.currentProblem !== undefined) {
        sheet.getRange(i + 1, headers.indexOf('currentProblem') + 1).setValue(data.currentProblem);
      }
      if (data.hostId) {
        sheet.getRange(i + 1, headers.indexOf('hostId') + 1).setValue(data.hostId);
      }
      if (data.ballPosition) {
        sheet.getRange(i + 1, headers.indexOf('ballPosition') + 1).setValue(data.ballPosition);
      }
      if (data.scoreTeamA !== undefined) {
        sheet.getRange(i + 1, headers.indexOf('scoreTeamA') + 1).setValue(data.scoreTeamA);
      }
      if (data.scoreTeamB !== undefined) {
        sheet.getRange(i + 1, headers.indexOf('scoreTeamB') + 1).setValue(data.scoreTeamB);
      }
      if (data.currentTeam) {
        sheet.getRange(i + 1, headers.indexOf('currentTeam') + 1).setValue(data.currentTeam);
      }
      return { updated: true };
    }
  }
  return { updated: false, error: 'Room not found' };
}

// ═══════════════════════════════════════════════════════════════════
// TESTING
// ═══════════════════════════════════════════════════════════════════

function testDrive() {
  const ss = getSpreadsheet();
  Logger.log('Sheets accessible: ' + ss.getName());
  return 'OK';
}
