import * as robloxController from "../controllers/robloxController.js";
import { DEFAULT_API_URL } from "../utils/config.js";

export default async function (fastify) {
  fastify.get(`${DEFAULT_API_URL}/roblox/user/:user_id`, robloxController.getRobloxUser);
}
