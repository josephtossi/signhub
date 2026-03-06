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

  async create(dto: CreateEnvelopeDto) {
    return this.prisma.envelope.create({
      data: {
        organizationId: dto.organizationId,
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
}
