import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async append(data: {
    envelopeId?: string;
    actorUserId?: string;
    action: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const last = data.envelopeId
      ? await this.prisma.auditLog.findFirst({
          where: { envelopeId: data.envelopeId },
          orderBy: { createdAt: "desc" }
        })
      : null;
    const raw = `${last?.eventHash || ""}|${data.action}|${JSON.stringify(data.details || {})}|${Date.now()}`;
    const eventHash = createHash("sha256").update(raw).digest("hex");

    return this.prisma.auditLog.create({
      data: {
        envelopeId: data.envelopeId,
        actorUserId: data.actorUserId,
        action: data.action,
        details: data.details as any,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        eventHash,
        prevEventHash: last?.eventHash
      }
    });
  }

  list(envelopeId: string) {
    return this.prisma.auditLog.findMany({
      where: { envelopeId },
      orderBy: { createdAt: "asc" }
    });
  }
}
