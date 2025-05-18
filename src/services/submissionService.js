import { supabase } from "../utils/supabase-client.js";

export const getSubmissionsByPlayer = async (player_id) => {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("player_id", player_id)
    .order("created_at", { ascending: false });
  if (error) return { error };
  return { data };
};

export const getSubmissions = async ({ search = "", status = "", page = 1, limit = 12 } = {}) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from("submissions").select(
    `
			*,
			place:place_id ( name, icon_url ),
			submitter:submitted_by ( username, thumbnail_circle_url ),
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
  return data;
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

export const approveSubmission = async (id) => {
  const { data, error } = await supabase.from("submissions").update({ status: "approved" }).eq("id", id);
  if (error) return { error };
  return { data };
};

export const rejectSubmission = async (id) => {
  const { data, error } = await supabase.from("submissions").update({ status: "rejected" }).eq("id", id);
  if (error) return { error };
  return { data };
};
