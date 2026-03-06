import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { S3Service } from "./s3.service";

@Module({
  imports: [ConfigModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, S3Service],
  exports: [DocumentsService, S3Service]
})
export class DocumentsModule {}
