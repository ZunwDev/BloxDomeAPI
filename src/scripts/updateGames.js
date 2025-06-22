import axios from "axios";
import { supabase } from "../utils/supabase-client.js";

const API_URL = "http://localhost:3001/api/v1";
const BATCH_SIZE = 20;
let page = 1;

const updateGames = async () => {
  try {
    const response = await axios.get(`${API_URL}/games?page=${page}&limit=${BATCH_SIZE}`);
    const { data: games, hasNextPage, totalPages } = response.data;

    if (!games || games.length === 0) {
      console.log("[GAME DATA UPDATE] No games found on this page, resetting to page 1.");
      page = 1;
      return;
    }

    for (const game of games) {
      const { place_id, universe_id } = game;

      const gamesRes = await axios.get(`https://games.roblox.com/v1/games?universeIds=${universe_id}`);
      const gameData = gamesRes.data.data?.[0];

      if (!gameData) {
        console.log(`[GAME DATA UPDATE] Game data for place_id ${place_id} not found.`);
        continue;
      }

      const [thumbRes, iconRes] = await Promise.all([
        axios.get(
          `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universe_id}&size=768x432&format=Png&isCircular=false&countPerUniverse=5`
        ),
        axios.get(
          `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universe_id}&size=150x150&format=Png&isCircular=false`
        ),
      ]);

      const thumbnails = thumbRes.data?.data?.[0]?.thumbnails || [];
      const thumbnail_url = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].imageUrl : null;
      const icon_url = iconRes.data?.data?.[0]?.imageUrl || null;

      const updatedGameData = {
        creator: gameData.creator.name,
        created_at: gameData.created,
        updated_at: gameData.updated,
        price: gameData.price,
        genre_id: gameData.genre_id,
        description: gameData.description,
        name: gameData.name,
        visits: gameData.visits,
        playing: gameData.playing,
        thumbnail_url,
        icon_url,
      };

      const { data: existingGame, error: checkError } = await supabase
        .from("games")
        .select("*")
        .eq("place_id", place_id)
        .single();

      if (checkError && checkError.code !== "PGRST100") {
        console.error("[GAME DATA UPDATE] Error checking game:", checkError);
        continue;
      }

      if (existingGame) {
        const { error: updateError } = await supabase.from("games").update(updatedGameData).eq("place_id", place_id);

        if (updateError) {
          console.error(`[GAME DATA UPDATE] Failed to update game with place_id ${place_id}:`, updateError);
        } else {
          console.log(`[GAME DATA UPDATE] Updated game with place_id: ${place_id}`);
        }
      } else {
        console.log(`[GAME DATA UPDATE] Game with place_id ${place_id} does not exist, skipping.`);
      }
    }

    console.log(`[GAME DATA UPDATE] Processed page ${page} of ${totalPages} total pages.`);

    if (hasNextPage) {
      page += 1;
    } else {
      console.log("[GAME DATA UPDATE] Reached the last page, resetting to page 1 for next cycle.");
      page = 1;
    }
  } catch (err) {
    console.error("[GAME DATA UPDATE] Error in fetching or processing games:", err);
    if (err.response?.status === 404 || err.response?.status === 400) {
      console.log("[GAME DATA UPDATE] Pagination error detected, resetting to page 1.");
      page = 1;
    }
  }
};

const scheduleUpdate = () => {
  setInterval(() => {
    console.log(`[GAME DATA UPDATE] Starting update for page ${page}`);
    updateGames();
  }, 30 * 60 * 1000); // 30 minutes
};

export { scheduleUpdate, updateGames };
