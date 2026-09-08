export interface SendMagicLinkEmailParams {
  to: string;
  name: string;
  magicLinkUrl: string;
  purpose: "register" | "login";
}

export interface IMailerAdapter {
  sendMagicLinkEmail(params: SendMagicLinkEmailParams): Promise<void>;
}