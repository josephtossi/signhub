import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { EnvelopesController } from "./envelopes.controller";
import { EnvelopesService } from "./envelopes.service";

@Module({
  imports: [NotificationsModule],
  controllers: [EnvelopesController],
  providers: [EnvelopesService],
  exports: [EnvelopesService]
})
export class EnvelopesModule {}
