import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
const python =
  process.platform === "win32"
    ? ".venv\Scripts\python.exe"
    : ".venv/bin/python";
export default defineConfig({
  ...base,
  testDir: "checks",
  timeout: 150000,
  use: { ...base.use, baseURL: "http://127.0.0.1:8010" },
  webServer: {
    command:
      '"' +
      python +
      '" -m uvicorn backend.main:app --host 127.0.0.1 --port 8010',
    url: "http://127.0.0.1:8010/api/health",
    reuseExistingServer: false,
    timeout: 30000,
    env: {
      MARRY_DB: "artifacts/crowd-proof-" + Date.now() + ".sqlite3",
      MARRY_ADMIN_PASSWORD: "proof-local-password",
    },
  },
});
