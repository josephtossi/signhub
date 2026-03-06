import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { PrismaService } from "../common/prisma.service";
import { S3Service } from "./s3.service";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service
  ) {}

  private async getDefaultOrganizationId(userId: string) {
    const membership = await this.prisma.organizationUser.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" }
    });
    if (!membership) throw new NotFoundException("No organization found for user");
    return membership.organizationId;
  }

  async create(ownerUserId: string, title: string) {
    const organizationId = await this.getDefaultOrganizationId(ownerUserId);
    return this.prisma.document.create({
      data: {
        organizationId,
        ownerUserId,
        title
      }
    });
  }

  async uploadVersion(documentId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException("File is required");
    const isPdf = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
    if (!isPdf) throw new BadRequestException("Only PDF files are allowed");

    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException("Document not found");

    const sha256 = createHash("sha256").update(file.buffer).digest("hex");
    const storageKey = `documents/${documentId}/${randomUUID()}-${file.originalname}`;
    await this.s3.upload(storageKey, file.buffer, file.mimetype || "application/octet-stream");

    const version = await this.prisma.documentVersion.create({
      data: {
        documentId,
        storageKey,
        sha256
      }
    });
    return {
      ...version,
      sha256
    };
  }

  list(organizationId: string) {
    return this.prisma.document.findMany({
      where: { organizationId },
      include: { versions: true }
    });
  }

  async getLatestVersion(documentId: string) {
    const version = await this.prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { createdAt: "desc" }
    });
    if (!version) throw new NotFoundException("No document version found");
    return version;
  }

  async getById(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        OR: [
          { ownerUserId: userId },
          {
            organization: {
              users: {
                some: {
                  userId
                }
              }
            }
          }
        ]
      },
      include: {
        versions: {
          orderBy: { createdAt: "desc" }
        },
        envelopes: {
          orderBy: { createdAt: "desc" },
          take: 10
        }
      }
    });
    if (!document) throw new NotFoundException("Document not found");
    return document;
  }

  async getLatestFile(documentId: string) {
    const version = await this.getLatestVersion(documentId);
    const object = await this.s3.getObject(version.storageKey);
    return {
      file: object.body,
      contentType: object.contentType,
      version
    };
  }

  async uploadAndCreate(ownerUserId: string, title: string, file: Express.Multer.File) {
    const doc = await this.create(ownerUserId, title || file.originalname);
    const version = await this.uploadVersion(doc.id, file);
    return { document: doc, version };
  }
}
