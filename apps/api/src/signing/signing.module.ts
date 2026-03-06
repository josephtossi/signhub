import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DocumentsModule } from "../documents/documents.module";
import { SigningController } from "./signing.controller";
import { SigningService } from "./signing.service";

@Module({
  imports: [DocumentsModule, AuditModule],
  controllers: [SigningController],
  providers: [SigningService]
})
export class SigningModule {}
