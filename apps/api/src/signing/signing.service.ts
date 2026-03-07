import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
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

  private isSignerRole(role: string | null | undefined) {
    return (role || "").trim().toUpperCase() !== "CC";
  }

  private isSignatureFieldType(type: string | null | undefined) {
    const t = (type || "").trim().toUpperCase();
    return t === "SIGNATURE" || t === "INITIAL";
  }

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
    const existing = (await this.prisma.$queryRawUnsafe(
      `SELECT "id" FROM "UserSignature"
       WHERE "userId" = ?
       ORDER BY "updatedAt" DESC, "createdAt" DESC
       LIMIT 1`,
      userId
    )) as Array<{ id: string }>;
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
            recipients: true,
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
    const signerCount = recipient.envelope.recipients.filter((r: { role: string | null }) => this.isSignerRole(r.role)).length;
    const allowUnassignedSignatureFields = signerCount <= 1;
    const actionableFields = await this.prisma.field.findMany({
      where: {
        envelopeId: recipient.envelopeId,
        OR: [
          { recipientId: recipient.id },
          ...(allowUnassignedSignatureFields ? [{ recipientId: null }] : [{ recipientId: null, NOT: { type: { in: ["SIGNATURE", "INITIAL"] } } }])
        ]
      },
      orderBy: { createdAt: "asc" }
    });

    return {
      id: recipient.id,
      envelopeId: recipient.envelopeId,
      fullName: recipient.fullName,
      email: recipient.email,
      status: recipient.status,
      canSign: recipient.status !== "SIGNED",
      document: {
        id: recipient.envelope.document.id,
        title: recipient.envelope.document.title
      },
      fields: actionableFields.map((f: any) => ({
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
    if (recipient.signedAt || recipient.status === "SIGNED") {
      throw new ConflictException("This recipient has already signed and cannot sign again.");
    }
    const allRecipients = await this.prisma.recipient.findMany({ where: { envelopeId: recipient.envelopeId } });
    const signerCount = allRecipients.filter((r: { role: string | null }) => this.isSignerRole(r.role)).length;
    const allowUnassignedSignatureFields = signerCount <= 1;

    let field = await this.prisma.field.findFirst({
      where: {
        id: dto.fieldId,
        envelopeId: recipient.envelopeId,
        OR: [
          { recipientId: recipient.id },
          ...(allowUnassignedSignatureFields ? [{ recipientId: null }] : [{ recipientId: null, NOT: { type: { in: ["SIGNATURE", "INITIAL"] } } }])
        ]
      }
    });
    if (!field) throw new NotFoundException("Field not found for signer");

    if (!field.recipientId && this.isSignatureFieldType(field.type)) {
      if (!allowUnassignedSignatureFields) {
        throw new ConflictException("This field must be assigned to a recipient before signing.");
      }
      const claimed = await this.prisma.field.updateMany({
        where: { id: field.id, recipientId: null },
        data: { recipientId: recipient.id }
      });
      if (claimed.count === 0) {
        const reloaded = await this.prisma.field.findUnique({ where: { id: field.id } });
        if (!reloaded || reloaded.recipientId !== recipient.id) {
          throw new ConflictException("This field has already been assigned to another signer.");
        }
        field = reloaded;
      } else {
        field = { ...field, recipientId: recipient.id };
      }
    }

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
      where: { accessToken: token },
      include: { envelope: true }
    });
    if (!recipient) throw new NotFoundException("Recipient not found");
    if (recipient.signedAt || recipient.status === "SIGNED") {
      throw new ConflictException("This recipient has already signed and cannot sign again.");
    }

    const state = await this.refreshEnvelopeProgress(recipient.envelopeId, recipient.id, meta, true);
    const webBase = process.env.WEB_APP_URL || "http://localhost:3001";
    return {
      ok: true,
      ...state,
      envelopeId: recipient.envelopeId,
      trackingUrl: `${webBase}/envelopes/${recipient.envelopeId}/tracking`,
      signedDocumentUrl: `${process.env.API_BASE_URL || "http://localhost:4000/v1"}/envelopes/${recipient.envelopeId}/download`
    };
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
    const txResult = await this.prisma.$transaction(async (tx: any) => {
      const [recipient, envelope, fields, signatures, recipients] = await Promise.all([
        tx.recipient.findUnique({ where: { id: recipientId } }),
        tx.envelope.findUnique({ where: { id: envelopeId } }),
        tx.field.findMany({ where: { envelopeId } }),
        tx.signature.findMany({ where: { envelopeId } }),
        tx.recipient.findMany({ where: { envelopeId }, orderBy: { routingOrder: "asc" } })
      ]);
      if (!recipient) throw new NotFoundException("Recipient not found");
      if (!envelope) throw new NotFoundException("Envelope not found");

      const signerRecipients = recipients.filter((r: { role: string | null }) => this.isSignerRole(r.role));
      const allowUnassignedSignatureFields = signerRecipients.length <= 1;
      const assignedToRecipient = fields.filter(
        (f: any) =>
          f.recipientId === recipientId ||
          (f.recipientId === null &&
            (!this.isSignatureFieldType(f.type) || allowUnassignedSignatureFields))
      );
      const required = assignedToRecipient.filter((f: { required: boolean }) => f.required);
      const isFieldCompleted = (field: (typeof fields)[number]) => {
        if (field.type === "SIGNATURE" || field.type === "INITIAL") {
          return signatures.some((s: { fieldId: string; recipientId: string | null }) => s.fieldId === field.id && s.recipientId === recipientId);
        }
        if (field.type === "CHECKBOX") return field.value === "true";
        return Boolean(field.value && String(field.value).trim().length > 0);
      };

      const allRequiredDone = required.every((f: any) => isFieldCompleted(f));

      const requiredSignerIds = signerRecipients.map((r: { id: string }) => r.id);

      let justSigned = false;
      if (requireAllFields) {
        if (!allRequiredDone) {
          throw new BadRequestException("Required fields are not completed yet.");
        }
        await tx.recipient.update({
          where: { id: recipientId },
          data: { status: "SIGNED", signedAt: new Date() }
        });
        justSigned = true;
      }

      const refreshedRecipients = await tx.recipient.findMany({ where: { envelopeId }, orderBy: { routingOrder: "asc" } });
      const requiredUnsignedCount = requiredSignerIds.filter((id: string) => {
        const r = refreshedRecipients.find((x: { id: string; signedAt: Date | null }) => x.id === id);
        return !r?.signedAt;
      }).length;

      const signedRequiredCount = requiredSignerIds.length - requiredUnsignedCount;
      let envelopeStatus = "SENT";
      let becameCompleted = false;

      if (requiredSignerIds.length > 0 && requiredUnsignedCount === 0) {
        envelopeStatus = "COMPLETED";
        const updated = await tx.envelope.updateMany({
          where: { id: envelopeId, status: { not: "COMPLETED" } },
          data: {
            status: "COMPLETED",
            completedAt: envelope.completedAt ?? new Date()
          }
        });
        becameCompleted = updated.count > 0;
      } else {
        envelopeStatus = signedRequiredCount > 0 ? "PARTIALLY_SIGNED" : "SENT";
        await tx.envelope.update({
          where: { id: envelopeId },
          data: { status: envelopeStatus, completedAt: null }
        });
      }

      let nextRecipients: Array<{ email: string; fullName: string; accessToken: string | null; subject: string | null }> = [];
      if (envelope.signingOrder && requireAllFields && justSigned) {
        const current = refreshedRecipients.find((r: { id: string }) => r.id === recipientId);
        const pendingNextOrders = refreshedRecipients
          .filter(
            (r: { role: string | null; signedAt: Date | null; routingOrder: number }) =>
              this.isSignerRole(r.role) &&
              !r.signedAt &&
              r.routingOrder > (current?.routingOrder || 0)
          )
          .map((r: { routingOrder: number }) => r.routingOrder);
        const nextOrder = pendingNextOrders.length ? Math.min(...pendingNextOrders) : null;
        if (nextOrder !== null) {
          nextRecipients = refreshedRecipients
            .filter((r: { role: string | null; signedAt: Date | null; routingOrder: number }) => this.isSignerRole(r.role) && !r.signedAt && r.routingOrder === nextOrder)
            .map((r: { email: string; fullName: string; accessToken: string | null }) => ({
              email: r.email,
              fullName: r.fullName,
              accessToken: r.accessToken,
              subject: envelope.subject
            }));
        }
      }

      return {
        envelopeStatus,
        allRequiredDone,
        becameCompleted,
        nextRecipients
      };
    });

    if (txResult.becameCompleted) {
      await this.generateFinalSignedPdf(envelopeId);
      await this.audit.append({
        envelopeId,
        action: "ENVELOPE_COMPLETED",
        details: { recipientId },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      });
    }

    for (const next of txResult.nextRecipients) {
      if (!next.accessToken) continue;
      await this.notifications.queueEmail({
        to: next.email,
        subject: next.subject || "Signature request",
        template: "sign-request",
        data: {
          recipientName: next.fullName,
          signingLink: `${process.env.SIGN_URL_BASE || "http://localhost:3001/sign"}/${next.accessToken}`
        }
      });
    }

    await this.audit.append({
      envelopeId,
      action: requireAllFields ? "RECIPIENT_COMPLETED" : "FIELD_SUBMITTED",
      details: { recipientId, allRequiredDone: txResult.allRequiredDone },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    const latestRecipient = await this.prisma.recipient.findUnique({ where: { id: recipientId } });
    return { envelopeStatus: txResult.envelopeStatus, recipientStatus: latestRecipient?.status || "PENDING" };
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
    const nonFinal = envelope.document.versions.find((v: { storageKey: string }) => !v.storageKey.includes("/final-"));
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

    const signaturesByField = new Map<string, typeof envelope.signatures>();
    for (const sig of envelope.signatures) {
      const list = signaturesByField.get(sig.fieldId) || [];
      list.push(sig);
      signaturesByField.set(sig.fieldId, list);
    }

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
          ? candidates.find((x: { recipientId: string | null }) => x.recipientId === field.recipientId) || candidates[0]
          : candidates.sort((a: { signedAt: Date }, b: { signedAt: Date }) => +new Date(b.signedAt) - +new Date(a.signedAt))[0];
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
