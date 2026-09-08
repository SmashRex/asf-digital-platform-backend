import { app } from "./src/app.js";
import { env } from "./src/config/env.config.js";

app.listen(env.PORT, () => {
  console.log(` Server running on ${env.APP_BASE_URL}`);
});