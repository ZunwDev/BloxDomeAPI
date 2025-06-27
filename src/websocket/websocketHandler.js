import crypto from "node:crypto";
import { wsClients } from "./websocketManager.js";

const HEARTBEAT_TIMEOUT = 60000; // 60s without heartbeat = close socket

const heartbeatTimers = new WeakMap();

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

    // Send initial connected message
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

    // Broadcast online count to all clients
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
          } catch {
            // ignore broken sockets here, cleanup on close/error
          }
        }
      }
    };

    broadcastOnlineCount();

    // Start/reset heartbeat timeout for socket
    const startHeartbeatTimeout = () => {
      clearHeartbeatTimeout();
      const timeout = setTimeout(() => {
        console.log(`[WS] No heartbeat from ${playerId}, closing socket`);
        socket.close();
      }, HEARTBEAT_TIMEOUT);
      heartbeatTimers.set(socket, timeout);
    };

    // Clear heartbeat timeout for socket
    const clearHeartbeatTimeout = () => {
      const timeout = heartbeatTimers.get(socket);
      if (timeout) {
        clearTimeout(timeout);
        heartbeatTimers.delete(socket);
      }
    };

    // Start heartbeat timeout on connect
    startHeartbeatTimeout();

    socket.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());

        switch (msg.type) {
          case "HEARTBEAT":
            // Reset heartbeat timeout on heartbeat message
            socket.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
            startHeartbeatTimeout();
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
      clearHeartbeatTimeout();
      const set = wsClients.get(playerId);
      if (set) {
        set.delete(socket);
        if (set.size === 0) wsClients.delete(playerId);
      }

      const uniquePlayers = wsClients.size;
      console.log(`[WS] Player ${playerId} disconnected. Unique players: ${uniquePlayers}`);

      broadcastOnlineCount();
    };

    socket.on("close", () => {
      console.log(`[WS] Socket closed for player ${playerId}`);
      cleanup();
    });

    socket.on("error", (err) => {
      console.error(`[WS] Socket error for ${playerId}:`, err);
      cleanup();
    });
  });
}
