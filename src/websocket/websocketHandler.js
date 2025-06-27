import crypto from "node:crypto";
import { wsClients } from "./websocketManager.js";

export default async function websocketHandler(fastify) {
  fastify.get("/ws", { websocket: true }, async (connection, request) => {
    const socket = connection;
    let playerId;

    try {
      const token = request.cookies?._bloxdomeVerification;
      if (token) {
        const decoded = await fastify.jwt.verify(token);
        playerId = String(decoded.player_id);
      }

      if (!playerId && request.query?.playerId) {
        playerId = String(request.query.playerId);
      }
    } catch (err) {
      console.error("[WS] JWT verification failed:", err);
    }

    if (!playerId) {
      playerId = `anonymous-${crypto.randomUUID()}`;
      console.log("[WS] Anonymous user connected:", playerId);
    }

    // Track socket
    if (!wsClients.has(playerId)) wsClients.set(playerId, new Set());
    wsClients.get(playerId).add(socket);

    const uniquePlayerCount = wsClients.size;
    console.log(`[WS] Player ${playerId} connected. IP: ${request.ip}. Unique players: ${uniquePlayerCount}`);

    try {
      socket.send(
        JSON.stringify({
          type: "connected",
          playerId,
          timestamp: new Date().toISOString(),
        })
      );
    } catch (err) {
      console.error("[WS] Failed to send welcome message:", err);
      wsClients.get(playerId)?.delete(socket);
      if (wsClients.get(playerId)?.size === 0) wsClients.delete(playerId);
      return;
    }

    const broadcastOnlineCount = () => {
      const count = wsClients.size;
      for (const sockets of wsClients.values()) {
        for (const sock of sockets) {
          try {
            sock.send(
              JSON.stringify({
                type: "ONLINE_COUNT",
                count,
                timestamp: new Date().toISOString(),
              })
            );
          } catch {}
        }
      }
    };

    broadcastOnlineCount();

    socket.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());

        switch (msg.type) {
          case "ping":
            socket.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
            break;

          case "SUBSCRIBE_ONLINE_COUNT":
            socket.send(
              JSON.stringify({
                type: "ONLINE_COUNT",
                count: wsClients.size,
                timestamp: new Date().toISOString(),
              })
            );
            break;

          default:
            console.warn(`[WS] Unknown message type from ${playerId}:`, msg.type);
        }
      } catch (err) {
        console.error(`[WS] Error parsing message from ${playerId}:`, err);
      }
    });

    const cleanup = () => {
      const set = wsClients.get(playerId);
      if (set) {
        set.delete(socket);
        if (set.size === 0) wsClients.delete(playerId);
      }

      const uniquePlayers = wsClients.size;
      console.log(`[WS] Player ${playerId} disconnected. Unique players: ${uniquePlayers}`);

      broadcastOnlineCount();
    };

    socket.on("close", cleanup);
    socket.on("error", (err) => {
      console.error(`[WS] Socket error for ${playerId}:`, err);
      cleanup();
    });
  });
}
