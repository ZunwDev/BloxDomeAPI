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
  methods: ["GET", "POST", "PUT", "PATCH"],
});

await fastify.register(fastifyRateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX),
  timeWindow: process.env.RATE_LIMIT_WINDOW,
  ban: 2,
  errorResponseBuilder: (req, context) => ({
    statusCode: 429,
    error: "Too Many Requests",
    message: `Rate limit exceeded. Try again in ${context.after}`,
  }),
});

fastify.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET,
  parseOptions: {},
});

await fastify.register(fastifyWebSocket);

import websocketHandler from "./src/websocket/websocketHandler.js";
await websocketHandler(fastify);

for (const route of routes) await fastify.register(route);

export default fastify;
