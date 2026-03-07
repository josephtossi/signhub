import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { PrismaService } from "../common/prisma.service";
import { S3Service } from "../documents/s3.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CreateEnvelopeDto } from "./dto/create-envelope.dto";
import { SaveFieldsDto } from "./dto/save-fields.dto";

@Injectable()
export class EnvelopesService {
  private readonly logger = new Logger(EnvelopesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly s3: S3Service
  ) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizeName(name: string) {
    return name.trim();
  }

  private isSignerRole(role: string | null | undefined) {
    return (role || "").trim().toUpperCase() !== "CC";
  }

  private async resolveUserEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    });
    if (!user) throw new NotFoundException("User not found");
    return this.normalizeEmail(user.email);
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
      where: { id: envelopeId },
      include: {
        document: {
          include: {
            versions: { orderBy: { createdAt: "desc" }, take: 5 }
          }
        },
        recipients: { orderBy: { routingOrder: "asc" } },
        fields: { orderBy: { createdAt: "asc" } },
        signatures: {
          include: {
            recipient: { select: { fullName: true, email: true } }
          }
        }
      }
    });
    if (!envelope) throw new NotFoundException("Envelope not found");
    const isOwner = envelope.document.ownerUserId === userId;
    const isRecipient = envelope.recipients.some((r) => this.normalizeEmail(r.email) === email);
    if (!isOwner && !isRecipient) throw new NotFoundException("Envelope not found");
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
            email: this.normalizeEmail(r.email),
            fullName: this.normalizeName(r.fullName),
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
      scope === "owner"
        ? { document: { ownerUserId: userId } }
        : scope === "inbox"
          ? { recipients: { some: {} } }
          : { OR: [{ document: { ownerUserId: userId } }, { recipients: { some: {} } }] };

    const rows = await this.prisma.envelope.findMany({
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
    if (scope === "owner") return rows;
    return rows.filter((env) => {
      const isOwner = env.document.ownerUserId === userId;
      const isRecipient = env.recipients.some((r) => this.normalizeEmail(r.email) === email);
      return scope === "inbox" ? isRecipient : isOwner || isRecipient;
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
    const recipientsToNotify = envelope.signingOrder
      ? (() => {
          const firstOrder = Math.min(...envelope.recipients.map((r) => r.routingOrder));
          return envelope.recipients.filter((r) => r.routingOrder === firstOrder);
        })()
      : envelope.recipients;

    for (const recipient of recipientsToNotify) {
      await this.notifications.queueEmail({
        to: this.normalizeEmail(recipient.email),
        subject: envelope.subject || "Signature request",
        template: "sign-request",
        data: {
          recipientName: recipient.fullName,
          signingLink: `${process.env.SIGN_URL_BASE || "http://localhost:3001/sign"}/${recipient.accessToken}`
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
            email: this.normalizeEmail(r.email),
            fullName: this.normalizeName(r.fullName),
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

  async getMySigningLink(userId: string, envelopeId: string) {
    const email = await this.resolveUserEmail(userId);
    const envelope = await this.getAccessibleEnvelopeOrThrow(userId, envelopeId);
    const recipient = envelope.recipients.find(
      (r) =>
        r.email.toLowerCase() === email.toLowerCase() &&
        this.isSignerRole(r.role) &&
        r.status !== "SIGNED" &&
        Boolean(r.accessToken)
    );
    if (!recipient) {
      return { canSign: false, reason: "No pending signature assigned to this user." };
    }
    const signBase = process.env.SIGN_URL_BASE || "http://localhost:3001/sign";
    return {
      canSign: true,
      recipientId: recipient.id,
      signingUrl: `${signBase}/${recipient.accessToken}`
    };
  }

  async downloadLatest(userId: string, envelopeId: string) {
    const envelope = await this.getAccessibleEnvelopeOrThrow(userId, envelopeId);
    const nonFinal = envelope.document.versions.find((v) => !v.storageKey.includes("/final-"));
    const baseVersion = nonFinal || envelope.document.versions[0];
    if (!baseVersion) throw new NotFoundException("Source document version not found");
    const source = await this.s3.getObject(baseVersion.storageKey);

    const pdfDoc = await PDFDocument.load(source.body, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const signaturesByField = new Map<string, typeof envelope.signatures>();
    for (const sig of envelope.signatures) {
      const list = signaturesByField.get(sig.fieldId) || [];
      list.push(sig);
      signaturesByField.set(sig.fieldId, list);
    }
    const recipientsById = new Map(envelope.recipients.map((r) => [r.id, r]));

    for (const field of envelope.fields) {
      const pageIndex = Math.max(0, field.page - 1);
      const page = pdfDoc.getPage(pageIndex);
      if (!page) continue;
      const { width: pageWidth, height: pageHeight } = page.getSize();
      const x = field.x * pageWidth;
      const w = Math.max(1, field.width * pageWidth);
      const h = Math.max(1, field.height * pageHeight);
      const y = pageHeight - field.y * pageHeight - h;

      if (field.type === "SIGNATURE" || field.type === "INITIAL") {
        const candidates = signaturesByField.get(field.id) || [];
        const sig = field.recipientId
          ? candidates.find((x) => x.recipientId === field.recipientId) || candidates[0]
          : candidates.sort((a, b) => +new Date(b.signedAt) - +new Date(a.signedAt))[0];
        if (sig?.storageKey) {
          const imageFile = await this.s3.getObject(sig.storageKey);
          let embeddedImage;
          try {
            embeddedImage = await pdfDoc.embedPng(imageFile.body);
          } catch {
            embeddedImage = await pdfDoc.embedJpg(imageFile.body);
          }
          page.drawImage(embeddedImage, { x, y, width: w, height: h });
          const signedBy = sig.recipient?.fullName || sig.recipient?.email || "Signer";
          page.drawText(`${signedBy} | ${new Date(sig.signedAt).toISOString()}`, {
            x,
            y: Math.max(0, y - 10),
            size: 7,
            font,
            color: rgb(0.25, 0.25, 0.25)
          });
        } else {
          const assignee = field.recipientId ? recipientsById.get(field.recipientId) : null;
          const fullName = assignee?.fullName || "Signer";
          const initials = fullName
            .split(" ")
            .map((x) => x.trim()[0])
            .filter(Boolean)
            .join("")
            .slice(0, 3)
            .toUpperCase();
          page.drawRectangle({
            x,
            y,
            width: w,
            height: h,
            borderColor: rgb(0.4, 0.4, 0.4),
            borderWidth: 1
          });
          page.drawText(field.type === "INITIAL" ? initials || "INIT" : fullName, {
            x: x + 2,
            y: y + Math.max(2, h * 0.4),
            size: Math.max(8, Math.min(12, h * 0.5)),
            font: boldFont,
            color: rgb(0.2, 0.2, 0.2)
          });
          page.drawText(field.label || (field.type === "INITIAL" ? "Initial here" : "Sign here"), {
            x: x + 2,
            y: Math.max(0, y - 9),
            size: 7,
            font,
            color: rgb(0.4, 0.4, 0.4)
          });
        }
      } else if (field.type === "CHECKBOX") {
        page.drawRectangle({
          x,
          y,
          width: w,
          height: h,
          borderColor: rgb(0.2, 0.2, 0.2),
          borderWidth: 1
        });
        if (field.value === "true") {
          page.drawText("X", {
            x: x + w * 0.28,
            y: y + h * 0.2,
            size: Math.max(10, Math.min(18, h * 0.8)),
            font,
            color: rgb(0.05, 0.05, 0.05)
          });
        }
      } else if (field.value) {
        page.drawText(field.value, {
          x: x + 2,
          y: y + Math.max(2, h * 0.25),
          size: Math.max(8, Math.min(12, h * 0.55)),
          font,
          color: rgb(0.08, 0.08, 0.12)
        });
      }
    }

    const output = Buffer.from(await pdfDoc.save());
    this.logger.log(
      `Envelope download merge envelope=${envelopeId} baseKey=${baseVersion.storageKey} fields=${envelope.fields.length} signatures=${envelope.signatures.length} bytes=${output.length}`
    );
    return { file: output };
  }

  async dashboard(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    const normalizedEmail = this.normalizeEmail(user.email);

    const [inboxRecipients, waitingForOthers, completed, drafts] = await Promise.all([
      this.prisma.recipient.findMany({
        where: {
          status: { in: ["PENDING", "SENT", "VIEWED"] }
        },
        select: { id: true, email: true }
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
    const needsMySignature = inboxRecipients.filter((r) => this.normalizeEmail(r.email) === normalizedEmail).length;

    const recent = await this.prisma.envelope.findMany({
      where: { document: { ownerUserId: userId } },
      include: { recipients: true, document: true },
      orderBy: { createdAt: "desc" },
      take: 10
    });

    const nextToSignCandidates = await this.prisma.recipient.findMany({
      where: {
        status: { in: ["PENDING", "SENT", "VIEWED"] }
      },
      orderBy: { createdAt: "desc" },
      include: {
        envelope: {
          include: { document: true }
        }
      }
    });
    const nextToSign = nextToSignCandidates.find((r) => this.normalizeEmail(r.email) === normalizedEmail) || null;

    return {
      counts: { needsMySignature, waitingForOthers, completed, drafts },
      recent,
      nextToSign: nextToSign
        ? {
            envelopeId: nextToSign.envelopeId,
            recipientId: nextToSign.id,
            status: nextToSign.status,
            documentTitle: nextToSign.envelope.document.title
          }
        : null
    };
  }
}
