import fastifyCookie from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import routes from "./src/routes/index.js";

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

for (const route of routes) await fastify.register(route);

export default fastify;
