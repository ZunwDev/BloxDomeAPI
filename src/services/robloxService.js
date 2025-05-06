import axios from "axios";
import { ROBLOX_USERS_URL } from "../utils/config.js";

export const fetchRobloxUser = async (user_id) => {
  const robloxUserRes = await axios.get(`${ROBLOX_USERS_URL}/v1/users/${user_id}`);
  const robloxUser = robloxUserRes.data;
  if (!robloxUser) return { error: "not_found" };
  return robloxUser;
};
