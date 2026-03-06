import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
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

  private async resolveUserEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });
    if (!user) throw new NotFoundException("User not found");
    return user.email;
  }

  private async getOwnedEnvelopeOrThrow(userId: string, envelopeId: string) {
    const envelope = await this.prisma.envelope.findFirst({
      where: {
        id: envelopeId,
        document: { ownerUserId: userId }
      },
      include: {
        document: {
          include: {
            versions: { orderBy: { createdAt: "desc" }, take: 5 }
          }
        },
        recipients: { orderBy: { routingOrder: "asc" } },
        fields: { orderBy: { createdAt: "asc" } },
        signatures: true
      }
    });
    if (!envelope) throw new NotFoundException("Envelope not found");
    return envelope;
  }

  private async getAccessibleEnvelopeOrThrow(userId: string, envelopeId: string) {
    const email = await this.resolveUserEmail(userId);
    const envelope = await this.prisma.envelope.findFirst({
      where: {
        id: envelopeId,
        OR: [{ document: { ownerUserId: userId } }, { recipients: { some: { email } } }]
      },
      include: {
        document: {
          include: {
            versions: { orderBy: { createdAt: "desc" }, take: 5 }
          }
        },
        recipients: { orderBy: { routingOrder: "asc" } },
        fields: { orderBy: { createdAt: "asc" } },
        signatures: true
      }
    });
    if (!envelope) throw new NotFoundException("Envelope not found");
    return envelope;
  }

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

  async list(userId: string, status?: string, scope: "owner" | "inbox" | "all" = "owner") {
    const email = await this.resolveUserEmail(userId);
    const statuses = (status || "")
      .split(",")
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean);

    const whereByScope =
      scope === "all"
        ? {
            OR: [{ document: { ownerUserId: userId } }, { recipients: { some: { email } } }]
          }
        : scope === "inbox"
          ? { recipients: { some: { email } } }
          : { document: { ownerUserId: userId } };

    return this.prisma.envelope.findMany({
      where: {
        ...whereByScope,
        ...(statuses.length ? { status: { in: statuses } } : {})
      },
      include: {
        document: {
          include: {
            versions: { orderBy: { createdAt: "desc" }, take: 1 }
          }
        },
        recipients: { orderBy: { routingOrder: "asc" } },
        fields: true,
        signatures: true
      },
      orderBy: { updatedAt: "desc" }
    });
  }

  async send(userId: string, envelopeId: string) {
    const draft = await this.getOwnedEnvelopeOrThrow(userId, envelopeId);
    if (draft.status === "COMPLETED") {
      throw new ForbiddenException("Completed envelopes cannot be sent");
    }

    const envelope = await this.prisma.envelope.update({
      where: { id: draft.id },
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

  async upsertRecipients(userId: string, envelopeId: string, recipients: CreateEnvelopeDto["recipients"]) {
    const envelope = await this.getOwnedEnvelopeOrThrow(userId, envelopeId);
    if (envelope.status !== "DRAFT") {
      throw new ForbiddenException("Recipients can only be edited for draft envelopes");
    }

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

  async status(userId: string, envelopeId: string) {
    return this.getAccessibleEnvelopeOrThrow(userId, envelopeId);
  }

  async saveFields(userId: string, envelopeId: string, dto: SaveFieldsDto) {
    const envelope = await this.getOwnedEnvelopeOrThrow(userId, envelopeId);
    if (envelope.status !== "DRAFT") {
      throw new ForbiddenException("Fields can only be edited for draft envelopes");
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.field.findMany({ where: { envelopeId }, select: { id: true } });
      const incomingIds = dto.fields.map((f) => f.id).filter((x): x is string => Boolean(x));
      const removableIds = existing.map((f) => f.id).filter((id) => !incomingIds.includes(id));

      if (removableIds.length) {
        await tx.field.deleteMany({ where: { envelopeId, id: { in: removableIds } } });
      }

      for (const f of dto.fields) {
        const data = {
          envelopeId,
          recipientId: f.recipientId || null,
          type: f.type,
          page: f.page,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          label: f.label || null,
          required: f.required ?? true,
          value: f.value || null
        };

        if (f.id && existing.some((x) => x.id === f.id)) {
          await tx.field.update({ where: { id: f.id }, data });
          continue;
        }

        await tx.field.create({ data });
      }

      await tx.envelope.update({ where: { id: envelopeId }, data: { status: "DRAFT" } });
    });

    return this.prisma.field.findMany({ where: { envelopeId }, orderBy: { createdAt: "asc" } });
  }

  listFields(envelopeId: string) {
    return this.prisma.field.findMany({
      where: { envelopeId },
      orderBy: { createdAt: "asc" }
    });
  }

  getById(userId: string, envelopeId: string) {
    return this.getAccessibleEnvelopeOrThrow(userId, envelopeId);
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
