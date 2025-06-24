import fastifyCookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyWebSocket from "@fastify/websocket";
import Fastify from "fastify";
import routes from "./src/routes/index.js";
import { DEFAULT_API_URL } from "./src/utils/config.js";

import dotenv from "dotenv";
dotenv.config();

const color = (code) => `\x1b[${code}m`;
const colors = {
  reset: color(0),
  bright: color(1),
  dim: color(2),
  red: color(31),
  green: color(32),
  yellow: color(33),
  blue: color(34),
  magenta: color(35),
  cyan: color(36),
  white: color(37),
  gray: color(90),
};

const levelMap = {
  10: `${colors.gray}TRACE`,
  20: `${colors.blue}DEBUG`,
  30: `${colors.green}INFO`,
  40: `${colors.yellow}WARN`,
  50: `${colors.red}ERROR`,
  60: `${colors.red}${colors.bright}FATAL`,
};

const formatTime = () => `${colors.gray}[${new Date().toLocaleTimeString("en-US", { hour12: false })}]${colors.reset}`;

const customStream = {
  write(msg) {
    const log = JSON.parse(msg);
    const level = levelMap[log.level] || "UNKNOWN";
    const time = formatTime();

    if (log.req && !log.res && !log.responseTime) {
      const method = `${colors.cyan}${log.req.method}${colors.reset}`;
      const url = `${colors.white}${log.req.url}${colors.reset}`;
      console.log(`${level} ${time}: ${method} ${url} ${colors.gray}← incoming${colors.reset}`);
      return;
    }

    if (!["request completed", "incoming request"].includes(log.msg) && log.msg) {
      console.log(`${level} ${time}: ${colors.white}${log.msg}${colors.reset}`);
    }
  },
};

const fastify = Fastify({
  logger: {
    level: process.env.TEST_MODE === "true" ? "debug" : "info",
    stream: process.env.TEST_MODE === "true" ? customStream : undefined,
    serializers: {
      req: ({ method, url, ip, headers }) => ({
        method,
        url,
        remoteAddress: ip,
        userAgent: headers["user-agent"],
      }),
      res: ({ statusCode }) => ({ statusCode }),
    },
  },
  disableRequestLogging: false,
});

// WebSocket clients storage - now stores user info
//const clients = new Map(); // userId -> Set of sockets

// Export broadcast functions for use in other modules
/* export const broadcast = (message) => {
  const totalSockets = Array.from(clients.values()).reduce((sum, sockets) => sum + sockets.size, 0);
  console.log(`Attempting to broadcast to ${totalSockets} total clients`);

  if (totalSockets === 0) {
    console.log("No WebSocket clients connected");
    return;
  }

  const messageString = typeof message === "string" ? message : JSON.stringify(message);
  let sentCount = 0;

  for (const [userId, userSockets] of clients.entries()) {
    const deadSockets = new Set();

    for (const socket of userSockets) {
      try {
        if (!socket || typeof socket.readyState === "undefined") {
          console.warn(`Invalid socket found for user ${userId}, removing`);
          deadSockets.add(socket);
          continue;
        }

        if (socket.readyState === 1) {
          socket.send(messageString);
          sentCount++;
        } else {
          console.log(`Socket readyState is ${socket.readyState} for user ${userId}, removing`);
          deadSockets.add(socket);
        }
      } catch (error) {
        console.error(`Error broadcasting to user ${userId}:`, error);
        deadSockets.add(socket);
      }
    }

    // Clean up dead sockets
    for (const deadSocket of deadSockets) {
      userSockets.delete(deadSocket);
    }

    // Remove user if no sockets left
    if (userSockets.size === 0) {
      clients.delete(userId);
    }
  }

  console.log(`Broadcasted message to ${sentCount} clients`);
}; */

/* export const notifyUsers = (userIds, message) => {
  if (!Array.isArray(userIds)) {
    userIds = [userIds];
  }

  console.log(`Attempting to notify users: ${userIds.join(", ")}`);

  const messageString = typeof message === "string" ? message : JSON.stringify(message);
  let sentCount = 0;

  for (const userId of userIds) {
    const userSockets = clients.get(String(userId));

    if (!userSockets || userSockets.size === 0) {
      console.log(`User ${userId} is not connected`);
      continue;
    }

    const deadSockets = new Set();

    for (const socket of userSockets) {
      try {
        if (!socket || typeof socket.readyState === "undefined") {
          deadSockets.add(socket);
          continue;
        }

        if (socket.readyState === 1) {
          socket.send(messageString);
          sentCount++;
          console.log(`Notification sent to user ${userId}`);
        } else {
          deadSockets.add(socket);
        }
      } catch (error) {
        console.error(`Error sending notification to user ${userId}:`, error);
        deadSockets.add(socket);
      }
    }

    // Clean up dead sockets
    for (const deadSocket of deadSockets) {
      userSockets.delete(deadSocket);
    }

    if (userSockets.size === 0) {
      clients.delete(String(userId));
    }
  }

  console.log(`Sent notifications to ${sentCount} clients across ${userIds.length} users`);
  return sentCount;
}; */

/* export const notifyGameBookmarkers = async (gameId, message) => {
  try {
    // You'll need to implement this query based on your database structure
    // This is a placeholder - replace with your actual database query
    const bookmarkedUsers = await getGameBookmarkers(gameId);

    if (bookmarkedUsers.length === 0) {
      console.log(`No users have bookmarked game ${gameId}`);
      return 0;
    }

    console.log(`Notifying ${bookmarkedUsers.length} users who bookmarked game ${gameId}`);
    return notifyUsers(bookmarkedUsers, {
      type: "game_update",
      gameId,
      message: `Game codes updated for your bookmarked game!`,
      ...message,
    });
  } catch (error) {
    console.error(`Error notifying game bookmarkers for game ${gameId}:`, error);
    return 0;
  }
}; */

/* async function getGameBookmarkers(gameId) {
  // This should query your database to get all user IDs who have bookmarked this game
  // Example query might look like:
  // return await db.query('SELECT user_id FROM bookmarks WHERE game_id = ?', [gameId]);

  // For now, returning empty array - you need to implement this
  console.warn("getGameBookmarkers not implemented - replace with your database query");
  return [];
} */

fastify.addHook("onRequest", async (req) => {
  req.startTime = Date.now();
});

fastify.addHook("onResponse", async (req, reply) => {
  const time = formatTime();
  const ms = `${colors.dim}${Date.now() - req.startTime}ms${colors.reset}`;
  const method = `${colors.cyan}${req.method}${colors.reset}`;
  const url = `${colors.white}${req.url}${colors.reset}`;

  const code = reply.statusCode;
  const statusColor =
    code >= 500
      ? colors.red
      : code >= 400
      ? colors.yellow
      : code >= 300
      ? colors.blue
      : code >= 200
      ? colors.green
      : colors.white;

  const status = `${statusColor}${code}${colors.reset}`;
  console.log(
    `${colors.green}INFO${colors.reset} ${time}: ${method} ${url} ${colors.gray}→${colors.reset} ${status} ${colors.gray}(${ms})${colors.reset}`
  );
});

fastify.register(jwt, {
  secret: process.env.JWT_SECRET_PRIVATE,
  verify: { publicKey: process.env.JWT_SECRET_PUBLIC },
});

fastify.addHook("preHandler", async (request, reply) => {
  if (
    request.method === "GET" ||
    request.url.startsWith(`${DEFAULT_API_URL}/players`) ||
    request.url.startsWith(`${DEFAULT_API_URL}/auth/verify`)
  ) {
    return;
  }

  const verificationToken = request.cookies._bloxdomeVerification;
  if (!verificationToken) {
    return reply.status(401).send({ error: "Unauthorized, no verification token" });
  }

  let decoded;
  try {
    decoded = fastify.jwt.verify(verificationToken);
  } catch (err) {
    return reply.status(401).send({ error: "Unauthorized, invalid verification token" });
  }

  const isAdmin = process.env.ADMIN_IDS.includes(String(decoded.player_id));
  const isReviewer = process.env.REVIEWER_IDS.includes(String(decoded.player_id));

  if (request.method === "POST" && request.url === `${DEFAULT_API_URL}/submissions`) {
    return;
  }

  if ((request.method === "PATCH" || request.method === "POST") && request.url.startsWith(`${DEFAULT_API_URL}/submissions`)) {
    if (!isAdmin || !isReviewer) {
      return reply.status(403).send({ error: "Forbidden for non-admins" });
    }
  }
});

await fastify.register(cors, {
  origin: process.env.CORS_ORIGINS.split(","),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
});

await fastify.register(fastifyRateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX),
  timeWindow: process.env.RATE_LIMIT_WINDOW,
});

fastify.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET,
  parseOptions: {},
});

await fastify.register(fastifyWebSocket);

/* fastify.get("/ws", { websocket: true }, (connection, request) => {
  const socket = connection.socket || connection;

  if (!socket || typeof socket.send !== "function") {
    console.error("Invalid WebSocket connection received");
    return;
  }
  let userId = null;

  try {
    const verificationToken = request.cookies?._bloxdomeVerification;
    if (verificationToken) {
      const decoded = fastify.jwt.verify(verificationToken);
      userId = String(decoded.player_id);
    }

    if (!userId && request.query?.userId) {
      userId = String(request.query.userId);
    }

    if (!userId) {
      userId = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`Anonymous WebSocket connection, assigned ID: ${userId}`);
    }
  } catch (error) {
    console.error("Error extracting user ID:", error);
    userId = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId).add(socket);

  const totalSockets = Array.from(clients.values()).reduce((sum, sockets) => sum + sockets.size, 0);
  console.log(`WebSocket client connected - User: ${userId}, IP: ${request.ip}, Total connections: ${totalSockets}`);

  try {
    socket.send(
      JSON.stringify({
        type: "connection",
        message: "Connected to WebSocket server",
        userId: userId,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.error("Error sending welcome message:", error);
    clients.get(userId)?.delete(socket);
    if (clients.get(userId)?.size === 0) {
      clients.delete(userId);
    }
    return;
  }

  socket.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`Received WebSocket message from user ${userId}:`, message);

      switch (message.type) {
        case "ping":
          socket.send(
            JSON.stringify({
              type: "pong",
              timestamp: new Date().toISOString(),
            })
          );
          break;
        case "subscribe_game":
          console.log(`User ${userId} subscribed to game ${message.gameId}`);
          break;
        default:
          console.log("Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  });

  socket.on("close", (code, reason) => {
    console.log(`WebSocket client disconnected - User: ${userId}, Code: ${code}, Reason: ${reason?.toString()}`);

    const userSockets = clients.get(userId);
    if (userSockets) {
      userSockets.delete(socket);
      if (userSockets.size === 0) {
        clients.delete(userId);
      }
    }

    const totalSockets = Array.from(clients.values()).reduce((sum, sockets) => sum + sockets.size, 0);
    console.log(`Remaining connections: ${totalSockets}`);
  });

  socket.on("error", (error) => {
    console.error(`WebSocket error for user ${userId}:`, error);

    const userSockets = clients.get(userId);
    if (userSockets) {
      userSockets.delete(socket);
      if (userSockets.size === 0) {
        clients.delete(userId);
      }
    }
  });
}); */

/* fastify.get("/test-broadcast", async (request, reply) => {
  const message = {
    type: "test",
    message: "Manual broadcast test",
    timestamp: new Date().toISOString(),
  };

  console.log("Test broadcast endpoint called");
  broadcast(message);

  const totalSockets = Array.from(clients.values()).reduce((sum, sockets) => sum + sockets.size, 0);

  return {
    success: true,
    message: "Broadcast sent",
    clientCount: totalSockets,
    connectedUsers: Array.from(clients.keys()),
    broadcastMessage: message,
  };
}); */

/* fastify.get("/test-notify/:userId", async (request, reply) => {
  const { userId } = request.params;
  const message = {
    type: "user_notification",
    message: `Personal notification for user ${userId}`,
    timestamp: new Date().toISOString(),
  };

  console.log(`Test notification endpoint called for user ${userId}`);
  const sentCount = notifyUsers([userId], message);

  return {
    success: true,
    message: `Notification sent to user ${userId}`,
    sentCount,
    targetUser: userId,
    notificationMessage: message,
  };
}); */

/* fastify.get("/test-game-update/:gameId", async (request, reply) => {
  const { gameId } = request.params;

  console.log(`Test game update notification for game ${gameId}`);
  const sentCount = await notifyGameBookmarkers(gameId, {
    type: "game_codes_updated",
    message: "New codes available for your bookmarked game!",
    timestamp: new Date().toISOString(),
  });

  return {
    success: true,
    message: `Game update notifications sent`,
    gameId,
    sentCount,
  };
}); */

for (const route of routes) await fastify.register(route);

export default fastify;
