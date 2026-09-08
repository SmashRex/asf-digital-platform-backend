import type { IMailerAdapter } from "./mailerAdapter.interface.js";
import { ConsoleMailerAdapter } from "./consoleMailerAdapter.js";

// Swap this line alone when a real provider (e.g. Resend, SMTP) is ready later —
// nothing else in the app needs to change.
export const mailer: IMailerAdapter = new ConsoleMailerAdapter();