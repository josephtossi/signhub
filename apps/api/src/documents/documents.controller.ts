import { Body, Controller, Get, Param, Post, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { DocumentsService } from "./documents.service";

@UseGuards(JwtAuthGuard)
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  create(
    @CurrentUser("sub") userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto
  ) {
    if (file) {
      return this.documentsService.uploadAndCreate(userId, dto?.title || file.originalname || "Untitled", file);
    }
    return this.documentsService.create(userId, dto.title);
  }

  @Post(":id/upload")
  @UseInterceptors(FileInterceptor("file"))
  upload(@Param("id") id: string, @UploadedFile() file: Express.Multer.File) {
    return this.documentsService.uploadVersion(id, file);
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  uploadAndCreate(
    @CurrentUser("sub") userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("title") title?: string
  ) {
    return this.documentsService.uploadAndCreate(userId, title || file?.originalname || "Untitled", file);
  }

  @Get()
  list(@Query("organizationId") organizationId: string) {
    return this.documentsService.list(organizationId);
  }

  @Get(":id/versions/latest")
  latestVersion(@Param("id") id: string) {
    return this.documentsService.getLatestVersion(id);
  }

  @Get(":id")
  getById(@CurrentUser("sub") userId: string, @Param("id") id: string) {
    return this.documentsService.getById(userId, id);
  }

  @Get(":id/versions/latest/file")
  async latestFile(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.documentsService.getLatestFile(id);
    res.set({
      "Content-Type": result.contentType,
      "Cache-Control": "no-store"
    });
    return new StreamableFile(result.file);
  }
}
