import { Injectable, Logger } from "@nestjs/common";

export type EmailPayload = {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async send(payload: EmailPayload) {
    this.logger.log(`EMAIL to=${payload.to} subject="${payload.subject}" template=${payload.template}`);
    return { delivered: true };
  }
}

