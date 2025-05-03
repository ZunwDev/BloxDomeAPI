import axios from "axios";
import { supabase } from "../utils/supabase-client.js";
import { sendError } from "../utils/utils.js";

const getGames = async (req, reply) => {
  const { page = 1, limit = 12, sort = "latest", updated = "all", genre_id, codes = "all" } = req.query;
  const offset = (page - 1) * limit;

  let query = supabase.from("games").select("*");
  if (genre_id) query = query.eq("genre_id", genre_id);

  if (updated !== "all") {
    const now = new Date();
    const daysMap = { one_day: 1, three_days: 3, week: 7 };
    const days = daysMap[updated];
    if (days) {
      const dateThreshold = new Date(now.setDate(now.getDate() - days)).toISOString();
      query = query.gte("updated_at", dateThreshold);
    }
  }

  if (sort === "most_players") {
    query = query.order("playing", { ascending: false });
  } else {
    query = query.order("updated_at", { ascending: false });
  }

  query = query.range(offset, offset + Number(limit) - 1);

  const { data: games, error } = await query;
  if (error) return sendError(reply, 500, "Failed to fetch games", error.message);
  if (!games.length) return reply.send({ page: Number(page), limit: Number(limit), data: [] });

  const placeIds = games.map((g) => g.place_id);
  const { data: codesData, error: codesError } = await supabase
    .from("codes")
    .select("place_id, active")
    .in("place_id", placeIds);
  if (codesError) return sendError(reply, 500, "Failed to fetch codes", codesError.message);

  const activeCodesCount = codesData.reduce((acc, code) => {
    if (code.active) acc[code.place_id] = (acc[code.place_id] || 0) + 1;
    return acc;
  }, {});

  let gamesWithCodes = games.map((game) => ({
    ...game,
    active_codes: activeCodesCount[game.place_id] || 0,
  }));

  if (codes === "with-codes") {
    gamesWithCodes = gamesWithCodes.filter((g) => g.active_codes > 0);
  } else if (codes === "without-codes") {
    gamesWithCodes = gamesWithCodes.filter((g) => g.active_codes === 0);
  }

  reply.send({ page: Number(page), limit: Number(limit), data: gamesWithCodes });
};

const getSimilarGames = async (req, reply) => {
  const { place_id } = req.params;

  const { data: gameData, error: gameError } = await supabase
    .from("games")
    .select("genre_id, name")
    .eq("place_id", place_id)
    .single();

  if (gameError || !gameData) return sendError(reply, 404, "Game not found", gameError?.message);

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

  const nameLower = gameData.name.toLowerCase();
  const matchedKeyword = keywords.find((keyword) => nameLower.includes(keyword.toLowerCase()));

  let query = supabase.from("games").select("*").neq("place_id", place_id);

  if (matchedKeyword) {
    query = query.ilike("name", `%${matchedKeyword}%`);
  } else {
    query = query.eq("genre_id", gameData.genre_id);
  }

  let { data, error } = await query.limit(10);
  if (error) return sendError(reply, 500, "Failed to fetch similar games", error.message);

  if (!data.length && matchedKeyword) {
    const fallback = await supabase
      .from("games")
      .select("*")
      .neq("place_id", place_id)
      .eq("genre_id", gameData.genre_id)
      .limit(10);
    data = fallback.data;
  }

  reply.send(data || []);
};

const getGame = async (req, reply) => {
  const { place_id } = req.params;

  const { data: game, error: gameError } = await supabase.from("games").select("*").eq("place_id", place_id).single();
  if (gameError || !game) return sendError(reply, 404, "Game not found", gameError?.message);

  const [{ data: genre }, { data: codes, error: codeError }, { data: player }] = await Promise.all([
    supabase.from("genres").select("name").eq("id", game.genre_id).single(),
    supabase.from("codes").select("*").eq("place_id", place_id),
    game.code_updated_by
      ? supabase.from("players").select("username").eq("player_id", game.code_updated_by).single()
      : Promise.resolve({ data: null }),
  ]);

  if (codeError) return sendError(reply, 500, "Failed to fetch codes", codeError.message);

  game.active_codes = codes.filter((code) => code.active);
  game.expired_codes = codes.filter((code) => !code.active);
  if (genre?.name) game.genre = genre.name;
  if (player?.username) game.username = player.username;

  return reply.send(game);
};

const createGame = async (req, reply) => {
  const { place_id, added_by } = req.body;

  const { data: existingGame } = await supabase.from("games").select("*").eq("place_id", place_id).single();
  if (existingGame) return sendError(reply, 409, "Game already exists", "Game is already in the database.");

  try {
    const universeRes = await axios.get(`https://apis.roblox.com/universes/v1/places/${place_id}/universe`);
    const universe_id = universeRes.data?.universeId;
    if (!universe_id) return sendError(reply, 400, "Invalid place_id", "Universe ID not found.");

    const [iconRes, thumbRes, gamesRes] = await Promise.all([
      axios.get(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universe_id}&size=150x150&format=Webp`),
      axios.get(
        `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universe_id}&size=768x432&format=Webp&countPerUniverse=5`
      ),
      axios.get(`https://games.roblox.com/v1/games?universeIds=${universe_id}`),
    ]);

    const iconUrl = iconRes.data?.data?.[0]?.imageUrl;
    const thumbnailUrl = thumbRes.data?.data?.[0]?.thumbnails?.[0]?.imageUrl;
    const game = gamesRes.data?.data?.[0];

    if (!iconUrl || !thumbnailUrl)
      return sendError(reply, 400, "Failed to fetch game thumbnails", "Missing icon or thumbnail URL.");
    if (!game) return sendError(reply, 400, "Game not found", "No game data found for the universe.");

    const sixMonthsAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 182);
    if (game.playing < 500 || new Date(game.updated) < sixMonthsAgo)
      return sendError(reply, 400, "Game must have at least 500 players and be updated in the last 6 months.");

    const genre = await supabase.from("genres").select("id").eq("name", game.genre).single();
    if (!genre.data) return sendError(reply, 400, "Invalid genre");

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
    if (error) return sendError(reply, 400, "Failed to create game", error.message);

    return reply.status(201).send(data);
  } catch (err) {
    console.error(err);
    return sendError(reply, 500, "Internal server error", err.message);
  }
};

const getGenres = async (req, reply) => {
  const { name } = req.query;

  if (name) {
    const { data, error } = await supabase.from("genres").select("*").ilike("name", name).single();
    if (error) return sendError(reply, 500, "Failed to fetch genre", error.message);
    if (!data) return sendError(reply, 404, "Genre not found");
    return reply.send(data);
  }

  const { data, error } = await supabase.from("genres").select("*").order("id", { ascending: true });
  if (error) return sendError(reply, 500, "Failed to fetch genres", error.message);

  return reply.send(data);
};

export default { getGames, createGame, getGame, getSimilarGames, getGenres };
