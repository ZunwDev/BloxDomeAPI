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

export const getSubmissions = async (req, reply) => {
  try {
    const submissions = await submissionService.getSubmissions(req.query);
    reply.send({ page: Number(req.query.page || 1), limit: Number(req.query.limit || 12), data: submissions });
  } catch (error) {
    console.log(error);
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

export const approveSubmission = async (req, reply) => {
  try {
    const submissions = await submissionService.approveSubmission(req.params.id, req.body);
    reply.send(submissions);
  } catch (error) {
    sendError(reply, 500, "Failed to fetch submissions", error.message);
  }
};

export const rejectSubmission = async (req, reply) => {
  try {
    const submissions = await submissionService.rejectSubmission(req.params.id, req.body);
    reply.send(submissions);
  } catch (error) {
    sendError(reply, 500, "Failed to fetch submissions", error.message);
  }
};

export const commentSubmission = async (req, reply) => {
  try {
    const submissions = await submissionService.commentSubmission(req.params.id, req.body);
    reply.send(submissions);
  } catch (error) {
    sendError(reply, 500, "Failed to fetch submissions", error.message);
  }
};
