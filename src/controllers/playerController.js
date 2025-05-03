import axios from "axios";
import dotenv from "dotenv";
import { supabase } from "../utils/supabase-client.js";
import { sendError } from "../utils/utils.js";
dotenv.config();

const getPlayers = async (req, reply) => {
  const { q = "", page = 1, perPage = 20 } = req.query;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase.from("players").select("*");

  if (q) {
    query = query.ilike("username", `%${q}%`);
  }

  const { data, error } = await query.range(from, to);

  if (error) return sendError(reply, 500, "Failed to fetch players", error.message);

  return reply.send(data);
};

const getPlayer = async (req, reply) => {
  const { player_id } = req.params;
  const { data, error } = await supabase.from("players").select("*").eq("player_id", player_id).single();

  if (error) return sendError(reply, 404, "Player not found");

  return reply.send(data);
};

const createPlayer = async (req, reply) => {
  const { username, added_by } = req.body;

  try {
    const userRes = await axios.post("https://users.roblox.com/v1/usernames/users", {
      usernames: [username],
      excludeBannedUsers: false,
    });

    const robloxUser = userRes.data.data?.[0];
    if (!robloxUser) return sendError(reply, 404, "User not found on Roblox");

    const { data: existingPlayer } = await supabase.from("players").select("*").eq("player_id", robloxUser.id).single();

    if (existingPlayer) return sendError(reply, 409, "Player already exists", "Player already in database.");

    const [thumbRes, circularRes] = await Promise.all([
      axios.get(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${robloxUser.id}&size=250x250&format=Webp`),
      axios.get(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxUser.id}&size=150x150&format=Webp&isCircular=true`
      ),
    ]);

    const playerData = {
      player_id: robloxUser.id,
      username: robloxUser.name,
      display_name: robloxUser.displayName,
      has_verified_badge: robloxUser.hasVerifiedBadge,
      thumbnail_url: thumbRes.data?.data?.[0]?.imageUrl || null,
      thumbnail_circle_url: circularRes.data?.data?.[0]?.imageUrl || null,
      added_by,
    };

    const { data, error } = await supabase.from("players").insert([playerData]).select().single();
    if (error) return sendError(reply, 400, "Failed to create player", error.message);

    return reply.status(201).send(data);
  } catch (error) {
    console.error(error);
    return sendError(reply, 500, "Internal server error");
  }
};

const updateBookmarks = async (req, reply) => {
  const { player_id } = req.params;
  const { place_id } = req.body;

  const { data: playerData, error: playerError } = await supabase
    .from("players")
    .select("bookmarks")
    .eq("player_id", player_id)
    .single();

  if (playerError || !playerData) return sendError(reply, 500, "Player not found", playerError?.message);
  let bookmarks = Array.isArray(playerData.bookmarks) ? playerData.bookmarks : [];

  const placeIdNumber = Number(place_id);
  if (Number.isNaN(placeIdNumber)) return sendError(reply, 400, "Invalid place_id");

  if (bookmarks.includes(placeIdNumber)) {
    bookmarks = bookmarks.filter((id) => id !== placeIdNumber);
  } else {
    bookmarks.push(placeIdNumber);
  }

  const { error: updateError } = await supabase.from("players").update({ bookmarks }).eq("player_id", player_id);
  if (updateError) return sendError(reply, 500, "Failed to update bookmarks", updateError.message);

  reply.send({ success: true, bookmarks });
};

const getBookmarkIds = async (req, reply) => {
  const { player_id } = req.params;

  const { data: playerData, error: playerError } = await supabase
    .from("players")
    .select("bookmarks")
    .eq("player_id", player_id)
    .single();

  if (playerError || !playerData) return sendError(reply, 500, "Player not found", playerError?.message);
  const bookmarkPlaceIds = playerData.bookmarks;

  return reply.send({ data: bookmarkPlaceIds });
};

const getBookmarkedGames = async (req, reply) => {
  const { player_id } = req.params;
  const { codes = "all" } = req.query;

  const { data: playerData, error: playerError } = await supabase
    .from("players")
    .select("bookmarks")
    .eq("player_id", player_id)
    .single();

  if (playerError || !playerData) {
    return sendError(reply, 500, "Player not found", playerError?.message);
  }

  const bookmarkPlaceIds = playerData.bookmarks;
  if (!bookmarkPlaceIds?.length) {
    return reply.send({ data: [] });
  }

  const { data: games, error: gamesError } = await supabase.from("games").select("*").in("place_id", bookmarkPlaceIds);

  if (gamesError) {
    return sendError(reply, 500, "Failed to fetch games", gamesError.message);
  }

  const placeIds = games.map((game) => game.place_id);
  const { data: codesData, error: codesError } = await supabase
    .from("codes")
    .select("place_id, active")
    .in("place_id", placeIds);

  if (codesError) {
    return sendError(reply, 500, "Failed to fetch codes", codesError.message);
  }

  const activeCodesCount = codesData.reduce((acc, code) => {
    if (code.active) acc[code.place_id] = (acc[code.place_id] || 0) + 1;
    return acc;
  }, {});

  let gamesWithCodes = games.map((game) => ({
    ...game,
    active_codes: activeCodesCount[game.place_id] || 0,
  }));

  if (codes === "active") {
    gamesWithCodes = gamesWithCodes.filter((g) => g.active_codes > 0);
  } else if (codes === "expired") {
    gamesWithCodes = gamesWithCodes.filter((g) => g.active_codes === 0);
  }

  reply.send({ data: gamesWithCodes });
};

export default {
  getPlayers,
  getPlayer,
  createPlayer,
  updateBookmarks,
  getBookmarkIds,
  getBookmarkedGames,
};
