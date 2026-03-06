import { Injectable, Logger } from "@nestjs/common";

export type WebhookPayload = {
  url: string;
  event: string;
  body: Record<string, unknown>;
};

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  async deliver(payload: WebhookPayload) {
    this.logger.log(`WEBHOOK event=${payload.event} url=${payload.url}`);
    return { delivered: true };
  }
}

