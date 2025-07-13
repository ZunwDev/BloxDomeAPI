import * as gameService from "../services/gameService.js";
import { withErrorHandler } from "../utils/helpers.js";

export const getGames = withErrorHandler(async ({ query }, reply) => {
	const games = await gameService.fetchGames(query);
	reply.status(200).send(games);
});

export const getLandingGames = withErrorHandler(async ({ query }, reply) => {
	const games = await gameService.fetchLandingGames(query);
	reply.status(200).send(games);
});

export const getGame = withErrorHandler(async ({ params }, reply) => {
	const data = await gameService.fetchGameDetails(params.place_id);
	reply.status(200).send(data);
});

export const createGame = withErrorHandler(async ({ body }, reply) => {
	const data = await gameService.createGame(body.place_id, body.added_by);
	reply.status(201).send(data);
});

export const getGenres = withErrorHandler(async ({ query }, reply) => {
	const data = await gameService.getGenres(query.name);
	reply.status(200).send(data);
});
