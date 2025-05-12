import * as gameService from "../services/gameService.js";
import { sendError } from "../utils/helpers.js";

export const getGames = async (req, reply) => {
  try {
    const games = await gameService.fetchGames(req.query);
    reply.send({ page: Number(req.query.page || 1), limit: Number(req.query.limit || 12), data: games });
  } catch (err) {
    sendError(reply, 500, "Failed to fetch games", err.message);
  }
};

export const getGame = async (req, reply) => {
  try {
    const data = await gameService.fetchGameDetails(req.params.place_id);
    reply.send(data);
  } catch (err) {
    sendError(reply, 404, err.message);
  }
};

export const getSimilarGames = async (req, reply) => {
  try {
    const data = await gameService.fetchSimilarGames(req.params.place_id);
    reply.send(data);
  } catch (err) {
    sendError(reply, 500, "Failed to fetch similar games", err.message);
  }
};

export const createGame = async (req, reply) => {
  try {
    const data = await gameService.createGame(req.body.place_id, req.body.added_by);
    reply.status(201).send(data);
  } catch (err) {
    sendError(reply, 400, "Failed to create game", err.message);
  }
};

export const getGenres = async (req, reply) => {
  try {
    const data = await gameService.getGenres(req.query.name);
    reply.send(data);
  } catch (err) {
    sendError(reply, 500, "Failed to fetch genres", err.message);
  }
};
