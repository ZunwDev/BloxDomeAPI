import * as codeController from "../controllers/codeController.js";
import { DEFAULT_API_URL } from "../utils/config.js";

export default async function (fastify) {
  fastify.get(`${DEFAULT_API_URL}/codes/:place_id`, codeController.getCodesByPlaceId);
}
