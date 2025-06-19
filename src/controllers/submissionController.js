import * as submissionService from "../services/submissionService.js";
import { withErrorHandler } from "../utils/helpers.js";

export const getSubmissions = withErrorHandler(async ({ query }, reply) => {
  const submissions = await submissionService.getSubmissions(query);
  reply.status(200).send(submissions);
});

export const getSubmissionById = withErrorHandler(async ({ params }, reply) => {
  const submissions = await submissionService.getSubmissionById(params.id);
  reply.status(200).send(submissions);
});

export const createSubmission = withErrorHandler(async ({ body }, reply) => {
  const submissions = await submissionService.createSubmission(body);
  reply.status(201).send(submissions);
});

export const updateSubmission = withErrorHandler(async ({ params, body }, reply) => {
  await submissionService.updateSubmission(params.id, body);
  reply.status(204);
});

export const approveSubmission = withErrorHandler(async ({ params, body }, reply) => {
  await submissionService.approveSubmission(params.id, body);
  reply.status(204);
});

export const rejectSubmission = withErrorHandler(async ({ params, body }, reply) => {
  await submissionService.rejectSubmission(params.id, body);
  reply.status(204);
});

export const commentSubmission = withErrorHandler(async ({ params, body }, reply) => {
  await submissionService.commentSubmission(params.id, body);
  reply.status(201);
});
