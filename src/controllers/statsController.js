import * as statsService from "../services/statsService.js";
import { withErrorHandler } from "../utils/helpers.js";

export const getStats = withErrorHandler(async (_req, reply) => {
  const stats = await statsService.getStats();
  reply.status(200).send(stats);
});

export const getPlayerStats = withErrorHandler(async ({ params }, reply) => {
  const playerStats = await statsService.getPlayerStats(params.player_id);
  reply.status(200).send(playerStats);
});
