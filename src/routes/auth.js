import * as authController from "../controllers/authController.js";
import { DEFAULT_API_URL } from "../utils/config.js";

export default async function (fastify) {
  fastify.post(`${DEFAULT_API_URL}/auth/verify`, authController.createVerification);
  fastify.get(`${DEFAULT_API_URL}/auth/logout`, authController.logout);
}
