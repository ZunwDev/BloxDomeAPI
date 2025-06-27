import { supabase } from "../utils/supabase-client.js";
import { sendWebsocketNotification } from "../websocket/utils/sendNotification.js";

async function getGameAndReviewer(submissionId) {
  const { data: submission, error: subError } = await supabase
    .from("submissions")
    .select("place_id, reviewed_by")
    .eq("id", submissionId)
    .single();

  if (subError) {
    console.error("Supabase error loading submission:", subError.message);
    throw new Error("Failed to fetch submission.");
  }

  if (!submission) {
    console.error("Submission not found for ID:", submissionId);
    throw new Error("Submission not found.");
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("name")
    .eq("place_id", submission.place_id)
    .single();

  if (gameError) {
    console.error("Error fetching game name:", gameError.message);
    throw new Error("Game not found.");
  }

  const { data: reviewer, error: reviewerError } = await supabase
    .from("players")
    .select("username, thumbnail_circle_url")
    .eq("player_id", submission.reviewed_by)
    .single();

  if (reviewerError) {
    console.error("Error fetching reviewer info:", reviewerError.message);
    throw new Error("Reviewer not found.");
  }

  if (!reviewer) {
    console.error("Reviewer data is null for ID:", submission.reviewed_by);
    throw new Error("Reviewer not found.");
  }

  return {
    game_name: game.name,
    user_name: reviewer.username,
    user_avatar: reviewer.thumbnail_circle_url,
  };
}

function generateFakeSubmissionId(num) {
  return `#SUB${String(num).padStart(4, "0")}`;
}

async function insertNotification(playerId, type, payload) {
  const notification = {
    player_id: playerId,
    type,
    payload,
    seen: false,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("notifications").insert([notification]);
  if (error) throw error;

  sendWebsocketNotification(playerId, notification);
}

export async function fetchNotifications(playerId) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function markNotificationAsSeen(notificationId) {
  const { error } = await supabase.from("notifications").update({ seen: true }).eq("id", notificationId);
  if (error) throw error;
}

export async function markAllNotificationsAsSeen(playerId) {
  const { error } = await supabase.from("notifications").update({ seen: true }).eq("player_id", playerId);
  if (error) throw error;
}

export async function notifySubmissionRejected(playerId, submissionId) {
  const { game_name } = await getGameAndReviewer(submissionId);

  const fakeSubmissionId = generateFakeSubmissionId(submissionId);

  const title = "Your submission was rejected";
  const message = `Your submission (${fakeSubmissionId}) for ${game_name} was rejected.`;

  return insertNotification(playerId, "SUBMISSION_REJECTED", {
    id: submissionId,
    message,
    title,
    game_name,
    link: "/submissions",
  });
}

export async function notifySubmissionApproved(playerId, submissionId) {
  const { game_name } = await getGameAndReviewer(submissionId);

  const fakeSubmissionId = generateFakeSubmissionId(submissionId);

  const title = "Your submission was approved";
  const message = `Your submission (${fakeSubmissionId}) for ${game_name} was approved.`;

  return insertNotification(playerId, "SUBMISSION_APPROVED", {
    id: submissionId,
    message,
    title,
    game_name,
    link: "/submissions",
  });
}
