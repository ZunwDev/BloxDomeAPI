import * as codeService from "../services/codeService.js";
import { sendError } from "../utils/helpers.js";

export const createCode = async (req, reply) => {
  try {
    const result = await codeService.createOrUpdateCodes(req.body);
    return reply.status(200).send(result);
  } catch (err) {
    return sendError(reply, err.status || 500, err.message || "Internal Error", err.details);
  }
};

export const getCodesByPlaceId = async (req, reply) => {
  try {
    const result = await codeService.getCodesByPlaceId(req.params.place_id);
    return reply.status(200).send(result);
  } catch (err) {
    return sendError(reply, err.status || 500, err.message || "Internal Error", err.details);
  }
};
