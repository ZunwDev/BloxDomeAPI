import dotenv from "dotenv";
import app from "./app.js";
dotenv.config();

//import { scheduleUpdate } from "./src/scripts/updateGames.js";

try {
  await app.listen({ port: Number(process.env.PORT) || 3000 });

  // Enable when in production
  //scheduleUpdate();
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
