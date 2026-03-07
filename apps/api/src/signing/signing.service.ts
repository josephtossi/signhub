import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { PrismaService } from "../common/prisma.service";
import { S3Service } from "../documents/s3.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SubmitSignatureDto } from "./dto/submit-signature.dto";

@Injectable()
export class SigningService {
  private readonly logger = new Logger(SigningService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService
  ) {}

  private async ensureUserSignatureTable() {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserSignature" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "image" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "UserSignature_userId_createdAt_idx" ON "UserSignature"("userId","createdAt")`
    );
  }

  private async ensureSignatureUserReferenceColumn() {
    try {
      await this.prisma.$executeRawUnsafe(`ALTER TABLE "Signature" ADD COLUMN "userSignatureId" TEXT`);
    } catch {
      // Column already exists in existing databases.
    }
  }

  private async upsertUserDefaultSignature(userId: string, imageBase64: string) {
    await this.ensureUserSignatureTable();
    const now = new Date().toISOString();
    const existing = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT "id" FROM "UserSignature"
       WHERE "userId" = ?
       ORDER BY "updatedAt" DESC, "createdAt" DESC
       LIMIT 1`,
      userId
    );
    if (existing[0]?.id) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE "UserSignature" SET "image" = ?, "updatedAt" = ? WHERE "id" = ?`,
        imageBase64,
        now,
        existing[0].id
      );
      return existing[0].id;
    }
    const id = randomUUID();
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "UserSignature" ("id","userId","image","createdAt","updatedAt")
       VALUES (?, ?, ?, ?, ?)`,
      id,
      userId,
      imageBase64,
      now,
      now
    );
    return id;
  }

  async getSession(token: string) {
    const recipient = await this.prisma.recipient.findFirst({
      where: { accessToken: token },
      include: {
        envelope: {
          include: {
            document: {
              include: {
                versions: { orderBy: { createdAt: "desc" }, take: 1 }
              }
            }
          }
        },
        fields: { orderBy: { createdAt: "asc" } }
      }
    });
    if (!recipient) throw new NotFoundException("Invalid token");
    if (recipient.status === "PENDING" || recipient.status === "SENT") {
      await this.prisma.recipient.update({
        where: { id: recipient.id },
        data: { status: "VIEWED", lastViewedAt: new Date() }
      });
    }
    const actionableFields = await this.prisma.field.findMany({
      where: {
        envelopeId: recipient.envelopeId,
        OR: [{ recipientId: recipient.id }, { recipientId: null }]
      },
      orderBy: { createdAt: "asc" }
    });

    return {
      id: recipient.id,
      envelopeId: recipient.envelopeId,
      fullName: recipient.fullName,
      email: recipient.email,
      status: recipient.status,
      document: {
        id: recipient.envelope.document.id,
        title: recipient.envelope.document.title
      },
      fields: actionableFields.map((f) => ({
        id: f.id,
        type: f.type,
        label: f.label,
        required: f.required,
        page: f.page,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        value: f.value
      }))
    };
  }

  async submit(token: string, dto: SubmitSignatureDto, meta: { ipAddress?: string; userAgent?: string }) {
    const recipient = await this.prisma.recipient.findFirst({
      where: { accessToken: token },
      include: { envelope: true }
    });
    if (!recipient) throw new NotFoundException("Recipient not found");

    const field = await this.prisma.field.findFirst({
      where: {
        id: dto.fieldId,
        envelopeId: recipient.envelopeId,
        OR: [{ recipientId: recipient.id }, { recipientId: null }]
      }
    });
    if (!field) throw new NotFoundException("Field not found for signer");

    if (field.type === "SIGNATURE" || field.type === "INITIAL") {
      if (!dto.imageBase64) {
        throw new NotFoundException("Signature image is required for signature fields");
      }
      const signerUser = await this.prisma.user.findUnique({
        where: { email: recipient.email.toLowerCase() },
        select: { id: true }
      });
      let linkedUserSignatureId = dto.userSignatureId || null;
      if (dto.saveAsDefault && signerUser?.id) {
        linkedUserSignatureId = await this.upsertUserDefaultSignature(signerUser.id, dto.imageBase64);
      }

      const key = `signatures/${recipient.envelopeId}/${randomUUID()}.png`;
      const image = Buffer.from(dto.imageBase64.split(",").pop() || "", "base64");
      await this.s3.upload(key, image, "image/png");

      await this.prisma.signature.deleteMany({
        where: { envelopeId: recipient.envelopeId, recipientId: recipient.id, fieldId: field.id }
      });

      const createdSignature = await this.prisma.signature.create({
        data: {
          envelopeId: recipient.envelopeId,
          recipientId: recipient.id,
          fieldId: field.id,
          signatureType: dto.signatureType,
          storageKey: key,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent
        }
      });
      if (linkedUserSignatureId) {
        await this.ensureSignatureUserReferenceColumn();
        await this.prisma.$executeRawUnsafe(
          `UPDATE "Signature" SET "userSignatureId" = ? WHERE "id" = ?`,
          linkedUserSignatureId,
          createdSignature.id
        );
      }

      await this.prisma.field.update({
        where: { id: field.id },
        data: { value: key }
      });
    } else if (field.type === "CHECKBOX") {
      const boolValue = dto.checked ? "true" : "false";
      await this.prisma.field.update({
        where: { id: field.id },
        data: { value: boolValue }
      });
    } else if (field.type === "DATE") {
      const dateValue = dto.value || new Date().toISOString().slice(0, 10);
      await this.prisma.field.update({
        where: { id: field.id },
        data: { value: dateValue }
      });
    } else {
      await this.prisma.field.update({
        where: { id: field.id },
        data: { value: dto.value || "" }
      });
    }

    const state = await this.refreshEnvelopeProgress(recipient.envelopeId, recipient.id, meta);

    return { ok: true, envelopeId: recipient.envelopeId, recipientStatus: state.recipientStatus, envelopeStatus: state.envelopeStatus };
  }

  async complete(token: string, meta: { ipAddress?: string; userAgent?: string }) {
    const recipient = await this.prisma.recipient.findFirst({
      where: { accessToken: token }
    });
    if (!recipient) throw new NotFoundException("Recipient not found");

    const state = await this.refreshEnvelopeProgress(recipient.envelopeId, recipient.id, meta, true);
    return { ok: true, ...state };
  }

  async getDocumentFile(token: string) {
    const recipient = await this.prisma.recipient.findFirst({
      where: { accessToken: token },
      include: {
        envelope: {
          include: {
            document: { include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } } }
          }
        }
      }
    });
    if (!recipient) throw new NotFoundException("Invalid token");
    const latest = recipient.envelope.document.versions[0];
    if (!latest) throw new NotFoundException("Document version not found");
    const object = await this.s3.getObject(latest.storageKey);
    return {
      file: object.body,
      contentType: object.contentType
    };
  }

  private async refreshEnvelopeProgress(
    envelopeId: string,
    recipientId: string,
    meta: { ipAddress?: string; userAgent?: string },
    requireAllFields = false
  ) {
    const [recipient, fields, signatures] = await Promise.all([
      this.prisma.recipient.findUnique({ where: { id: recipientId } }),
      this.prisma.field.findMany({ where: { envelopeId } }),
      this.prisma.signature.findMany({ where: { envelopeId } })
    ]);
    if (!recipient) throw new NotFoundException("Recipient not found");

    const assigned = fields.filter((f) => f.recipientId === recipientId || f.recipientId === null);
    const required = assigned.filter((f) => f.required);
    const isFieldCompleted = (fieldId: string) => {
      const field = assigned.find((f) => f.id === fieldId);
      if (!field) return false;
      if (field.type === "SIGNATURE" || field.type === "INITIAL") {
        return signatures.some((s) => s.fieldId === fieldId && s.recipientId === recipientId);
      }
      if (field.type === "CHECKBOX") return field.value === "true";
      return Boolean(field.value && String(field.value).trim().length > 0);
    };

    const allRequiredDone = required.every((f) => isFieldCompleted(f.id));
    const wasSignedBefore = recipient.status === "SIGNED";
    let justSigned = false;
    if (allRequiredDone || (!requireAllFields && assigned.length === 0)) {
      if (recipient.status !== "SIGNED") {
        await this.prisma.recipient.update({
          where: { id: recipientId },
          data: { status: "SIGNED", signedAt: new Date() }
        });
        justSigned = true;
      }
    } else if (requireAllFields) {
      throw new NotFoundException("Required fields are not completed yet");
    }

    const refreshedRecipients = await this.prisma.recipient.findMany({ where: { envelopeId } });
    const signerRecipients = refreshedRecipients.filter((r) => r.role === "SIGNER");
    const unsignedCount = signerRecipients.filter((r) => r.status !== "SIGNED").length;

    let envelopeStatus = "SENT";
    if (unsignedCount === 0 && signerRecipients.length > 0) {
      envelopeStatus = "COMPLETED";
      await this.prisma.envelope.update({
        where: { id: envelopeId },
        data: { status: "COMPLETED", completedAt: new Date() }
      });
      await this.generateFinalSignedPdf(envelopeId);
      await this.audit.append({
        envelopeId,
        action: "ENVELOPE_COMPLETED",
        details: { recipientId },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      });
    } else {
      const signedCount = signerRecipients.filter((r) => r.status === "SIGNED").length;
      envelopeStatus = signedCount > 0 ? "PARTIALLY_SIGNED" : "SENT";
      await this.prisma.envelope.update({
        where: { id: envelopeId },
        data: { status: envelopeStatus }
      });
    }

    const envelope = await this.prisma.envelope.findUnique({ where: { id: envelopeId } });
    if (envelope && envelope.signingOrder && justSigned && !wasSignedBefore) {
      const current = refreshedRecipients.find((r) => r.id === recipientId);
      const pendingNextOrders = refreshedRecipients
        .filter((r) => r.role === "SIGNER" && r.status !== "SIGNED" && r.routingOrder > (current?.routingOrder || 0))
        .map((r) => r.routingOrder);
      const nextOrder = pendingNextOrders.length ? Math.min(...pendingNextOrders) : null;
      if (nextOrder !== null) {
        const nextRecipients = refreshedRecipients.filter(
          (r) => r.role === "SIGNER" && r.status !== "SIGNED" && r.routingOrder === nextOrder
        );
        for (const next of nextRecipients) {
          await this.notifications.queueEmail({
            to: next.email,
            subject: envelope.subject || "Signature request",
            template: "sign-request",
            data: {
              recipientName: next.fullName,
              signingLink: `${process.env.SIGN_URL_BASE || "http://localhost:3001/sign"}/${next.accessToken}`
            }
          });
        }
      }
    }

    await this.audit.append({
      envelopeId,
      action: "FIELD_SUBMITTED",
      details: { recipientId, allRequiredDone },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    const latestRecipient = await this.prisma.recipient.findUnique({ where: { id: recipientId } });
    return { envelopeStatus, recipientStatus: latestRecipient?.status || "PENDING" };
  }

  private async generateFinalSignedPdf(envelopeId: string) {
    const envelope = await this.prisma.envelope.findUnique({
      where: { id: envelopeId },
      include: {
        document: { include: { versions: { orderBy: { createdAt: "desc" }, take: 20 } } },
        fields: true,
        signatures: { include: { recipient: true } }
      }
    });
    if (!envelope) throw new NotFoundException("Envelope not found");
    const nonFinal = envelope.document.versions.find((v) => !v.storageKey.includes("/final-"));
    const baseVersion = nonFinal || envelope.document.versions[0];
    if (!baseVersion) throw new NotFoundException("Source document version not found");

    const source = await this.s3.getObject(baseVersion.storageKey);
    const pdfDoc = await PDFDocument.load(source.body, { ignoreEncryption: true });
    const originalPageCount = pdfDoc.getPageCount();
    if (originalPageCount === 0) {
      this.logger.error(`Base PDF has 0 pages. envelope=${envelopeId} storageKey=${baseVersion.storageKey}`);
      throw new NotFoundException("Base PDF has no pages");
    }
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const signaturesByField = new Map(envelope.signatures.map((s) => [s.fieldId, s]));

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
        const sig = signaturesByField.get(field.id);
        if (sig?.storageKey) {
          const imageFile = await this.s3.getObject(sig.storageKey);
          let embeddedImage;
          try {
            embeddedImage = await pdfDoc.embedPng(imageFile.body);
          } catch {
            embeddedImage = await pdfDoc.embedJpg(imageFile.body);
          }
          page.drawImage(embeddedImage, { x, y, width: w, height: h });
          const stamp = `${sig.recipient.fullName} | ${new Date(sig.signedAt).toISOString()}`;
          page.drawText(stamp, {
            x,
            y: Math.max(0, y - 10),
            size: 7,
            font,
            color: rgb(0.25, 0.25, 0.25)
          });
        } else if (field.value) {
          page.drawText(field.value, {
            x: x + 2,
            y: y + h / 2,
            size: Math.max(8, Math.min(14, h * 0.45)),
            font,
            color: rgb(0.05, 0.15, 0.45)
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

    const certificatePage = pdfDoc.addPage([595, 842]);
    certificatePage.drawText("SignHub Completion Certificate", {
      x: 50,
      y: 790,
      size: 20,
      font,
      color: rgb(0.08, 0.12, 0.2)
    });
    certificatePage.drawText(`Envelope ID: ${envelope.id}`, { x: 50, y: 755, size: 11, font });
    certificatePage.drawText(`Document: ${envelope.document.title}`, { x: 50, y: 738, size: 11, font });
    certificatePage.drawText(`Completed At: ${new Date().toISOString()}`, { x: 50, y: 721, size: 11, font });
    certificatePage.drawText("Signers:", { x: 50, y: 688, size: 12, font });
    let certY = 668;
    for (const sig of envelope.signatures) {
      certificatePage.drawText(
        `${sig.recipient.fullName} (${sig.recipient.email}) | ${new Date(sig.signedAt).toISOString()}`,
        { x: 60, y: certY, size: 10, font }
      );
      certY -= 16;
      if (certY < 70) break;
    }

    const output = Buffer.from(await pdfDoc.save());
    this.logger.log(
      `Final PDF generated envelope=${envelopeId} basePages=${originalPageCount} fields=${envelope.fields.length} signatures=${envelope.signatures.length} bytes=${output.length}`
    );
    const storageKey = `documents/${envelope.documentId}/final-${envelopeId}-${randomUUID()}.pdf`;
    await this.s3.upload(storageKey, output, "application/pdf");
    const sha256 = createHash("sha256").update(output).digest("hex");
    await this.prisma.documentVersion.create({
      data: {
        documentId: envelope.documentId,
        storageKey,
        sha256
      }
    });
  }
}
