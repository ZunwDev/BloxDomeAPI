import axios from "axios";
import { ROBLOX_USERS_URL } from "../utils/config.js";

export const fetchRobloxUser = async (user_id) => {
  try {
    const { data } = await axios.get(`${ROBLOX_USERS_URL}/v1/users/${user_id}`);
    return data;
  } catch (err) {
    if (err.response?.status === 404) {
      throw { status: 404, message: "User not found on Roblox" };
    }
    throw { status: 500, message: "Failed to fetch user", details: err.message };
  }
};
