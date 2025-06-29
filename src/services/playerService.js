import axios from "axios";
import { ROBLOX_THUMBNAIL_URL, ROBLOX_USERS_URL } from "../utils/config.js";
import { supabase } from "../utils/supabase-client.js";
import { fetchRobloxUser } from "./robloxService.js";

export const fetchPlayers = async ({ q = "", page = 1, limit = 20 }) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let countQuery = supabase.from("players").select("player_id", { count: "exact", head: true });
  if (q) countQuery = countQuery.ilike("username", `%${q}%`);

  const { count: total, error: countError } = await countQuery;
  if (countError) throw countError;
  let query = supabase
    .from("players")
    .select(
      `
      username,
      display_name,
      thumbnail_url,
      thumbnail_circle_url,
      player_id,
      verified!left(player_id),
      is_contributor
    `
    )
    .range(from, to);

  if (q) {
    query = query.ilike("username", `%${q}%`);
  }

  const { data: players, error } = await query;
  if (error) throw error;
  if (!players?.length) return { data: [], total: 0, page, limit, totalPages: 0, hasNextPage: false, hasPrevPage: false };

  const totalPages = Math.ceil(total / limit);

  const data = players.map((p) => ({
    username: p.username,
    display_name: p.display_name,
    thumbnail_url: p.thumbnail_url,
    thumbnail_circle_url: p.thumbnail_circle_url,
    player_id: p.player_id,
    verified: p.verified !== null,
    is_contributor: p.is_contributor,
  }));

  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

export const fetchPlayerById = async (player_id) => {
  const { data, error } = await supabase
    .from("players")
    .select(
      `
      *,
      verified!left(player_id)
    `
    )
    .eq("player_id", player_id)
    .single();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    verified: data.verified !== null,
  };
};

export const updatePlayer = async (player_id) => {
  const robloxUser = await fetchRobloxUser(player_id);
  const [thumbRes, circularRes] = await Promise.all([
    axios.get(`${ROBLOX_THUMBNAIL_URL}/v1/users/avatar?userIds=${player_id}&size=250x250&format=Webp`),
    axios.get(`${ROBLOX_THUMBNAIL_URL}/v1/users/avatar-headshot?userIds=${player_id}&size=150x150&format=Webp&isCircular=true`),
  ]);

  const playerData = {
    username: robloxUser.name,
    display_name: robloxUser.displayName,
    has_verified_badge: robloxUser.hasVerifiedBadge,
    thumbnail_url: thumbRes.data?.data?.[0]?.imageUrl || null,
    thumbnail_circle_url: circularRes.data?.data?.[0]?.imageUrl || null,
    updated_at: new Date().toISOString(),
    last_activity: new Date().toISOString(),
  };

  const { error } = await supabase.from("players").update(playerData).eq("player_id", player_id);

  if (player_id) {
    await supabase.from("players").update({ last_activity: new Date().toISOString() }).eq("player_id", player_id);
  }

  if (error) {
    console.error("Failed to update player:", error.message);
    throw { status: 400, message: "Failed to update player", details: error.message };
  }
};

export const createNewPlayer = async (username, added_by) => {
  const userRes = await axios.post(`${ROBLOX_USERS_URL}/v1/usernames/users`, {
    usernames: [username],
    excludeBannedUsers: false,
  });

  const robloxUser = userRes.data.data?.[0];
  if (!robloxUser) throw { status: 404, message: "User not found on Roblox" };

  const { data: existingPlayer } = await supabase.from("players").select("*").eq("player_id", robloxUser.id).single();

  if (existingPlayer) throw { status: 409, message: "Player already exists" };

  const [thumbRes, circularRes] = await Promise.all([
    axios.get(`${ROBLOX_THUMBNAIL_URL}/v1/users/avatar?userIds=${robloxUser.id}&size=250x250&format=Webp`),
    axios.get(
      `${ROBLOX_THUMBNAIL_URL}/v1/users/avatar-headshot?userIds=${robloxUser.id}&size=150x150&format=Webp&isCircular=true`
    ),
  ]);

  const playerData = {
    player_id: robloxUser.id,
    username: robloxUser.name,
    display_name: robloxUser.displayName,
    has_verified_badge: robloxUser.hasVerifiedBadge,
    thumbnail_url: thumbRes.data?.data?.[0]?.imageUrl || null,
    thumbnail_circle_url: circularRes.data?.data?.[0]?.imageUrl || null,
    updated_at: new Date().toISOString(),
    added_by,
  };

  const { data, error } = await supabase.from("players").insert([playerData]).select().single();
  if (error) throw { status: 400, message: "Failed to create player", details: error.message };

  if (added_by) {
    await supabase
      .from("players")
      .update({ last_activity: new Date().toISOString(), is_contributor: true })
      .eq("player_id", added_by);
  }

  return data;
};

export const toggleBookmark = async (player_id, place_id) => {
  const { data, error } = await supabase.from("players").select("bookmarks").eq("player_id", player_id).single();

  if (error || !data) throw { status: 404, message: "Player not found" };
  let bookmarks = data.bookmarks || [];

  if (!/^\d+$/.test(place_id)) throw { status: 400, message: "Invalid place_id" };

  if (bookmarks.includes(place_id)) {
    bookmarks = bookmarks.filter((id) => id !== place_id);
  } else {
    bookmarks.push(place_id);
  }

  const { error: updateError } = await supabase
    .from("players")
    .update({ bookmarks, last_activity: new Date().toISOString() })
    .eq("player_id", player_id);

  if (updateError) throw { status: 500, message: "Failed to update bookmarks", details: updateError.message };

  if (player_id) {
    await supabase.from("players").update({ last_activity: new Date().toISOString() }).eq("player_id", player_id);
  }
};

export const getBookmarks = async (player_id) => {
  const { data, error } = await supabase.from("players").select("bookmarks").eq("player_id", player_id).single();
  if (error || !data) throw { status: 404, message: "Player not found" };
  return data;
};

export const getBookmarkedGames = async (player_id, codes = "all") => {
  const playerData = await getBookmarks(player_id);
  const ids = playerData.bookmarks;
  if (!ids?.length) return { data: [] };

  const { data: games, error: gamesError } = await supabase.from("games").select("*").in("place_id", ids);
  if (gamesError) throw { status: 500, message: "Failed to fetch games", details: gamesError.message };

  const { data: codesData } = await supabase.from("codes").select("place_id, active").in("place_id", ids);

  const count = codesData.reduce((acc, c) => {
    if (c.active) acc[c.place_id] = (acc[c.place_id] || 0) + 1;
    return acc;
  }, {});

  let gamesWithCodes = games.map((g) => ({
    ...g,
    active_codes: count[g.place_id] || 0,
  }));

  if (codes === "active") gamesWithCodes = gamesWithCodes.filter((g) => g.active_codes > 0);
  else if (codes === "expired") gamesWithCodes = gamesWithCodes.filter((g) => g.active_codes === 0);

  return gamesWithCodes;
};
