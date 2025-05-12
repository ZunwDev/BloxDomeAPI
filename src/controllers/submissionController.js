import * as submissionService from "../services/submissionService.js";
import { sendError } from "../utils/helpers.js";

export const getSubmissionsByPlayer = async (req, reply) => {
  try {
    const submissions = await submissionService.getSubmissionsByPlayer(req.params.player_id);
    reply.send(submissions);
  } catch (error) {
    sendError(reply, 500, "Failed to fetch submissions", error.message);
  }
};

export const getSubmissionsByGame = async (req, reply) => {
  try {
    const submissions = await submissionService.getSubmissionsByGame(req.params.place_id);
    reply.send(submissions);
  } catch (error) {
    sendError(reply, 500, "Failed to fetch submissions", error.message);
  }
};

export const getSubmissionById = async (req, reply) => {
  try {
    const submissions = await submissionService.getSubmissionById(req.params.id);
    reply.send(submissions);
  } catch (error) {
    sendError(reply, 500, "Failed to fetch submissions", error.message);
  }
};

export const createSubmission = async (req, reply) => {
  try {
    const submissions = await submissionService.createSubmission(req.body);
    reply.send(submissions);
  } catch (error) {
    sendError(reply, 500, "Failed to fetch submissions", error.message);
  }
};

export const updateSubmission = async (req, reply) => {
  try {
    const submissions = await submissionService.updateSubmission(req.params.id, req.body);
    reply.send(submissions);
  } catch (error) {
    sendError(reply, 500, "Failed to fetch submissions", error.message);
  }
};
