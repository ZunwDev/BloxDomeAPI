import jwt from "jsonwebtoken";
import { supabase } from "../utils/supabase-client.js";

export const createTokens = (payload) => {
  const privateToken = jwt.sign(payload, process.env.JWT_SECRET_PRIVATE, { expiresIn: "60d" });
  const publicToken = jwt.sign(payload, process.env.JWT_SECRET_PUBLIC, { expiresIn: "60d" });
  return { privateToken, publicToken };
};

export const ensureVerifiedUser = async (player_id) => {
  const now = new Date().toISOString();

  const { data: existing, error: fetchError } = await supabase
    .from("verified")
    .select("player_id")
    .eq("player_id", player_id)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (!existing) {
    const { error: insertError } = await supabase.from("verified").insert([{ player_id, verified_at: now }]);
    if (insertError) throw insertError;

    if (player_id) {
      await supabase.from("players").update({ last_activity: now }).eq("player_id", player_id);
    }
  } else {
    const { error: updateError } = await supabase.from("verified").update({ verified_at: now }).eq("player_id", player_id);
    if (updateError) throw updateError;

    if (player_id) {
      await supabase.from("players").update({ last_activity: now }).eq("player_id", player_id);
    }
  }
};
