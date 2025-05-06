import dotenv from "dotenv";
import * as authService from "../services/authService.js";
import { sendError } from "../utils/utils.js";
dotenv.config();

export const createVerification = async (req, reply) => {
  const { player_id, username } = req.body;
  const payload = { player_id, username };

  try {
    await authService.ensureVerifiedUser(player_id);
    const { privateToken, publicToken } = authService.createTokens(payload);

    const cookieOptions = {
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
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
