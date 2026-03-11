// API de Google Apps Script para el módulo multijugador
// Usando proxy CORS para evitar bloqueos
const API_URL = 'https://script.google.com/macros/s/AKfycbzDvnD7F4GF36fiF_3xGYgTgMjrniEUu1hl_y8dFZenViepGxnQLwFrZetN6ZjdS31hxg/exec';
const PROXY_URL = 'https://corsproxy.io/?';

const getApiUrl = () => PROXY_URL + encodeURIComponent(API_URL);

// Obtener datos de una partida
export async function fetchGameData(gameId) {
  const url = `${API_URL}?gameId=${gameId}`;
  const res = await fetch(PROXY_URL + encodeURIComponent(url));
  return await res.json();
}

// Guardar datos de un jugador
export async function savePlayerData(gameId, playerName, score) {
  const payload = { action: 'savePlayerData', gameId, playerName, score };
  const res = await fetch(PROXY_URL + encodeURIComponent(API_URL), {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return await res.text();
}

// Registrar jugador en sala
export async function registerPlayer(playerId, playerName, avatar, roomId) {
  const payload = { action: 'registerPlayer', playerId, playerName, avatar, roomId };
  const res = await fetch(PROXY_URL + encodeURIComponent(API_URL), {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return await res.text();
}

// Crear sala multijugador
export async function createRoom(roomId, roomName, maxPlayers) {
  const payload = { action: 'createRoom', roomId, roomName, maxPlayers };
  const res = await fetch(PROXY_URL + encodeURIComponent(API_URL), {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return await res.text();
}

// Listar jugadores de una sala
export async function listPlayers(roomId) {
  const url = `${API_URL}?action=listPlayers&roomId=${roomId}`;
  const res = await fetch(PROXY_URL + encodeURIComponent(url));
  return await res.json();
}

// Listar salas disponibles
export async function listRooms() {
  const url = `${API_URL}?action=listRooms`;
  const res = await fetch(PROXY_URL + encodeURIComponent(url));
  return await res.json();
}

export { API_URL };
