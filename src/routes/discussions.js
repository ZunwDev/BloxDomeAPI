import * as discussionController from "../controllers/discussionController.js";
import { DEFAULT_API_URL } from "../utils/config.js";

export default function (fastify) {
  fastify.get(`${DEFAULT_API_URL}/discussions/:placeId`, discussionController.getDiscussions);
  fastify.post(`${DEFAULT_API_URL}/discussions/comment`, discussionController.addComment);
  fastify.post(`${DEFAULT_API_URL}/discussions/:parentId/replies`, discussionController.addReply);
  fastify.post(`${DEFAULT_API_URL}/discussions/:commentId/report`, discussionController.reportComment);
  fastify.patch(`${DEFAULT_API_URL}/discussions/:commentId`, discussionController.updateComment);
}
