import dotenv from "dotenv";
import app from "./app.js";
dotenv.config();

import { scheduleUpdate } from "./src/scripts/updateGames.js";

async function start() {
  try {
    const host = process.env.TEST_MODE === "true" ? "localhost" : "0.0.0.0";
    const port = Number(process.env.PORT) || 3001;

    await app.listen({
      port,
      host,
      listenTextResolver: (address) => {
        return `Server listening on ${address}`;
      },
    });

    console.log(`WebSocket server ready at ws://${host}:${port}/ws`);

    if (process.env.TEST_MODE === "false") {
      scheduleUpdate();
    }

    const gracefulShutdown = async (signal) => {
      console.log(`Received ${signal}, shutting down gracefully...`);

      try {
        await app.close();
        console.log("Server closed successfully");
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
