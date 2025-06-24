import * as statsController from "../controllers/statsController.js";
import { DEFAULT_API_URL } from "../utils/config.js";

export default async function (fastify) {
  fastify.get(`${DEFAULT_API_URL}/stats`, statsController.getStats);
  fastify.get(`${DEFAULT_API_URL}/stats/:player_id`, statsController.getPlayerStats);
}
