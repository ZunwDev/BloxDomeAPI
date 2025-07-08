import * as discussionService from "../services/discussionService.js";
import { withErrorHandler } from "../utils/helpers.js";

export const getDiscussions = withErrorHandler(async ({ params, query }, reply) => {
  const discussions = await discussionService.fetchDiscussion(params.placeId, query);
  reply.status(200).send(discussions);
});

export const addComment = withErrorHandler(async ({ body }, reply) => {
  const comment = await discussionService.addComment(body);
  reply.status(201).send(comment);
});

export const addReply = withErrorHandler(async ({ params, body }, reply) => {
  const replyComment = await discussionService.addReply(params.parentId, body);
  reply.status(201).send(replyComment);
});

export const reportComment = withErrorHandler(async ({ params, body }, reply) => {
  await discussionService.reportComment(params.commentId, body);
  reply.status(204).send();
});

export const updateComment = withErrorHandler(async ({ params, body }, reply) => {
  const updatedComment = await discussionService.updateComment(params.commentId, body);
  reply.status(200).send(updatedComment);
});
