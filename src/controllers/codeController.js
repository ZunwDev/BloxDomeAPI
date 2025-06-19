import * as codeService from "../services/codeService.js";
import { withErrorHandler } from "../utils/helpers.js";

export const createCode = withErrorHandler(async ({ body }, reply) => {
  const result = await codeService.createOrUpdateCodes(body);
  return reply.status(200).send(result);
});

export const getCodesByPlaceId = withErrorHandler(async ({ params }, reply) => {
  const result = await codeService.getCodesByPlaceId(params.place_id);
  return reply.status(200).send(result);
});
