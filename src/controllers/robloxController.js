import * as robloxService from "../services/robloxService.js";
import { sendError } from "../utils/utils.js";

export const getRobloxUser = async (req, reply) => {
  try {
    const { user_id } = req.params;
    if (!user_id) return sendError(reply, 400, "Missing user_id");

    const robloxUser = await robloxService.fetchRobloxUser(user_id);
    if (robloxUser.error === "not_found") return sendError(reply, 404, "User not found on Roblox");

    reply.send(robloxUser);
  } catch (err) {
    sendError(reply, 500, "Unexpected error", err.message);
  }
};
