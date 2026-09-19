export function logResponse(label: string, status: number, body: unknown) {
  console.log(`\n--- ${label} ---`);
  console.log(`Status: ${status}`);
  console.log(JSON.stringify(body, null, 2));
}