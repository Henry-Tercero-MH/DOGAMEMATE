// API de Google Apps Script para el módulo multijugador
// SIEMPRE usa proxy para evitar CORS (Vite en localhost, Vercel en producción)
const API_URL = '/api/proxy';

console.log('🌐 Multiplayer API: Usando proxy (Vite local o Vercel producción)');

// Obtener datos de una partida
export async function fetchGameData(gameId) {
  const res = await fetch(`${API_URL}?gameId=${gameId}`);
  return await res.json();
}

// Guardar datos de un jugador
export async function savePlayerData(gameId, playerName, score) {
  const payload = { action: 'savePlayerData', gameId, playerName, score };
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return await res.json();
}

// Registrar jugador en sala
export async function registerPlayer(playerId, playerName, avatar, roomId) {
  const payload = { action: 'registerPlayer', playerId, playerName, avatar, roomId };
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return await res.json();
}

// Crear sala multijugador
export async function createRoom(roomId, roomName, maxPlayers) {
  const payload = { action: 'createRoom', roomId, roomName, maxPlayers };
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return await res.json();
}

// Listar jugadores de una sala
export async function listPlayers(roomId) {
  const res = await fetch(`${API_URL}?action=listPlayers&roomId=${roomId}`);
  return await res.json();
}

// Listar salas disponibles
export async function listRooms() {
  const res = await fetch(`${API_URL}?action=listRooms`);
  return await res.json();
}

export { API_URL };
