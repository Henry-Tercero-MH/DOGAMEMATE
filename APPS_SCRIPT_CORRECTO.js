// ═══════════════════════════════════════════════════════════════════
// DoGameMate - Google Apps Script Web App
// ═══════════════════════════════════════════════════════════════════

/* global SpreadsheetApp, ContentService, Logger */

const SHEET_ID = '1DPqj8h9wJpl2LBMRyjzHPsgqMPZoKa56ifjIFQ8cRgM';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SHEET_ID);
}

// ═══════════════════════════════════════════════════════════════════
// ENDPOINTS PRINCIPALES
// ═══════════════════════════════════════════════════════════════════

function DoGet(e) {
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

function DoPost(e) {
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
      sheet.appendRow(['roomId', 'roomName', 'maxPlayers', 'createdAt', 'status', 'currentProblem', 'hostId', 'ballPosition', 'scoreTeamA', 'scoreTeamB', 'currentTeam', 'difficulty', 'problemStartTime', 'pointsToWin', 'currentProblemId', 'problemStatus', 'solvedByTeam', 'solvedByPlayer']);
    } else if (name === 'MultiplayerGame') {
      sheet.appendRow(['gameId', 'roomId', 'winner', 'scoreTeamA', 'scoreTeamB', 'totalPlayers', 'startTime', 'endTime', 'duration']);
    } else if (name === 'GameAnswers') {
      sheet.appendRow(['answerId', 'roomId', 'problemId', 'playerId', 'playerName', 'teamId', 'answer', 'isCorrect', 'points', 'timestamp', 'responseTime']);
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
    999, // maxPlayers (sin límite)
    new Date(),
    'waiting',
    '', // currentProblem
    '', // hostId
    'A', // ballPosition (empieza en equipo A)
    0, // scoreTeamA
    0, // scoreTeamB
    'A', // currentTeam (empieza equipo A)
    data.difficulty || 'medium', // dificultad global
    null, // problemStartTime
    data.pointsToWin || 5, // pointsToWin
    '', // currentProblemId
    '', // problemStatus
    '', // solvedByTeam
    ''  // solvedByPlayer
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
  const gameId = data.gameId || `game_${new Date().getTime()}`;
  
  sheet.appendRow([
    gameId,
    data.roomId,
    data.winner, // 'A' o 'B'
    data.scoreTeamA || 0,
    data.scoreTeamB || 0,
    data.totalPlayers || 0,
    data.startTime || new Date(),
    new Date(), // endTime
    data.duration || 0 // duración en segundos
  ]);
  return { saved: true, gameId: gameId };
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

// Enviar respuesta de jugador (con LockService para "primer correcto gana")
function submitAnswer(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Esperar hasta 10 segundos por el lock

    const now = new Date();
    const responseTime = data.problemStartTime
      ? now.getTime() - new Date(data.problemStartTime).getTime()
      : 0;

    // 1. Verificar si alguien ya respondió correctamente este problema
    const existingAnswers = sheetToArray('GameAnswers');
    const alreadySolved = existingAnswers.some(function(a) {
      return a.roomId === data.roomId &&
        a.problemId === data.problemId &&
        (a.isCorrect === true || a.isCorrect === 'TRUE');
    });

    const isFirstCorrect = (data.isCorrect === true) && !alreadySolved;

    // 2. Registrar la respuesta en GameAnswers
    const sheet = getSheet('GameAnswers');
    const answerId = 'ans_' + now.getTime() + '_' + Math.random().toString(36).slice(2, 11);
    sheet.appendRow([
      answerId,
      data.roomId,
      data.problemId,
      data.playerId,
      data.playerName,
      data.teamId || 'A',
      data.answer,
      data.isCorrect,
      isFirstCorrect ? 1 : 0,
      now,
      responseTime
    ]);

    // 3. Si es el primer correcto, actualizar scores y problemStatus en GameRooms
    if (isFirstCorrect) {
      const roomSheet = getSheet('GameRooms');
      const roomData = roomSheet.getDataRange().getValues();
      var headers = roomData[0];
      var roomIdCol = headers.indexOf('roomId');

      for (var i = 1; i < roomData.length; i++) {
        if (roomData[i][roomIdCol] === data.roomId) {
          // Incrementar score del equipo que respondió
          var scoreACol = headers.indexOf('scoreTeamA');
          var scoreBCol = headers.indexOf('scoreTeamB');
          var currentA = Number(roomData[i][scoreACol]) || 0;
          var currentB = Number(roomData[i][scoreBCol]) || 0;

          if (data.teamId === 'A') {
            roomSheet.getRange(i + 1, scoreACol + 1).setValue(currentA + 1);
          } else {
            roomSheet.getRange(i + 1, scoreBCol + 1).setValue(currentB + 1);
          }

          // Marcar problema como resuelto
          var problemStatusCol = headers.indexOf('problemStatus');
          var solvedByTeamCol = headers.indexOf('solvedByTeam');
          var solvedByPlayerCol = headers.indexOf('solvedByPlayer');

          if (problemStatusCol !== -1) {
            roomSheet.getRange(i + 1, problemStatusCol + 1).setValue('solved');
          }
          if (solvedByTeamCol !== -1) {
            roomSheet.getRange(i + 1, solvedByTeamCol + 1).setValue(data.teamId);
          }
          if (solvedByPlayerCol !== -1) {
            roomSheet.getRange(i + 1, solvedByPlayerCol + 1).setValue(data.playerName);
          }
          break;
        }
      }
    }

    lock.releaseLock();

    return {
      answerId: answerId,
      submitted: true,
      responseTime: responseTime,
      isFirstCorrect: isFirstCorrect,
      alreadySolved: alreadySolved
    };
  } catch (e) {
    return { submitted: false, error: e.message };
  }
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
    currentTeam: room.currentTeam || 'A',
    difficulty: room.difficulty || 'medium',
    problemStartTime: room.problemStartTime || null,
    pointsToWin: Number(room.pointsToWin) || 5,
    currentProblemId: room.currentProblemId || null,
    problemStatus: room.problemStatus || 'active',
    solvedByTeam: room.solvedByTeam || null,
    solvedByPlayer: room.solvedByPlayer || null
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
  const requiredCols = ['currentProblem', 'hostId', 'ballPosition', 'scoreTeamA', 'scoreTeamB', 'currentTeam', 'difficulty', 'problemStartTime', 'pointsToWin', 'currentProblemId', 'problemStatus', 'solvedByTeam', 'solvedByPlayer'];
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
      if (data.difficulty) {
        sheet.getRange(i + 1, headers.indexOf('difficulty') + 1).setValue(data.difficulty);
      }
      if (data.problemStartTime !== undefined) {
        sheet.getRange(i + 1, headers.indexOf('problemStartTime') + 1).setValue(data.problemStartTime);
      }
      if (data.pointsToWin !== undefined) {
        sheet.getRange(i + 1, headers.indexOf('pointsToWin') + 1).setValue(data.pointsToWin);
      }
      if (data.currentProblemId !== undefined) {
        sheet.getRange(i + 1, headers.indexOf('currentProblemId') + 1).setValue(data.currentProblemId);
      }
      if (data.problemStatus !== undefined) {
        sheet.getRange(i + 1, headers.indexOf('problemStatus') + 1).setValue(data.problemStatus);
      }
      if (data.solvedByTeam !== undefined) {
        sheet.getRange(i + 1, headers.indexOf('solvedByTeam') + 1).setValue(data.solvedByTeam);
      }
      if (data.solvedByPlayer !== undefined) {
        sheet.getRange(i + 1, headers.indexOf('solvedByPlayer') + 1).setValue(data.solvedByPlayer);
      }
      return { updated: true };
    }
  }
  return { updated: false, error: 'Room not found' };
}

// ═══════════════════════════════════════════════════════════════════
// TESTING
// ═══════════════════════════════════════════════════════════════════

function TestDrive() {
  const ss = getSpreadsheet();
  Logger.log('Sheets accessible: ' + ss.getName());
  return 'OK';
}
