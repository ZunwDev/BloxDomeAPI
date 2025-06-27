import * as notificationService from "../services/notificationService.js";
import { withErrorHandler } from "../utils/helpers.js";

export const getNotifications = withErrorHandler(async ({ params }, reply) => {
  const notifications = await notificationService.fetchNotifications(params.player_id);
  reply.status(200).send(notifications);
});

export const markNotificationAsSeen = withErrorHandler(async ({ params }, reply) => {
  await notificationService.markNotificationAsSeen(params.notification_id);
  reply.status(204);
});

export const markAllNotificationsAsSeen = withErrorHandler(async ({ params }, reply) => {
  await notificationService.markAllNotificationsAsSeen(params.player_id);
  reply.status(204);
});
