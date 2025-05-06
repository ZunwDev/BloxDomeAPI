import fastifyCookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastifyRateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import routes from "./src/routes/index.js";
import { DEFAULT_API_URL } from "./src/utils/config.js";

import dotenv from "dotenv";
dotenv.config();

const fastify = Fastify({
  logger: {
    level: "info",
    redact: {
      paths: ["req.headers.cookie", "req.headers.authorization"],
      remove: true,
    },
  },
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

  const verificationToken = request.cookies._rocodesVerification;
  if (!verificationToken) {
    return reply.status(401).send({ error: "Unauthorized, no verification token" });
  }

  try {
    fastify.jwt.verify(verificationToken);
  } catch (err) {
    return reply.status(401).send({ error: "Unauthorized, invalid verification token" });
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
