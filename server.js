import dotenv from "dotenv";
import app from "./app.js";
dotenv.config();

//import { scheduleUpdate } from "./src/scripts/updateGames.js";

try {
  await app.listen({
    port: Number(process.env.PORT) || 3001,
    host: "0.0.0.0",
  });

  //process.env.NODE_ENV === "production" ? scheduleUpdate() : null;
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
