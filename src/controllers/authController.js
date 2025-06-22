import dotenv from "dotenv";
import * as authService from "../services/authService.js";
import { withErrorHandler } from "../utils/helpers.js";
dotenv.config();

export const createVerification = withErrorHandler(async ({ body }, reply) => {
  const { player_id, username, display_name, thumbnail_circle_url } = body;
  const payload = { player_id, username, display_name, thumbnail_circle_url };

  await authService.ensureVerifiedUser(player_id);
  const { privateToken, publicToken } = authService.createTokens(payload);

  const cookieOptions = {
    sameSite: process.env.TEST_MODE === "true" ? "Lax" : "None",
    secure: !process.env.TEST_MODE === "true",
    path: "/",
    domain: process.env.TEST_MODE === "true" ? undefined : process.env.COOKIE_DOMAIN,
    maxAge: 60 * 60 * 24 * 60,
  };

  reply.setCookie("_bloxdomeVerification", privateToken, { ...cookieOptions, httpOnly: true });
  reply.setCookie("_bloxdomeData", publicToken, { ...cookieOptions, httpOnly: false });

  return reply.status(201).send({ success: true });
});

export const logout = withErrorHandler(async (_req, reply) => {
  reply.clearCookie("_bloxdomeVerification", {
    path: "/",
    domain: process.env.COOKIE_DOMAIN,
    secure: !process.env.TEST_MODE === "true",
  });
  reply.clearCookie("_bloxdomeData", {
    path: "/",
    domain: process.env.COOKIE_DOMAIN,
    secure: !process.env.TEST_MODE === "true",
  });
  return reply.status(200).send({ success: true });
});
