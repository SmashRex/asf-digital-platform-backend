import { app } from "./src/app.js";
import { env } from "./src/config/env.config.js";
import { startAnnouncementScheduler } from "./src/jobs/announcementScheduler.js";

app.listen(env.PORT, () => {
  console.log(` Server running on ${env.APP_BASE_URL}`);
});

startAnnouncementScheduler();