import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ConnectionOptions, Job, Queue, Worker } from "bullmq";
import { EmailPayload, EmailService } from "./email.service";
import { WebhookPayload, WebhookService } from "./webhook.service";

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private connection!: ConnectionOptions;
  private disabled = false;
  private emailQueue!: Queue<EmailPayload>;
  private webhookQueue!: Queue<WebhookPayload>;
  private emailWorker!: Worker<EmailPayload>;
  private webhookWorker!: Worker<WebhookPayload>;

  constructor(
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    private readonly webhookService: WebhookService
  ) {}

  onModuleInit() {
    const disableQueues = (this.config.get("DISABLE_QUEUES") || "").toLowerCase();
    const shouldDisable =
      disableQueues === "true" ||
      disableQueues === "1" ||
      disableQueues === "yes" ||
      (!disableQueues && this.config.get("NODE_ENV", "development") !== "production");

    if (shouldDisable) {
      this.disabled = true;
      return;
    }

    try {
      const redisUrl = this.config.get("REDIS_URL", "redis://localhost:6379");
      const parsed = new URL(redisUrl);
      this.connection = {
        host: parsed.hostname,
        port: Number(parsed.port || 6379)
      };
      this.emailQueue = new Queue<EmailPayload>("emails", { connection: this.connection });
      this.webhookQueue = new Queue<WebhookPayload>("webhooks", { connection: this.connection });

      this.emailWorker = new Worker<EmailPayload>(
        "emails",
        async (job: Job<EmailPayload>) => this.emailService.send(job.data),
        { connection: this.connection }
      );
      this.webhookWorker = new Worker<WebhookPayload>(
        "webhooks",
        async (job: Job<WebhookPayload>) => this.webhookService.deliver(job.data),
        { connection: this.connection }
      );
    } catch {
      this.disabled = true;
    }
  }

  async onModuleDestroy() {
    if (this.disabled) return;
    await this.emailWorker?.close();
    await this.webhookWorker?.close();
    await this.emailQueue?.close();
    await this.webhookQueue?.close();
  }

  queueEmail(payload: EmailPayload) {
    if (this.disabled) return this.emailService.send(payload);
    return this.emailQueue.add("send", payload, { attempts: 3, backoff: { type: "exponential", delay: 2000 } });
  }

  queueWebhook(payload: WebhookPayload) {
    if (this.disabled) return this.webhookService.deliver(payload);
    return this.webhookQueue.add("deliver", payload, { attempts: 5, backoff: { type: "exponential", delay: 3000 } });
  }
}
