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
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    //domain: process.env.COOKIE_DOMAIN,
    maxAge: 60 * 60 * 24 * 60,
  };

  reply.setCookie("_rocodesVerification", privateToken, { ...cookieOptions, httpOnly: true });
  reply.setCookie("_rocodesData", publicToken, { ...cookieOptions, httpOnly: false });

  return reply.status(201).send({ success: true });
});

export const logout = withErrorHandler(async (_req, reply) => {
  reply.clearCookie("_rocodesVerification", { path: "/" });
  reply.clearCookie("_rocodesData", { path: "/" });
  return reply.status(200).send({ success: true });
});
