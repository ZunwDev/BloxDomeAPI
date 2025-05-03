import fastifyCookie from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import Fastify from "fastify";

import authRoutes from "./src/routes/auth.js";
import codeRoutes from "./src/routes/codes.js";
import gamesRoutes from "./src/routes/games.js";
import playerRoutes from "./src/routes/players.js";

import dotenv from "dotenv";
dotenv.config();

const fastify = Fastify({
  logger: {
    level: "info",
    redact: {
      paths: ['req.headers["x-api-key"]', "req.headers.cookie", "req.headers.authorization"],
      remove: true,
    },
  },
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

fastify.addHook("preHandler", async (req, reply) => {
  if (req.method !== "GET") {
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== process.env.API_KEY) {
      return reply.code(401).send({ error: "Invalid API Key" });
    }
  }
});

await fastify.register(gamesRoutes);
await fastify.register(playerRoutes);
await fastify.register(authRoutes);
await fastify.register(codeRoutes);

export default fastify;
