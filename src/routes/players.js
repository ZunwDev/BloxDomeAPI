import * as playerController from "../controllers/playerController.js";
import { DEFAULT_API_URL } from "../utils/config.js";

export default async function (fastify) {
  fastify.get(`${DEFAULT_API_URL}/players`, playerController.getPlayers);
  fastify.get(`${DEFAULT_API_URL}/players/:player_id`, playerController.getPlayer);
  fastify.post(`${DEFAULT_API_URL}/players`, playerController.createPlayer);
  fastify.patch(`${DEFAULT_API_URL}/players/:player_id/bookmarks`, playerController.updateBookmarks);
  fastify.get(`${DEFAULT_API_URL}/players/:player_id/bookmarks`, playerController.getBookmarkIds);
  fastify.get(`${DEFAULT_API_URL}/players/:player_id/bookmarked-games`, playerController.getBookmarkedGames);
}
