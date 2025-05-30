import { supabase } from "../utils/supabase-client.js";
import { createOrUpdateCodes } from "./codeService.js";

export const getSubmissionsByPlayer = async (player_id, { search = "", status = "", page = 1, limit = 12 }) => {
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

  query = query.eq("submitted_by", player_id);

  if (status) {
    query = query.eq("status", status);
  }

  if (search.trim()) {
    query = query.or(`place_id.ilike.%${search}%,submitted_by.ilike.%${search}%`);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const sorted = data.sort((a, b) => {
    const priority = { pending: 0, approved: 1, rejected: 2 };
    return priority[a.status] - priority[b.status];
  });

  return sorted;
};

export const getSubmissions = async ({ search = "", status = "", page = 1, limit = 12 } = {}) => {
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

  if (status) {
    query = query.eq("status", status);
  }

  if (search.trim()) {
    query = query.or(`place_id.ilike.%${search}%,submitted_by.ilike.%${search}%`);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const sorted = data.sort((a, b) => {
    const priority = { pending: 0, approved: 1, rejected: 2 };
    return priority[a.status] - priority[b.status];
  });

  return sorted;
};

export const getSubmissionById = async (id) => {
  const { data, error } = await supabase.from("submissions").select("*").eq("id", id).single();
  if (error) return { error };
  return { data };
};

export const createSubmission = async (body) => {
  const { data, error } = await supabase.from("submissions").insert([
    {
      submitted_by: body.submitted_by,
      place_id: body.place_id,
      change_reason: body.change_reason,
      submission_data: body.submission_data,
    },
  ]);
  if (error) return { error };
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

  if (fetchError) throw { status: 404, message: "Submission not found", details: fetchError.message };

  const { reviewed_by } = body;
  const reviewed_at = new Date().toISOString();

  const newCodes = submission.submission_data[0].new_codes || [];

  const { error: updateError } = await supabase
    .from("submissions")
    .update({ status: "approved", reviewed_by, reviewed_at })
    .eq("id", id);

  if (updateError) throw { status: 400, message: "Failed to approve submission", details: updateError.message };

  const result = await createOrUpdateCodes({
    place_id: submission.place_id,
    added_by: submission.submitted_by,
    updated_by: submission.submitted_by,
    reviewed_by,
    codes: newCodes,
  });

  return { message: "Approved and codes updated", result };
};

export const rejectSubmission = async (id, body) => {
  const { data, error } = await supabase
    .from("submissions")
    .update({ status: "rejected", reviewed_by: body.reviewed_by, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error };
  return { data };
};

export const commentSubmission = async (id, body) => {
  const { data, error } = await supabase.from("submission_comments").insert(body);
  if (error) return { error };
  return { data };
};
