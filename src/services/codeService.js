import { supabase } from "../utils/supabase-client.js";

export const createOrUpdateCodes = async ({ place_id, added_by, updated_by, reviewed_by, codes = [] }) => {
  const results = { created: [], updated: [], skipped: [], deleted: [] };
  const now = new Date().toISOString();

  console.log("[DEBUG] Incoming codes:", codes);

  // Fetch existing codes
  const { data: existingCodes, error: existingError } = await supabase.from("codes").select("*").eq("place_id", place_id);

  if (existingError) {
    console.error("[ERROR] Fetching existing codes:", existingError);
    throw {
      status: 500,
      message: "Fetch existing codes failed",
      details: existingError.message,
    };
  }

  console.log("[DEBUG] Existing codes:", existingCodes);

  const existingMap = Object.fromEntries(existingCodes.map((c) => [c.code, c]));
  const incomingCodeSet = new Set(codes.map((c) => c.code));

  // DELETE codes not in the new list
  const codesToDelete = existingCodes.filter((ec) => !incomingCodeSet.has(ec.code));

  if (codesToDelete.length > 0) {
    console.log(
      "[DEBUG] Codes to delete:",
      codesToDelete.map((c) => c.code)
    );
    const { error: deleteError } = await supabase
      .from("codes")
      .delete()
      .in(
        "id",
        codesToDelete.map((c) => c.id)
      );
    if (deleteError) {
      console.error("[ERROR] Deleting codes:", deleteError);
      throw { status: 400, message: "Delete failed", details: deleteError.message };
    }
    results.deleted = codesToDelete;
  }

  // Prepare insert/update/skip
  const toInsert = [];
  const toUpdate = [];

  for (const code of codes) {
    const existing = existingMap[code.code];

    if (!existing) {
      // Make sure you set all required fields
      toInsert.push({
        ...code,
        place_id,
        added_by,
        updated_at: now,
        created_at: now,
      });
    } else {
      // Compare rewards and active status
      const isSame = existing.rewards === code.rewards && existing.active === code.active;

      if (isSame) {
        results.skipped.push(existing);
      } else {
        toUpdate.push({
          ...code,
          id: existing.id,
          updated_at: now,
        });
      }
    }
  }

  if (toInsert.length > 0) {
    console.log(
      "[DEBUG] Codes to insert:",
      toInsert.map((c) => c.code)
    );
    const { data, error } = await supabase.from("codes").insert(toInsert).select();
    if (error) {
      console.error("[ERROR] Inserting codes:", error);
      throw { status: 400, message: "Insert failed", details: error.message };
    }
    results.created = data;
  }

  if (toUpdate.length > 0) {
    console.log(
      "[DEBUG] Codes to update:",
      toUpdate.map((c) => c.code)
    );
    const { data, error } = await supabase
      .from("codes")
      .upsert(toUpdate, { onConflict: ["id"] })
      .select();
    if (error) {
      console.error("[ERROR] Updating codes:", error);
      throw { status: 400, message: "Update failed", details: error.message };
    }
    results.updated = data;
  }

  // Update game meta
  const { error: gameError } = await supabase
    .from("games")
    .update({
      code_updated_by: updated_by,
      code_updated_at: now,
      code_reviewed_by: reviewed_by,
    })
    .eq("place_id", place_id);

  if (gameError) {
    console.error("[ERROR] Updating game meta:", gameError);
    throw {
      status: 400,
      message: "Game update failed",
      details: gameError.message,
    };
  }

  console.log("[DEBUG] Operation results:", results);
  return results;
};

export const getCodesByPlaceId = async (place_id) => supabase.from("codes").select("*").eq("place_id", place_id);
