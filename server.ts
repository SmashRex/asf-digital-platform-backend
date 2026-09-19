import { app } from "./src/app.js";
import { env } from "./src/config/env.config.js";
import { startAnnouncementScheduler } from "./src/jobs/announcementScheduler.js";
import { pool } from "./src/db/index.js";

const server = app.listen(env.PORT, () => {
  console.log(` Server running on ${env.APP_BASE_URL}`);
});

startAnnouncementScheduler();

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log("HTTP server closed");
    pool.end().then(() => {
      console.log("Database pool closed");
      process.exit(0);
    });
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));