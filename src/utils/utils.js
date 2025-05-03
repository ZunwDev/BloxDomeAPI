export const sendError = (reply, status, message, details = "") => reply.status(status).send({ error: { message, details } });
