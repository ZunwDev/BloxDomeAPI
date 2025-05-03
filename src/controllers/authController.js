import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { supabase } from "../utils/supabase-client.js";
import { sendError } from "../utils/utils.js";
dotenv.config();

export const createVerification = async (req, reply) => {
  const { player_id, username } = req.body;
  const token = jwt.sign({ player_id, username }, process.env.JWT_SECRET, { expiresIn: "60d" });

  const { data: existing, error: fetchError } = await supabase.from("verified").select("*").eq("player_id", player_id).single();

  if (fetchError && fetchError.code !== "PGRST116") {
    return sendError(reply, 500, "Fetch failed", fetchError.message || fetchError);
  }

  let result;
  let error;

  if (existing) {
    ({ data: result, error } = await supabase.from("verified").update({ jwt_token: token }).eq("player_id", player_id));
  } else {
    ({ data: result, error } = await supabase.from("verified").insert([{ player_id, jwt_token: token }]));
  }

  if (error) return sendError(reply, 500, "Save failed", error.message || error);

  reply.setCookie("_rocodesVerification", token, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });

  reply.setCookie("_rocodesData", token, {
    httpOnly: false,
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });

  return reply.send({ success: true, token });
};

export const logout = async (req, reply) => {
  reply.clearCookie("_rocodesVerification", { path: "/" });
  reply.clearCookie("_rocodesData", { path: "/" });
  return reply.send({ success: true });
};

export default { createVerification, logout };
