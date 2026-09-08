import type { IMailerAdapter, SendMagicLinkEmailParams } from "./mailerAdapter.interface.js";

export class ConsoleMailerAdapter implements IMailerAdapter {
  async sendMagicLinkEmail({ to, name, magicLinkUrl, purpose }: SendMagicLinkEmailParams): Promise<void> {
    console.log("\n📧 ───── Magic Link Email (console adapter) ─────");
    console.log(`To: ${to}`);
    console.log(`Name: ${name}`);
    console.log(`Purpose: ${purpose}`);
    console.log(`Link: ${magicLinkUrl}`);
    console.log("────────────────────────────────────────────────\n");
  }
}