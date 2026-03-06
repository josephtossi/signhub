import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { NotificationsService } from "./notifications.service";

@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post("email/test")
  testEmail(@Body() body: { to: string }) {
    return this.notificationsService.queueEmail({
      to: body.to,
      subject: "Test email",
      template: "test",
      data: { sentAt: new Date().toISOString() }
    });
  }

  @Post("webhook/test")
  testWebhook(@Body() body: { url: string }) {
    return this.notificationsService.queueWebhook({
      url: body.url,
      event: "signhub.test",
      body: { sentAt: new Date().toISOString() }
    });
  }
}
