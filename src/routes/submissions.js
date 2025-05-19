import * as submissionsController from "../controllers/submissionController.js";
import { DEFAULT_API_URL } from "../utils/config.js";

export default async function (fastify) {
  fastify.get(`${DEFAULT_API_URL}/submissions/:player_id/player`, submissionsController.getSubmissionsByPlayer);
  fastify.get(`${DEFAULT_API_URL}/submissions`, submissionsController.getSubmissions);
  fastify.get(`${DEFAULT_API_URL}/submissions/:id`, submissionsController.getSubmissionById);
  fastify.post(`${DEFAULT_API_URL}/submissions`, submissionsController.createSubmission);
  fastify.patch(`${DEFAULT_API_URL}/submissions/:id/approve`, submissionsController.approveSubmission);
  fastify.patch(`${DEFAULT_API_URL}/submissions/:id/reject`, submissionsController.rejectSubmission);
  fastify.patch(`${DEFAULT_API_URL}/submissions/:id`, submissionsController.updateSubmission);
}
