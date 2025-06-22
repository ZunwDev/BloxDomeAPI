import axios from "axios";
import { ROBLOX_API_URL, ROBLOX_GAMES_URL, ROBLOX_THUMBNAIL_URL } from "../utils/config.js";
import { supabase } from "../utils/supabase-client.js";

export const fetchGames = async (queryParams) => {
  const { page = 1, limit = 12, sort = "latest", updated = "all", genre_id, search = "" } = queryParams;
  const offset = (page - 1) * limit;

  let gameQuery = supabase.from("games").select(
    `
      name,
      place_id,
      universe_id,
      playing,
      updated_at,
      icon_url,
      genres(name)
    `,
    { count: "exact" }
  );

  if (genre_id) gameQuery = gameQuery.eq("genre_id", genre_id);
  if (search.trim()) gameQuery = gameQuery.ilike("name", `%${search.trim()}%`);

  if (updated !== "all") {
    const daysMap = { one_day: 1, three_days: 3, week: 7 };
    const days = daysMap[updated];
    if (days) {
      const dateThreshold = new Date(Date.now() - days * 864e5).toISOString();
      gameQuery = gameQuery.gte("updated_at", dateThreshold);
    }
  }

  gameQuery =
    sort === "most_players"
      ? gameQuery.order("playing", { ascending: false })
      : gameQuery.order("updated_at", { ascending: false });

  gameQuery = gameQuery.range(offset, offset + limit - 1);

  const { data: games, count: total, error: gamesError } = await gameQuery;
  if (gamesError) throw new Error(gamesError.message);

  const { data: codesData, error: codesError } = await supabase.from("codes").select("place_id").eq("active", true);

  if (codesError) throw new Error(codesError.message);

  const codeCountMap = {};
  for (const { place_id } of codesData) {
    codeCountMap[place_id] = (codeCountMap[place_id] || 0) + 1;
  }

  const gamesWithCodeCounts = games.map((game) => ({
    ...game,
    genre: game.genres?.name || null,
    active_codes: codeCountMap[game.place_id] || 0,
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    data: gamesWithCodeCounts,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

export const fetchGameDetails = async (place_id) => {
  const { data: game, error } = await supabase
    .from("games")
    .select(
      `
      *,
      genres(name),
      last_editor:code_updated_by(username, thumbnail_circle_url),
      reviewer:code_reviewed_by(player_id, username, thumbnail_circle_url),
      codes(*)
    `
    )
    .eq("place_id", place_id)
    .single();

  if (error || !game) throw new Error("Game not found");

  return {
    ...game,
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

  let query = supabase.from("games").select("place_id, name, icon_url").neq("place_id", place_id);
  query = match ? query.ilike("name", `%${match}%`) : query.eq("genre_id", game.genre_id);

  let { data } = await query.limit(10);
  if (!data.length && match) {
    const fallback = await supabase
      .from("games")
      .select("place_id, name, icon_url")
      .neq("place_id", place_id)
      .eq("genre_id", game.genre_id)
      .limit(5);
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
