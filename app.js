import fastifyCookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastifyRateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import routes from "./src/routes/index.js";
import { DEFAULT_API_URL } from "./src/utils/config.js";

import dotenv from "dotenv";
dotenv.config();

const isDev = process.env.NODE_ENV !== "production";

const baseLogger = {
  level: isDev ? "debug" : "info",
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "req.body.password",
      "req.body.token",
      "req.headers['x-api-key']",
    ],
    remove: true,
  },
  serializers: {
    req(request) {
      return {
        method: request.method,
        url: request.url,
        remoteAddress: request.ip,
        headers: {
          host: request.headers.host,
          "user-agent": request.headers["user-agent"],
        },
      };
    },
    res(reply) {
      return {
        statusCode: reply.statusCode,
      };
    },
  },
};

const devLogger = {
  ...baseLogger,
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
};

const fastify = Fastify({
  logger: isDev ? devLogger : baseLogger,
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

for (const route of routes) await fastify.register(route);

export default fastify;
