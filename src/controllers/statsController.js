import * as statsService from "../services/statsService.js";
import { sendError } from "../utils/helpers.js";

export const getStats = async (req, reply) => {
  try {
    const stats = await statsService.getStats();
    reply.send(stats);
  } catch (error) {
    sendError(reply, 500, "Failed to fetch stats", error.message);
  }
};
