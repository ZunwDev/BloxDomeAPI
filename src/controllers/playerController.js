import dotenv from "dotenv";
import * as playerService from "../services/playerService.js";
import { sendError } from "../utils/helpers.js";
dotenv.config();

export const getPlayers = async (req, reply) => {
  try {
    const { data, error } = await playerService.fetchPlayers(req.query);
    if (error) return sendError(reply, 500, "Failed to fetch players", error.message);
    reply.send(data);
  } catch (err) {
    sendError(reply, 500, "Unexpected error", err.message);
  }
};

export const getPlayer = async (req, reply) => {
  try {
    const { data, error } = await playerService.fetchPlayerById(req.params.player_id);
    if (error) return sendError(reply, 404, "Player not found");
    reply.send(data);
  } catch (err) {
    sendError(reply, 500, "Unexpected error", err.message);
  }
};

export const createPlayer = async (req, reply) => {
  try {
    const { username, added_by } = req.body;
    const { data, error } = await playerService.createNewPlayer(username, added_by);

    if (error === "not_found") return sendError(reply, 404, "User not found on Roblox");
    if (error === "exists") return sendError(reply, 409, "Player already exists");
    if (error) return sendError(reply, 400, "Failed to create player", error.message);

    reply.status(201).send(data);
  } catch (err) {
    sendError(reply, 500, "Unexpected error", err.message);
  }
};

export const updateBookmarks = async (req, reply) => {
  try {
    const { player_id } = req.params;
    const { place_id } = req.body;

    const result = await playerService.toggleBookmark(player_id, place_id);
    if (result.error === "invalid_place_id") return sendError(reply, 400, "Invalid place_id");
    if (result.error) return sendError(reply, 500, "Failed to update bookmarks", result.error.message);

    reply.send({ success: true, bookmarks: result.bookmarks });
  } catch (err) {
    sendError(reply, 500, "Unexpected error", err.message);
  }
};

export const getBookmarkIds = async (req, reply) => {
  try {
    const { data, error } = await playerService.getBookmarks(req.params.player_id);
    if (error || !data) return sendError(reply, 500, "Player not found", error?.message);
    reply.send({ data: data.bookmarks });
  } catch (err) {
    sendError(reply, 500, "Unexpected error", err.message);
  }
};

export const getBookmarkedGames = async (req, reply) => {
  try {
    const { data, error } = await playerService.getBookmarkedGames(req.params.player_id, req.query.codes);
    if (error) return sendError(reply, 500, "Failed to fetch games", error.message);
    reply.send({ data });
  } catch (err) {
    sendError(reply, 500, "Unexpected error", err.message);
  }
};
