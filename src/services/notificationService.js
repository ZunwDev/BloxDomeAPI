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
		.select("name, place_id")
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
		place_id: game.place_id,
		user_name: reviewer.username,
		user_avatar: reviewer.thumbnail_circle_url,
	};
}

function generateFakeSubmissionId(num) {
	return `#SUB${String(num).padStart(4, "0")}`;
}

export async function sendNotification(
	playerId,
	type,
	metadata,
	global = false,
) {
	const notification = {
		type,
		metadata,
		created_at: new Date().toISOString(),
		...(global ? {} : { player_id: playerId }),
	};

	const { error } = await supabase.from("notifications").insert([notification]);
	if (error) throw error;

	if (!global) {
		sendWebsocketNotification(playerId, notification);
	}
}

export async function fetchNotifications(playerId) {
	const { data: seenRow, error: seenError } = await supabase
		.from("seen_notifications")
		.select("last_seen_at")
		.eq("player_id", playerId)
		.single();

	if (seenError && seenError.code !== "PGRST116") throw seenError;

	const lastSeenAt = seenRow?.last_seen_at ?? "1970-01-01T00:00:00Z";

	const { data: playerRow, error: bookmarkError } = await supabase
		.from("players")
		.select("bookmarks")
		.eq("player_id", playerId)
		.single();

	if (bookmarkError) throw bookmarkError;

	const bookmarks = playerRow?.bookmarks ?? [];
	const bookmarkSet = new Set(bookmarks.map(String));

	const { data: notifs, error: notifError } = await supabase
		.from("notifications")
		.select("*")
		.or(`player_id.eq.${playerId},player_id.is.null`)
		.order("created_at", { ascending: false });

	if (notifError) throw notifError;

	const filtered = notifs.filter((n) => {
		if (n.player_id === playerId) {
			return true;
		}

		if (!n.player_id && n.metadata?.id != null) {
			const metaId = String(n.metadata.id);
			const included = bookmarkSet.has(metaId);
			return included;
		}

		return false;
	});

	return filtered.map((n) => ({
		...n,
		is_new: new Date(n.created_at) > new Date(lastSeenAt),
	}));
}

export async function markAllNotificationsAsSeen(playerId) {
	const { error } = await supabase.from("seen_notifications").upsert(
		{
			player_id: playerId,
			last_seen_at: new Date().toISOString(),
		},
		{ onConflict: "player_id" },
	);

	if (error) throw error;
}

export async function notifySubmissionRejected(playerId, submissionId) {
	const { game_name } = await getGameAndReviewer(submissionId);
	const fakeSubmissionId = generateFakeSubmissionId(submissionId);

	return sendNotification(playerId, "SUBMISSION_REJECTED", {
		id: submissionId,
		message: `Your submission (${fakeSubmissionId}) for ${game_name} was rejected.`,
		title: "Your submission was rejected",
		link: "/submissions",
		see_text: "submissions",
	});
}

export async function notifySubmissionApproved(playerId, submissionId) {
	const { game_name, place_id } = await getGameAndReviewer(submissionId);
	const fakeSubmissionId = generateFakeSubmissionId(submissionId);

	await sendNotification(playerId, "SUBMISSION_APPROVED", {
		id: submissionId,
		message: `Your submission (${fakeSubmissionId}) for ${game_name} was approved.`,
		title: "Your submission was approved",
		link: "/submissions",
		see_text: "submissions",
	});

	return sendNotification(
		null,
		"CODES_UPDATED",
		{
			id: place_id,
			message: `The codes for ${game_name} have been updated!`,
			title: "Codes have been updated",
			link: `/games/${place_id}`,
			see_text: "submissions",
		},
		true,
	);
}

export async function notifySubmissionReviewComment(
	playerId,
	submissionId,
	comment,
) {
	return sendNotification(playerId, "REVIEWER_COMMENT_CREATED", {
		id: submissionId,
		title: `Your submission (${generateFakeSubmissionId(submissionId)}) received a comment`,
		message: `A reviewer left feedback: "${comment}"`,
		link: "/submissions",
	});
}

export async function notifySuccessfulVerification(playerId) {
	return sendNotification(playerId, "VERIFICATION_SUCCESSFUL", {
		message: "Thanks for verifying — your account is now fully active.",
		title: "You're verified!",
	});
}

export async function notifyDiscussionReply(parent, replier, gameName) {
	return sendNotification(parent.author_id, "DISCUSSION_REPLY", {
		id: parent.place_id,
		title: `**${replier.username}** replied to your comment on **${gameName}**`,
		message: "They just replied to your comment — check it out!",
		username: replier.username,
		user_avatar: replier.thumbnail_circle_url,
		link: `/games/${parent.place_id}#discussion`,
		see_text: "discussion",
	});
}
