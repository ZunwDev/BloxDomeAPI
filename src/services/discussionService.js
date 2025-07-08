import { supabase } from "../utils/supabase-client.js";

export async function fetchDiscussion(placeId, { limit = 10, before } = {}) {
  let query = supabase
    .from("discussion_comments")
    .select(
      `
      *,
      author:players(
        display_name,
        username,
        thumbnail_circle_url,
        player_id,
        is_contributor
      )
    `
    )
    .eq("place_id", placeId)
    .order("created_at", { ascending: false });

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data: comments, error: commentsError } = await query;
  if (commentsError) {
    throw new Error(commentsError.message);
  }
  if (!comments || comments.length === 0) return [];

  const authorIds = [...new Set(comments.map((c) => c.author?.player_id).filter(Boolean))];

  if (authorIds.length === 0) {
    for (const comment of comments) {
      comment.replies = [];
      comment.author = comment.author || {};
      comment.author.verified = false;
    }
  } else {
    const { data: verifiedList, error: verifiedError } = await supabase
      .from("verified")
      .select("player_id")
      .in("player_id", authorIds);

    if (verifiedError) {
      throw new Error(verifiedError.message);
    }

    const verifiedSet = new Set(verifiedList?.map((v) => v.player_id) ?? []);

    for (const comment of comments) {
      comment.replies = [];
      comment.author = comment.author || {};
      comment.author.verified = verifiedSet.has(comment.author.player_id);
    }
  }

  const commentMap = new Map();
  for (const comment of comments) {
    commentMap.set(comment.id, comment);
  }

  const topLevel = [];
  for (const comment of comments) {
    if (comment.parent_id === null) {
      topLevel.push(comment);
    } else {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies.push(comment);
      }
    }
  }

  return topLevel.slice(0, limit);
}

export async function addComment(body) {
  console.log(body);
  if (!body.content?.trim()) throw new Error("Content cannot be empty");

  const { data, error } = await supabase.from("discussion_comments").insert([
    {
      place_id: body.place_id,
      author_id: body.author_id,
      content: body.content,
      is_edited: false,
      is_deleted: false,
      updated_at: new Date().toISOString(),
      parent_id: null,
    },
  ]);
  if (error) throw new Error(error.message);
  return data;
}

export async function addReply(parentId, body) {
  if (!body.content?.trim()) throw new Error("Content cannot be empty");

  const { data: parent, error: parentError } = await supabase
    .from("discussion_comments")
    .select("place_id")
    .eq("id", parentId)
    .single();
  if (parentError || !parent) throw new Error("Parent comment not found");

  const { data, error } = await supabase.from("discussion_comments").insert([
    {
      place_id: parent.place_id,
      parent_id: parentId,
      author_id: body.author_id,
      content: body.content,
      is_edited: false,
      is_deleted: false,
      updated_at: new Date().toISOString(),
    },
  ]);
  if (error) throw new Error(error.message);
  return data;
}

export async function updateComment(commentId, updates) {
  const updatePayload = {};
  if (typeof updates.content === "string" && updates.content.trim()) {
    updatePayload.content = updates.content;
    updatePayload.is_edited = true;
  }
  if (typeof updates.is_deleted === "boolean") {
    updatePayload.is_deleted = updates.is_deleted;
  }
  if (Object.keys(updatePayload).length === 0) {
    throw new Error("Nothing to update");
  }

  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from("discussion_comments").update(updatePayload).eq("id", commentId).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function reportComment(discussionId, body) {
  if (!body.reason?.trim()) throw new Error("Reason is required");

  const { data, error } = await supabase.from("discussion_reports").insert([
    {
      discussion_id: discussionId,
      reported_by: body.reported_by,
      reason: body.reason,
      status: "pending",
    },
  ]);
  if (error) throw new Error(error.message);
  return data;
}
