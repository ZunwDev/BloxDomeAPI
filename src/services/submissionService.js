import { supabase } from "../utils/supabase-client.js";

export const getSubmissionsByPlayer = async (player_id) => {
  const { data, error } = await supabase.from("submissions").select("*").eq("player_id", player_id);
  if (error) return { error };
  return { data };
};

export const getSubmissionsByGame = async (place_id) => {
  const { data, error } = await supabase.from("submissions").select("*").eq("place_id", place_id);
  if (error) return { error };
  return { data };
};

export const getSubmissionById = async (id) => {
  const { data, error } = await supabase.from("submissions").select("*").eq("id", id).single();
  if (error) return { error };
  return { data };
};

export const createSubmission = async (player_id, place_id, submission_data) => {
  const { data, error } = await supabase.from("submissions").insert([{ submitted_by: player_id, place_id, submission_data }]);
  if (error) return { error };
  return { data };
};

export const updateSubmission = async (id, submission_data) => {
  const { data, error } = await supabase.from("submissions").update(submission_data).eq("id", id);
  if (error) return { error };
  return { data };
};
