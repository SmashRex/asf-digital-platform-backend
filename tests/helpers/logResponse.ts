import fs from "fs";
import path from "path";

const seenFiles = new Set<string>();

function getLogFilePath(suiteName: string) {
  const safeName = suiteName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return path.resolve(`tests/output/${safeName}.log`);
}

export function logResponse(suiteName: string, label: string, status: number, body: unknown) {
  const filePath = getLogFilePath(suiteName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  if (!seenFiles.has(filePath)) {
    fs.writeFileSync(filePath, `=== ${suiteName} — Test run started: ${new Date().toISOString()} ===\n`);
    seenFiles.add(filePath);
  }

  const entry = `\n--- ${label} ---\nStatus: ${status}\n${JSON.stringify(body, null, 2)}\n`;
  fs.appendFileSync(filePath, entry);
  console.log(entry);
}