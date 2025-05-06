import { supabase } from "../utils/supabase-client.js";

export const createOrUpdateCodes = async ({ place_id, added_by, updated_by, codes = [] }) => {
  const results = { created: [], updated: [], skipped: [], deleted: [] };

  const { data: existingCodes, error: existingError } = await supabase.from("codes").select("*").eq("place_id", place_id);
  if (existingError) throw { status: 500, message: "Fetch existing codes failed", details: existingError.message };

  const incomingCodes = codes.map((c) => c.code);
  const codesToDelete = existingCodes.filter((ec) => !incomingCodes.includes(ec.code));
  const existingMap = Object.fromEntries(existingCodes.map((c) => [c.code, c]));

  if (codesToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("codes")
      .delete()
      .in(
        "id",
        codesToDelete.map((c) => c.id)
      );
    if (deleteError) throw { status: 400, message: "Delete failed", details: deleteError.message };
    results.deleted.push(...codesToDelete);
  }

  const now = new Date().toISOString();
  const bulkInsertData = [];
  const bulkUpdateData = [];

  for (const code of codes) {
    const existing = existingMap[code.code];

    if (!existing) {
      bulkInsertData.push({ ...code, place_id, added_by, updated_at: now });
    } else {
      const isSame =
        JSON.stringify({ rewards: existing.rewards, active: existing.active }) ===
        JSON.stringify({ rewards: code.rewards, active: code.active });
      if (isSame) {
        results.skipped.push(existing);
      } else {
        bulkUpdateData.push({ ...code, id: existing.id, updated_at: now });
      }
    }
  }

  if (bulkInsertData.length) {
    const { data: created, error: insertError } = await supabase.from("codes").insert(bulkInsertData).select();
    if (insertError) throw { status: 400, message: "Insert failed", details: insertError.message };
    results.created.push(...created);
  }

  if (bulkUpdateData.length) {
    const { data: updated, error: updateError } = await supabase
      .from("codes")
      .upsert(bulkUpdateData, { onConflict: ["id"] })
      .select();
    if (updateError) throw { status: 400, message: "Update failed", details: updateError.message };
    results.updated.push(...updated);
  }

  const { error: gameUpdateError } = await supabase
    .from("games")
    .update({ code_updated_by: updated_by, code_updated_at: now })
    .eq("place_id", place_id);
  if (gameUpdateError) throw { status: 400, message: "Game update failed", details: gameUpdateError.message };

  if (added_by) {
    const { error: updateError } = await supabase.from("players").update({ last_activity: now }).eq("player_id", added_by);
    if (updateError) throw { status: 400, message: "Failed to update last activity", details: updateError.message };
  }

  return results;
};
