import { supabase } from "../utils/supabase-client.js";
import { createOrUpdateCodes } from "./codeService.js";
import { notifySubmissionApproved, notifySubmissionRejected, notifySubmissionReviewComment } from "./notificationService.js";

export const getSubmissions = async ({ status = "", page = 1, limit = 12, player_id } = {}) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("submissions").select(
    `
      *,
      place:place_id ( name, icon_url ),
      submitter:submitted_by ( username, thumbnail_circle_url ),
      comments:id (
        text,
        created_at,
        author:author_id ( username, thumbnail_circle_url )
      ),
      reviewer:reviewed_by ( username, thumbnail_circle_url )
    `,
    { count: "exact" }
  );

  if (player_id) {
    query = query.eq("submitted_by", player_id);
  }

  if (status) {
    query = query.eq("status", status);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const sorted = data.sort((a, b) => {
    const priority = { pending: 0, approved: 1, rejected: 2 };
    return priority[a.status] - priority[b.status];
  });

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: sorted,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

export const getSubmissionById = async (id) => {
  const { data, error } = await supabase.from("submissions").select("*").eq("id", id).single();
  if (error) return { error };
  return { data };
};

export const createSubmission = async (body) => {
  const { count } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("submitted_by", body.submitted_by)
    .eq("status", "pending");

  if (count >= 3) {
    throw {
      status: 403,
      message: "Submission limit reached",
      details: "You can only have 3 pending submissions at a time.",
    };
  }

  const { data, error } = await supabase.from("submissions").insert([
    {
      submitted_by: body.submitted_by,
      place_id: body.place_id,
      change_reason: body.change_reason,
      submission_data: body.submission_data,
    },
  ]);
  if (error) return error;

  if (body.submitted_by) {
    await supabase
      .from("players")
      .update({ last_activity: new Date().toISOString(), is_contributor: true })
      .eq("player_id", submitted_by);
  }

  return { data };
};

export const updateSubmission = async (id, submission_data) => {
  const { data, error } = await supabase.from("submissions").update(submission_data).eq("id", id);
  if (error) return { error };
  return { data };
};

export const approveSubmission = async (id, body) => {
  const { data: submission, error: fetchError } = await supabase
    .from("submissions")
    .select("id, place_id, submitted_by, submission_data")
    .eq("id", id)
    .single();

  if (fetchError) {
    console.error("Submission fetch error:", fetchError);
    throw { status: 404, message: "Submission not found", details: fetchError.message };
  }

  const { reviewed_by } = body;
  const reviewed_at = new Date().toISOString();
  const newCodes = submission.submission_data?.new_codes || [];

  const { error: updateError } = await supabase
    .from("submissions")
    .update({ status: "approved", reviewed_by, reviewed_at })
    .eq("id", id);

  if (updateError) {
    console.error("Submission update error:", updateError);
    throw { status: 400, message: "Failed to approve submission", details: updateError.message };
  }

  const result = await createOrUpdateCodes({
    place_id: submission.place_id,
    added_by: submission.submitted_by,
    updated_by: submission.submitted_by,
    reviewed_by,
    codes: newCodes,
  });

  await notifySubmissionApproved(submission.submitted_by, id);

  if (body.reviewed_by) {
    await supabase.from("players").update({ last_activity: new Date().toISOString() }).eq("player_id", body.reviewed_by);
  }

  return { message: "Approved and codes updated", result };
};

export const rejectSubmission = async (id, body) => {
  const { data: submission, error: fetchError } = await supabase
    .from("submissions")
    .select("id, place_id, submitted_by, submission_data")
    .eq("id", id)
    .single();

  if (fetchError) {
    console.error("Submission fetch error:", fetchError);
    throw { status: 404, message: "Submission not found", details: fetchError.message };
  }

  const { data, error } = await supabase
    .from("submissions")
    .update({ status: "rejected", reviewed_by: body.reviewed_by, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error };
  await notifySubmissionRejected(submission.submitted_by, id);

  if (body.reviewed_by) {
    await supabase.from("players").update({ last_activity: new Date().toISOString() }).eq("player_id", body.reviewed_by);
  }

  return { data };
};

export const commentSubmission = async (id, body) => {
  const { submission_id, text } = body;
  const { data: insertData, error: insertError } = await supabase.from("submission_comments").insert(body);
  if (insertError) return { error: insertError };

  const { data: submission, error: fetchError } = await supabase
    .from("submissions")
    .select("submitted_by")
    .eq("id", submission_id)
    .single();

  if (fetchError || !submission?.submitted_by) return { error: fetchError || "No player found" };
  await notifySubmissionReviewComment(submission.submitted_by, submission_id, text);

  return { data: insertData };
};
