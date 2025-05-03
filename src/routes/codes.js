import codeController from "../controllers/codeController.js";
import { DEFAULT_API_URL } from "../utils/config.js";

export default async function (fastify) {
  fastify.post(`${DEFAULT_API_URL}/codes`, codeController.createCode);
}
