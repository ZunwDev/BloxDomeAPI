import * as robloxService from "../services/robloxService.js";
import { withErrorHandler } from "../utils/helpers.js";

export const getRobloxUser = withErrorHandler(async ({ params }, reply) => {
  const { user_id } = params;
  if (!user_id) throw { status: 400, message: "Missing user_id" };

  const robloxUser = await robloxService.fetchRobloxUser(user_id);
  reply.status(200).send(robloxUser);
});
