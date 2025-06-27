import { wsClients } from "../websocketManager.js";

export function sendWebsocketNotification(playerId, messageObj) {
  const sockets = wsClients.get(playerId);
  if (!sockets) return;

  const msg = JSON.stringify(messageObj);

  for (const socket of sockets) {
    if (socket.readyState === 1) {
      socket.send(msg);
    }
  }
}
