export const sendError = (reply, status, message, details = "") => reply.status(status).send({ error: { message, details } });

export const withErrorHandler = (handler) => async (req, reply) => {
  try {
    await handler(req, reply);
  } catch (error) {
    console.error("withErrorHandler → error:", error);
    sendError(reply, error.status || 500, error.message || "Server error", error.details);
  }
};
