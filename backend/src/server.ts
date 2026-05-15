import { app } from "./app";
import { env } from "./config/env";

app.listen(env.BACKEND_PORT, () => {
  console.log(`ResumeFlow API listening on port ${env.BACKEND_PORT}`);
});
