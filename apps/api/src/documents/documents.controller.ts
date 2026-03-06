import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { DocumentsService } from "./documents.service";

@UseGuards(JwtAuthGuard)
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(@CurrentUser("sub") userId: string, @Body() dto: CreateDocumentDto) {
    return this.documentsService.create(userId, dto.organizationId, dto.title);
  }

  @Post(":id/upload")
  @UseInterceptors(FileInterceptor("file"))
  upload(@Param("id") id: string, @UploadedFile() file: Express.Multer.File) {
    return this.documentsService.uploadVersion(id, file);
  }

  @Get()
  list(@Query("organizationId") organizationId: string) {
    return this.documentsService.list(organizationId);
  }
}
