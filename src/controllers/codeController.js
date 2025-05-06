import * as codeService from "../services/codeService.js";
import { sendError } from "../utils/utils.js";

export const createCode = async (req, reply) => {
  try {
    const result = await codeService.createOrUpdateCodes(req.body);
    return reply.status(200).send(result);
  } catch (err) {
    return sendError(reply, err.status || 500, err.message || "Internal Error", err.details);
  }
};
