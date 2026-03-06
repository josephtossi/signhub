import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../common/prisma.service";
import { S3Service } from "../documents/s3.service";
import { AuditService } from "../audit/audit.service";
import { SubmitSignatureDto } from "./dto/submit-signature.dto";

@Injectable()
export class SigningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly audit: AuditService
  ) {}

  async getSession(token: string) {
    const recipient = await this.prisma.recipient.findFirst({
      where: { accessToken: token },
      include: { envelope: true }
    });
    if (!recipient) throw new NotFoundException("Invalid token");
    if (recipient.status === "PENDING" || recipient.status === "SENT") {
      await this.prisma.recipient.update({
        where: { id: recipient.id },
        data: { status: "VIEWED", lastViewedAt: new Date() }
      });
    }
    return recipient;
  }

  async submit(token: string, dto: SubmitSignatureDto, meta: { ipAddress?: string; userAgent?: string }) {
    const recipient = await this.prisma.recipient.findFirst({ where: { accessToken: token } });
    if (!recipient) throw new NotFoundException("Recipient not found");

    const key = `signatures/${recipient.envelopeId}/${randomUUID()}.png`;
    const image = dto.imageBase64 ? Buffer.from(dto.imageBase64.split(",").pop() || "", "base64") : Buffer.alloc(0);
    await this.s3.upload(key, image, "image/png");

    const signature = await this.prisma.signature.create({
      data: {
        envelopeId: recipient.envelopeId,
        recipientId: recipient.id,
        fieldId: dto.fieldId,
        signatureType: dto.signatureType,
        storageKey: key,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }
    });

    await this.prisma.recipient.update({
      where: { id: recipient.id },
      data: { status: "SIGNED", signedAt: new Date() }
    });

    const unsigned = await this.prisma.recipient.count({
      where: {
        envelopeId: recipient.envelopeId,
        role: "SIGNER",
        status: { not: "SIGNED" }
      }
    });

    await this.prisma.envelope.update({
      where: { id: recipient.envelopeId },
      data:
        unsigned === 0
          ? { status: "COMPLETED", completedAt: new Date() }
          : { status: "PARTIALLY_SIGNED" }
    });

    await this.audit.append({
      envelopeId: recipient.envelopeId,
      action: "SIGNATURE_CAPTURED",
      details: { signatureId: signature.id, recipientId: recipient.id },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return signature;
  }

  async complete(token: string, meta: { ipAddress?: string; userAgent?: string }) {
    const recipient = await this.prisma.recipient.findFirst({ where: { accessToken: token } });
    if (!recipient) throw new NotFoundException("Recipient not found");

    await this.prisma.envelope.update({
      where: { id: recipient.envelopeId },
      data: { status: "COMPLETED", completedAt: new Date() }
    });

    await this.audit.append({
      envelopeId: recipient.envelopeId,
      action: "ENVELOPE_COMPLETED",
      details: { recipientId: recipient.id },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });

    return { ok: true };
  }
}
