import { Module } from "@nestjs/common";
import { DocumentsModule } from "../documents/documents.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { EnvelopesController } from "./envelopes.controller";
import { EnvelopesService } from "./envelopes.service";

@Module({
  imports: [NotificationsModule, DocumentsModule],
  controllers: [EnvelopesController],
  providers: [EnvelopesService],
  exports: [EnvelopesService]
})
export class EnvelopesModule {}
