import axios from "axios";
import dotenv from "dotenv";
import * as authService from "../services/authService.js";
import { notifySuccessfulVerification } from "../services/notificationService.js";
import { withErrorHandler } from "../utils/helpers.js";
dotenv.config();

const isTestMode = String(process.env.TEST_MODE) === "true";

export const callback = async (req, reply) => {
  const code = req.query.code;
  if (!code) {
    return reply.code(400).send("Missing code");
  }

  try {
    const tokenRes = await axios.post(
      "https://apis.roblox.com/oauth/v1/token",
      new URLSearchParams({
        client_id: process.env.ROBLOX_CLIENT_ID,
        client_secret: process.env.ROBLOX_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: isTestMode
          ? "http://localhost:3001/api/v1/auth/callback"
          : "https://api.bloxdome.com/api/v1/auth/callback",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) {
      return reply.code(500).send("Failed to get access token");
    }

    const userInfoRes = await axios.get("https://apis.roblox.com/oauth/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const { sub, name, preferred_username } = userInfoRes.data;
    const player_id = sub.replace("roblox|", "");

    const thumbRes = await axios.get(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${player_id}&size=150x150&format=Webp&isCircular=true`
    );

    const thumbnail_circle_url = thumbRes.data.data?.[0]?.imageUrl || "";

    const payload = {
      player_id,
      username: preferred_username,
      display_name: name,
      thumbnail_circle_url,
      verified: true,
    };

    await authService.ensureVerifiedUser(player_id);
    const { privateToken, publicToken } = authService.createTokens(payload);

    const cookieOptions = {
      sameSite: isTestMode ? "Lax" : "None",
      secure: !isTestMode,
      path: "/",
      domain: isTestMode ? undefined : process.env.COOKIE_DOMAIN,
      maxAge: 60 * 60 * 24 * 60,
    };

    reply.setCookie("_bloxdomeVerification", privateToken, {
      ...cookieOptions,
      httpOnly: true,
    });
    reply.setCookie("_bloxdomeData", publicToken, {
      ...cookieOptions,
      httpOnly: false,
    });

    reply.redirect(isTestMode ? "http://localhost:3000" : "https://bloxdome.com");
    setTimeout(async () => await notifySuccessfulVerification(player_id), 10000);
  } catch (err) {
    console.error("OAuth callback failed:", err);
    if (err.response?.data) {
      console.error("Axios error response data:", err.response.data);
    }
    return reply.code(500).send("OAuth verification failed");
  }
};

export const createVerification = withErrorHandler(async ({ body }, reply) => {
  const { player_id, username, display_name, thumbnail_circle_url } = body;
  const payload = { player_id, username, display_name, thumbnail_circle_url, verified: true };

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

  reply.status(201).send({ success: true });
  setTimeout(async () => await notifySuccessfulVerification(player_id), 10000);
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
