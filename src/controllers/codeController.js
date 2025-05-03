import { supabase } from "../utils/supabase-client.js";
import { sendError } from "../utils/utils.js";

const createCode = async (req, reply) => {
  const { place_id, added_by, updated_by, codes = [] } = req.body;
  const results = { created: [], updated: [], skipped: [], deleted: [] };

  const { data: existingCodes, error: existingError } = await supabase.from("codes").select("*").eq("place_id", place_id);

  if (existingError) return sendError(reply, 500, "Fetch existing codes failed", existingError.message);

  const incomingCodes = codes.map((c) => c.code);
  const codesToDelete = existingCodes.filter((ec) => !incomingCodes.includes(ec.code));

  if (codesToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("codes")
      .delete()
      .in(
        "id",
        codesToDelete.map((code) => code.id)
      );

    if (deleteError) {
      return sendError(reply, 400, "Delete failed", deleteError.message);
    }
    results.deleted.push(...codesToDelete);
  }

  const bulkInsertData = [];
  const bulkUpdateData = [];
  const codesToSkip = [];

  for (const code of codes) {
    const { data: existing, error: fetchError } = await supabase
      .from("codes")
      .select("*")
      .eq("place_id", place_id)
      .eq("code", code.code)
      .maybeSingle();

    if (fetchError) return sendError(reply, 500, "Fetch failed", fetchError.message);

    if (!existing) {
      bulkInsertData.push({ ...code, place_id, added_by, updated_at: new Date().toISOString() });
    } else {
      const isSame =
        JSON.stringify({
          rewards: existing.rewards,
          active: existing.active,
        }) ===
        JSON.stringify({
          rewards: code.rewards,
          active: code.active,
        });

      if (isSame) {
        codesToSkip.push(existing);
      } else {
        bulkUpdateData.push({ ...code, updated_at: new Date().toISOString(), id: existing.id });
      }
    }
  }

  if (bulkInsertData.length > 0) {
    const { data: created, error: insertError } = await supabase.from("codes").insert(bulkInsertData).select();

    if (insertError) return sendError(reply, 400, "Insert failed", insertError.message);
    results.created.push(...created);
  }

  if (bulkUpdateData.length > 0) {
    const { data: updated, error: updateError } = await supabase
      .from("codes")
      .upsert(bulkUpdateData, { onConflict: ["id"] })
      .select();

    if (updateError) {
      return sendError(reply, 400, "Update failed", updateError.message);
    }
    results.updated.push(...updated);
  }

  results.skipped.push(...codesToSkip);

  const { error: gameUpdateError } = await supabase
    .from("games")
    .update({
      code_updated_by: updated_by,
      code_updated_at: new Date().toISOString(),
    })
    .eq("place_id", place_id);

  if (gameUpdateError) return sendError(reply, 400, "Game update failed", gameUpdateError.message);

  return reply.status(200).send(results);
};

export default { createCode };
