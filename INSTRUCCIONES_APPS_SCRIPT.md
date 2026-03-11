# 📋 Instrucciones para Actualizar Google Apps Script

## ⚠️ IMPORTANTE: Debes actualizar el código en Google Apps Script

### Pasos:

1. **Abre tu Google Apps Script:**
   - Ve a: https://script.google.com
   - Abre tu proyecto actual de DoGameMate

2. **Reemplaza TODO el código:**
   - Borra todo el código actual
   - Copia TODO el contenido del archivo `APPS_SCRIPT_CORRECTO.js`
   - Pégalo en el editor de Apps Script

3. **Guarda el proyecto:**
   - `Ctrl + S` o clic en el ícono de guardar

4. **Implementa una NUEVA versión:**
   - Click en **Implementar** → **Administrar implementaciones**
   - Click en el ícono de **lápiz** (editar) en la implementación activa
   - Click en **Nueva versión**
   - **Ejecutar como:** Yo
   - **Quién tiene acceso:** Cualquier persona
   - Click en **Implementar**

5. **IMPORTANTE: La URL NO debería cambiar**
   - Si te da una nueva URL, cópiala y pégala aquí en el chat

## 📊 Nuevas funciones agregadas:

- **startGame**: Inicia el juego (solo anfitrión)
- **submitAnswer**: Guarda respuesta de jugador con timestamp
- **getGameState**: Obtiene estado actual del juego
- **getAnswers**: Obtiene todas las respuestas de un problema
- **updateGameState**: Actualiza estado del juego en tiempo real

## 📝 Nuevas hojas en Google Sheets:

Se creará automáticamente:
- **GameAnswers**: Almacena respuestas de jugadores con:
  - answerId, roomId, problemId, playerId, playerName
  - answer, isCorrect, points, timestamp

