import * as gameController from "../controllers/gameController.js";
import { DEFAULT_API_URL } from "../utils/config.js";

export default async function (fastify) {
  fastify.get(`${DEFAULT_API_URL}/games`, gameController.getGames);
  fastify.get(`${DEFAULT_API_URL}/games/:place_id`, gameController.getGame);
  fastify.post(`${DEFAULT_API_URL}/games`, gameController.createGame);
  fastify.get(`${DEFAULT_API_URL}/games/genres`, gameController.getGenres);
  fastify.get(`${DEFAULT_API_URL}/games/:place_id/similar`, gameController.getSimilarGames);
}
