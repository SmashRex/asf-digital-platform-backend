import fs from "fs";
import path from "path";

export function setup() {
  const logFile = path.resolve("tests/output/test-results.log");
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.writeFileSync(logFile, `Test run started: ${new Date().toISOString()}\n`);
}