import { Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { PrismaService } from "../common/prisma.service";
import { S3Service } from "./s3.service";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service
  ) {}

  async create(ownerUserId: string, organizationId: string, title: string) {
    return this.prisma.document.create({
      data: {
        organizationId,
        ownerUserId,
        title
      }
    });
  }

  async uploadVersion(documentId: string, file: Express.Multer.File) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException("Document not found");

    const sha256 = createHash("sha256").update(file.buffer).digest("hex");
    const storageKey = `documents/${documentId}/${randomUUID()}-${file.originalname}`;
    await this.s3.upload(storageKey, file.buffer, file.mimetype || "application/octet-stream");

    return this.prisma.documentVersion.create({
      data: {
        documentId,
        storageKey,
        sha256
      }
    });
  }

  list(organizationId: string) {
    return this.prisma.document.findMany({
      where: { organizationId },
      include: { versions: true }
    });
  }
}
