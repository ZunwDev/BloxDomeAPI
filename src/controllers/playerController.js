import dotenv from "dotenv";
import * as playerService from "../services/playerService.js";
import { withErrorHandler } from "../utils/helpers.js";
dotenv.config();

export const getPlayers = withErrorHandler(async ({ query }, reply) => {
  const data = await playerService.fetchPlayers(query);
  reply.status(200).send(data);
});

export const getPlayer = withErrorHandler(async ({ params }, reply) => {
  const data = await playerService.fetchPlayerById(params.player_id);
  reply.status(200).send(data);
});

export const createPlayer = withErrorHandler(async ({ body }, reply) => {
  const data = await playerService.createNewPlayer(body.username, body.added_by);
  reply.status(201).send(data);
});

export const updateBookmarks = withErrorHandler(async ({ params, body }, reply) => {
  await playerService.toggleBookmark(params.player_id, body.place_id);
  reply.status(204);
});

export const updatePlayer = withErrorHandler(async ({ params }, reply) => {
  await playerService.updatePlayer(params.player_id);
  reply.status(204);
});

export const getBookmarkIds = withErrorHandler(async ({ params }, reply) => {
  const data = await playerService.getBookmarks(params.player_id);
  reply.status(200).send(data);
});

export const getBookmarkedGames = withErrorHandler(async ({ params, query }, reply) => {
  const data = await playerService.getBookmarkedGames(params.player_id, query.codes);
  reply.status(200).send(data);
});
