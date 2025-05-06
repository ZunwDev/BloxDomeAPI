import axios from "axios";
import { ROBLOX_API_URL, ROBLOX_GAMES_URL, ROBLOX_THUMBNAIL_URL } from "../utils/config.js";
import { supabase } from "../utils/supabase-client.js";

export const fetchGames = async (queryParams) => {
  const { page = 1, limit = 12, sort = "latest", updated = "all", genre_id, codes = "all", search = "" } = queryParams;
  const offset = (page - 1) * limit;

  let query = supabase.from("games").select("*");
  if (genre_id) query = query.eq("genre_id", genre_id);
  if (search.trim()) query = query.ilike("name", `%${search.trim()}%`);

  if (updated !== "all") {
    const daysMap = { one_day: 1, three_days: 3, week: 7 };
    const days = daysMap[updated];
    if (days) {
      const dateThreshold = new Date(Date.now() - days * 864e5).toISOString();
      query = query.gte("updated_at", dateThreshold);
    }
  }

  query =
    sort === "most_players" ? query.order("playing", { ascending: false }) : query.order("updated_at", { ascending: false });

  query = query.range(offset, offset + limit - 1);

  const { data: games, error } = await query;
  if (error) throw new Error(error.message);
  if (!games.length) return [];

  const placeIds = games.map((g) => g.place_id);
  const { data: codesData, error: codesError } = await supabase
    .from("codes")
    .select("place_id, active")
    .in("place_id", placeIds);
  if (codesError) throw new Error(codesError.message);

  const activeCodesCount = codesData.reduce((acc, code) => {
    if (code.active) acc[code.place_id] = (acc[code.place_id] || 0) + 1;
    return acc;
  }, {});

  let gamesWithCodes = games.map((game) => ({
    ...game,
    active_codes: activeCodesCount[game.place_id] || 0,
  }));

  if (codes === "with-codes") gamesWithCodes = gamesWithCodes.filter((g) => g.active_codes > 0);
  if (codes === "without-codes") gamesWithCodes = gamesWithCodes.filter((g) => g.active_codes === 0);

  return gamesWithCodes;
};

export const fetchGameDetails = async (place_id) => {
  const { data: game, error } = await supabase.from("games").select("*").eq("place_id", place_id).single();
  if (error || !game) throw new Error("Game not found");

  const [{ data: genre }, { data: codes }, { data: player }] = await Promise.all([
    supabase.from("genres").select("name").eq("id", game.genre_id).single(),
    supabase.from("codes").select("*").eq("place_id", place_id),
    game.code_updated_by
      ? supabase.from("players").select("username").eq("player_id", game.code_updated_by).single()
      : { data: null },
  ]);

  return {
    ...game,
    genre: genre?.name || null,
    username: player?.username || null,
    active_codes: codes?.filter((c) => c.active),
    expired_codes: codes?.filter((c) => !c.active),
  };
};

export const fetchSimilarGames = async (place_id) => {
  const { data: game, error } = await supabase.from("games").select("genre_id, name").eq("place_id", place_id).single();
  if (error || !game) throw new Error("Game not found");

  const keywords = [
    "Anime",
    "Simulator",
    "Incremental",
    "Farming",
    "Tycoon",
    "Fighting",
    "Defense",
    "Tower",
    "Clicker",
    "RPG",
    "Idle",
    "Adventure",
    "Strategy",
    "Arena",
    "War",
    "Survival",
  ];
  const match = keywords.find((k) => game.name.toLowerCase().includes(k.toLowerCase()));

  let query = supabase.from("games").select("*").neq("place_id", place_id);
  query = match ? query.ilike("name", `%${match}%`) : query.eq("genre_id", game.genre_id);

  let { data } = await query.limit(10);
  if (!data.length && match) {
    const fallback = await supabase.from("games").select("*").neq("place_id", place_id).eq("genre_id", game.genre_id).limit(10);
    data = fallback.data;
  }

  return data;
};

export const createGame = async (place_id, added_by) => {
  const { data: exists } = await supabase.from("games").select("*").eq("place_id", place_id).single();
  if (exists) throw new Error("Game already exists");

  const universeRes = await axios.get(`${ROBLOX_API_URL}/universes/v1/places/${place_id}/universe`);
  const universe_id = universeRes.data?.universeId;
  if (!universe_id) throw new Error("Invalid place_id");

  const [iconRes, thumbRes, gamesRes] = await Promise.all([
    axios.get(`${ROBLOX_THUMBNAIL_URL}/v1/games/icons?universeIds=${universe_id}&size=150x150&format=Webp`),
    axios.get(
      `${ROBLOX_THUMBNAIL_URL}/v1/games/multiget/thumbnails?universeIds=${universe_id}&size=768x432&format=Webp&countPerUniverse=5`
    ),
    axios.get(`${ROBLOX_GAMES_URL}/v1/games?universeIds=${universe_id}`),
  ]);

  const iconUrl = iconRes.data?.data?.[0]?.imageUrl;
  const thumbnailUrl = thumbRes.data?.data?.[0]?.thumbnails?.[0]?.imageUrl;
  const game = gamesRes.data?.data?.[0];

  if (!iconUrl || !thumbnailUrl || !game) throw new Error("Missing game data");

  const sixMonthsAgo = new Date(Date.now() - 182 * 864e5);
  if (game.playing < 500 || new Date(game.updated) < sixMonthsAgo) throw new Error("Game does not meet activity requirements");

  const genre = await supabase.from("genres").select("id").eq("name", game.genre).single();
  if (!genre.data) throw new Error("Invalid genre");

  const gameData = {
    place_id,
    universe_id,
    creator: game.creator.name,
    updated_at: game.updated,
    created_at: game.created,
    price: game.price,
    genre_id: genre.data.id,
    name: game.name,
    description: game.description,
    playing: game.playing,
    visits: game.visits,
    thumbnail_url: thumbnailUrl,
    icon_url: iconUrl,
    added_by,
  };

  const { data, error } = await supabase.from("games").insert([gameData]).select().single();
  if (error) throw new Error(error.message);

  if (added_by) {
    await supabase.from("players").update({ last_activity: new Date().toISOString() }).eq("player_id", added_by);
  }

  return data;
};

export const getGenres = async (name) => {
  if (name) {
    const { data, error } = await supabase.from("genres").select("*").ilike("name", name).single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Genre not found");
    return data;
  }

  const { data, error } = await supabase.from("genres").select("*").order("id");
  if (error) throw new Error(error.message);
  return data;
};
