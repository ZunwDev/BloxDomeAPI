import axios from "axios";
import dotenv from "dotenv";
import { supabase } from "../utils/supabase-client.js";
dotenv.config();

const API_URL =
	String(process.env.TEST_MODE) === "true"
		? "http://localhost:3001/api/v1"
		: "https://api.bloxdome.com/api/v1";

const updateGames = async () => {
	try {
		const response = await axios.get(
			`${API_URL}/games?page=1&limit=30&sort=most_players`,
			{
				headers: {
					"X-Cron-Job": "internal",
					"User-Agent": "BloxDome-GameUpdater/1.0",
					Accept: "application/json",
				},
			},
		);

		const { data: games } = response.data;

		if (!games || games.length === 0) {
			console.log("[GAME DATA UPDATE] No games found.");
			return;
		}

		const universeIds = games.map((g) => g.universe_id).join(",");
		const placeIdMap = Object.fromEntries(
			games.map((g) => [g.universe_id, g.place_id]),
		);

		const [gamesRes, thumbRes, iconRes] = await Promise.all([
			axios.get(`https://games.roblox.com/v1/games?universeIds=${universeIds}`),
			axios.get(
				`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeIds}&size=768x432&format=Webp&isCircular=false&countPerUniverse=5`,
			),
			axios.get(
				`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds}&size=150x150&format=Webp&isCircular=false`,
			),
		]);

		const thumbsMap = Object.fromEntries(
			(thumbRes.data?.data || []).map((entry) => [
				entry.universeId || entry.targetId,
				entry.thumbnails || [],
			]),
		);
		const iconsMap = Object.fromEntries(
			(iconRes.data?.data || []).map((entry) => [
				entry.targetId,
				entry.imageUrl,
			]),
		);

		const now = new Date();
		const MAJOR_UPDATE_EXPIRY_DAYS = 6;

		const isExpired = (timestamp) => {
			if (!timestamp) return true;
			const updatedAt = new Date(timestamp);
			const diffInDays =
				(now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
			return diffInDays >= MAJOR_UPDATE_EXPIRY_DAYS;
		};

		for (const gameData of gamesRes.data?.data || []) {
			const universe_id = gameData.id;
			const place_id = placeIdMap[universe_id];
			const icon_url = iconsMap[universe_id] || null;
			const thumbnails = thumbsMap[universe_id];
			const thumbnail_url = thumbnails?.[0]?.imageUrl || null;

			const { data: existingGame, error: checkError } = await supabase
				.from("games")
				.select("*")
				.eq("place_id", place_id)
				.single();

			if (checkError && checkError.code !== "PGRST100") {
				console.error("[GAME DATA UPDATE] Error checking game:", checkError);
				continue;
			}

			let major_update = false;
			let major_updated_at = null;

			if (existingGame) {
				const thumbChanged = existingGame.thumbnail_url !== thumbnail_url;
				const expired = isExpired(existingGame.major_updated_at);

				if (thumbChanged && expired) {
					major_update = true;
					major_updated_at = now.toISOString();
					console.log(
						`[MAJOR UPDATE] Game ${existingGame.name} (place_id ${place_id}) marked as major update — ${thumbChanged ? "thumbnail changed" : ""}`.trim(),
					);
				} else if (existingGame.major_update && !expired) {
					major_update = true;
					major_updated_at = existingGame.major_updated_at;
				} else if (existingGame.major_update && expired) {
					console.log(
						`[MAJOR UPDATE EXPIRED] Game ${existingGame.name} (place_id ${place_id}) major update expired after ${MAJOR_UPDATE_EXPIRY_DAYS} days`,
					);
				}
			}

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
				major_update,
				major_updated_at,
			};

			if (existingGame) {
				const { error: updateError } = await supabase
					.from("games")
					.update(updatedGameData)
					.eq("place_id", place_id);

				if (updateError) {
					console.error(
						`[GAME DATA UPDATE] Failed to update game with place_id ${place_id}:`,
						updateError,
					);
				} else {
					console.log(
						`[GAME DATA UPDATE] Updated game with place_id: ${place_id}`,
					);
				}
			} else {
				console.log(
					`[GAME DATA UPDATE] Game with place_id ${place_id} does not exist, skipping.`,
				);
			}
		}

		console.log("[GAME DATA UPDATE] Processed top 30 most played games.");
	} catch (err) {
		console.error(
			"[GAME DATA UPDATE] Error in fetching or processing games:",
			err,
		);
	}
};

const scheduleUpdate = () => {
	console.log(
		"[GAME DATA UPDATE] Scheduling game data updates every 30 minutes.",
	);
	setInterval(
		() => {
			console.log("[GAME DATA UPDATE] Starting update");
			updateGames();
		},
		30 * 60 * 1000,
	); // 30 minutes
};

export { scheduleUpdate, updateGames };
