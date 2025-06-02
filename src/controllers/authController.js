import dotenv from "dotenv";
import * as authService from "../services/authService.js";
import { sendError } from "../utils/helpers.js";
dotenv.config();

export const createVerification = async (req, reply) => {
  const { player_id, username, display_name, thumbnail_circle_url } = req.body;
  const payload = { player_id, username, display_name, thumbnail_circle_url };

  try {
    await authService.ensureVerifiedUser(player_id);
    const { privateToken, publicToken } = authService.createTokens(payload);

    const cookieOptions = {
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      domain: process.env.COOKIE_DOMAIN,
      maxAge: 60 * 60 * 24 * 60,
    };

    reply.setCookie("_rocodesVerification", privateToken, { ...cookieOptions, httpOnly: true });
    reply.setCookie("_rocodesData", publicToken, { ...cookieOptions, httpOnly: false });

    return reply.send({ success: true });
  } catch (err) {
    return sendError(reply, 500, "Verification failed", err.message);
  }
};

export const logout = async (req, reply) => {
  reply.clearCookie("_rocodesVerification", { path: "/" });
  reply.clearCookie("_rocodesData", { path: "/" });
  return reply.send({ success: true });
};
