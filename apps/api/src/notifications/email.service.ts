import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { Transporter } from "nodemailer";

export type EmailPayload = {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>("SMTP_HOST");
    const port = Number(this.config.get<string>("SMTP_PORT") || 587);
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");
    this.from = this.config.get<string>("SMTP_FROM", "no-reply@signhub.local");

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
    } else {
      this.transporter = null;
    }
  }

  async send(payload: EmailPayload) {
    if (!this.transporter) {
      this.logger.warn(
        `SMTP not configured. EMAIL to=${payload.to} subject="${payload.subject}" template=${payload.template}`
      );
      return { delivered: false, reason: "smtp_not_configured" };
    }

    const signingLink = String(payload.data?.signingLink || "");
    const recipientName = String(payload.data?.recipientName || "");
    const text = [
      `Hello ${recipientName || "Signer"},`,
      "",
      "You have a document to review and sign in SignHub.",
      signingLink ? `Sign here: ${signingLink}` : "",
      "",
      "This is an automated message."
    ]
      .filter(Boolean)
      .join("\n");
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
        <p>Hello ${recipientName || "Signer"},</p>
        <p>You have a document to review and sign in SignHub.</p>
        ${signingLink ? `<p><a href="${signingLink}">Open signing link</a></p>` : ""}
        <p style="color:#64748b">This is an automated message.</p>
      </div>
    `;

    await this.transporter.sendMail({
      from: this.from,
      to: payload.to,
      subject: payload.subject,
      text,
      html
    });
    this.logger.log(`EMAIL sent to=${payload.to} subject="${payload.subject}"`);
    return { delivered: true };
  }
}
