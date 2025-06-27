import * as notificationController from "../controllers/notificationController.js";
import { DEFAULT_API_URL } from "../utils/config.js";

export default async function (fastify) {
  fastify.get(`${DEFAULT_API_URL}/notifications/:player_id`, notificationController.getNotifications);
  fastify.patch(`${DEFAULT_API_URL}/notifications/:notification_id`, notificationController.markNotificationAsSeen);
  fastify.patch(`${DEFAULT_API_URL}/notifications/:player_id/all`, notificationController.markAllNotificationsAsSeen);
}
