import dotenv from "dotenv";
import * as authService from "../services/authService.js";
import { withErrorHandler } from "../utils/helpers.js";
dotenv.config();

const isTestMode = String(process.env.TEST_MODE) === "true";

export const createVerification = withErrorHandler(async ({ body }, reply) => {
  const { player_id, username, display_name, thumbnail_circle_url } = body;
  const payload = { player_id, username, display_name, thumbnail_circle_url };

  await authService.ensureVerifiedUser(player_id);
  const { privateToken, publicToken } = authService.createTokens(payload);

  const cookieOptions = {
    sameSite: isTestMode ? "Lax" : "None",
    secure: !isTestMode,
    path: "/",
    domain: isTestMode ? undefined : process.env.COOKIE_DOMAIN,
    maxAge: 60 * 60 * 24 * 60,
  };

  reply.setCookie("_bloxdomeVerification", privateToken, { ...cookieOptions, httpOnly: true });
  reply.setCookie("_bloxdomeData", publicToken, { ...cookieOptions, httpOnly: false });

  return reply.status(201).send({ success: true });
});

export const logout = withErrorHandler(async (_req, reply) => {
  reply.clearCookie("_bloxdomeVerification", {
    path: "/",
    domain: isTestMode ? undefined : process.env.COOKIE_DOMAIN,
    secure: !isTestMode,
  });
  reply.clearCookie("_bloxdomeData", {
    path: "/",
    domain: isTestMode ? undefined : process.env.COOKIE_DOMAIN,
    secure: !isTestMode,
  });
  return reply.status(200).send({ success: true });
});
