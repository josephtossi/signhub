import { Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../common/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateEnvelopeDto } from "./dto/create-envelope.dto";
import { SaveFieldsDto } from "./dto/save-fields.dto";

@Injectable()
export class EnvelopesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async create(ownerUserId: string, dto: CreateEnvelopeDto) {
    const document = await this.prisma.document.findUnique({ where: { id: dto.documentId } });
    if (!document) throw new NotFoundException("Document not found");
    if (document.ownerUserId !== ownerUserId) throw new NotFoundException("Document not accessible");

    return this.prisma.envelope.create({
      data: {
        organizationId: document.organizationId,
        documentId: dto.documentId,
        subject: dto.subject,
        message: dto.message,
        signingOrder: dto.signingOrder ?? false,
        recipients: {
          create: dto.recipients.map((r, idx) => ({
            email: r.email,
            fullName: r.fullName,
            role: r.role === "CC" ? "CC" : "SIGNER",
            routingOrder: r.routingOrder || idx + 1,
            accessToken: randomBytes(24).toString("hex")
          }))
        }
      },
      include: { recipients: true }
    });
  }

  async send(envelopeId: string) {
    const envelope = await this.prisma.envelope.update({
      where: { id: envelopeId },
      data: { status: "SENT" },
      include: { recipients: true }
    });
    for (const recipient of envelope.recipients) {
      await this.notifications.queueEmail({
        to: recipient.email,
        subject: envelope.subject || "Signature request",
        template: "sign-request",
        data: {
          recipientName: recipient.fullName,
          signingLink: `${process.env.SIGN_URL_BASE || "http://localhost:3000/sign"}/${recipient.accessToken}`
        }
      });
    }
    return envelope;
  }

  async upsertRecipients(envelopeId: string, recipients: CreateEnvelopeDto["recipients"]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.recipient.deleteMany({ where: { envelopeId } });
      if (recipients.length > 0) {
        await tx.recipient.createMany({
          data: recipients.map((r, idx) => ({
            envelopeId,
            email: r.email,
            fullName: r.fullName,
            role: r.role === "CC" ? "CC" : "SIGNER",
            routingOrder: r.routingOrder || idx + 1,
            status: "PENDING",
            accessToken: randomBytes(24).toString("hex")
          }))
        });
      }
    });

    return this.prisma.recipient.findMany({ where: { envelopeId }, orderBy: { routingOrder: "asc" } });
  }

  async status(envelopeId: string) {
    const envelope = await this.prisma.envelope.findUnique({
      where: { id: envelopeId },
      include: { recipients: true, signatures: true, fields: true, document: true }
    });
    if (!envelope) throw new NotFoundException("Envelope not found");
    return envelope;
  }

  async saveFields(envelopeId: string, dto: SaveFieldsDto) {
    await this.prisma.envelope.findUniqueOrThrow({ where: { id: envelopeId } });
    await this.prisma.$transaction(async (tx) => {
      await tx.field.deleteMany({ where: { envelopeId, type: "SIGNATURE" } });
      if (dto.fields.length > 0) {
        await tx.field.createMany({
          data: dto.fields.map((f) => ({
            envelopeId,
            recipientId: f.recipientId,
            type: f.type,
            page: f.page,
            x: f.x,
            y: f.y,
            width: f.width,
            height: f.height,
            required: true
          }))
        });
      }
    });

    return this.prisma.field.findMany({ where: { envelopeId }, orderBy: { createdAt: "asc" } });
  }

  listFields(envelopeId: string) {
    return this.prisma.field.findMany({
      where: { envelopeId },
      orderBy: { createdAt: "asc" }
    });
  }

  getById(envelopeId: string) {
    return this.prisma.envelope.findUnique({
      where: { id: envelopeId },
      include: {
        document: true,
        recipients: true,
        fields: true,
        signatures: true
      }
    });
  }

  async dashboard(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const [needsMySignature, waitingForOthers, completed, drafts] = await Promise.all([
      this.prisma.recipient.count({
        where: {
          email: user.email,
          status: { in: ["PENDING", "SENT", "VIEWED"] }
        }
      }),
      this.prisma.envelope.count({
        where: {
          document: { ownerUserId: userId },
          status: { in: ["SENT", "VIEWED", "PARTIALLY_SIGNED"] }
        }
      }),
      this.prisma.envelope.count({
        where: {
          document: { ownerUserId: userId },
          status: "COMPLETED"
        }
      }),
      this.prisma.envelope.count({
        where: {
          document: { ownerUserId: userId },
          status: "DRAFT"
        }
      })
    ]);

    const recent = await this.prisma.envelope.findMany({
      where: { document: { ownerUserId: userId } },
      include: { recipients: true, document: true },
      orderBy: { createdAt: "desc" },
      take: 10
    });

    return {
      counts: { needsMySignature, waitingForOthers, completed, drafts },
      recent
    };
  }
}
