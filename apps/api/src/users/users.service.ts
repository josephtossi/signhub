import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { compare, hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { PrismaService } from "../common/prisma.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UserSignatureDto } from "./dto/user-signature.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeSignatureImage(imageBase64: string) {
    const value = imageBase64.trim();
    if (!value.startsWith("data:image/")) {
      throw new BadRequestException("Signature must be a data URL image");
    }
    const commaIndex = value.indexOf(",");
    if (commaIndex < 0) {
      throw new BadRequestException("Invalid signature image format");
    }
    const raw = value.slice(commaIndex + 1);
    if (!raw || raw.length < 32) {
      throw new BadRequestException("Signature image is empty");
    }
    return value;
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

  list() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, createdAt: true }
    });
  }

  getById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, firstName: true, lastName: true, createdAt: true }
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, createdAt: true }
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    if (dto.email) {
      const email = dto.email.toLowerCase();
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== userId) {
        throw new ConflictException("Email already in use");
      }
      dto.email = email;
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { id: true, email: true, firstName: true, lastName: true, createdAt: true, updatedAt: true }
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true }
    });
    if (!user) throw new NotFoundException("User not found");

    const matches = await compare(dto.currentPassword, user.passwordHash);
    if (!matches) throw new ForbiddenException("Current password is incorrect");

    const passwordHash = await hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    return { ok: true };
  }

  async getSignature(userId: string) {
    await this.ensureUserSignatureTable();
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "id","userId","image","createdAt","updatedAt"
       FROM "UserSignature"
       WHERE "userId" = ?
       ORDER BY "updatedAt" DESC, "createdAt" DESC
       LIMIT 1`,
      userId
    )) as Array<{ id: string; userId: string; image: string; createdAt: string; updatedAt: string }>;
    return rows[0] || null;
  }

  async saveSignature(userId: string, dto: UserSignatureDto) {
    await this.ensureUserSignatureTable();
    const id = randomUUID();
    const now = new Date().toISOString();
    const image = this.normalizeSignatureImage(dto.imageBase64);
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "UserSignature" ("id","userId","image","createdAt","updatedAt")
       VALUES (?, ?, ?, ?, ?)`,
      id,
      userId,
      image,
      now,
      now
    );
    return this.getSignature(userId);
  }

  async updateSignature(userId: string, dto: UserSignatureDto) {
    await this.ensureUserSignatureTable();
    const existing = await this.getSignature(userId);
    const now = new Date().toISOString();
    const image = this.normalizeSignatureImage(dto.imageBase64);
    if (!existing) return this.saveSignature(userId, dto);
    await this.prisma.$executeRawUnsafe(
      `UPDATE "UserSignature" SET "image" = ?, "updatedAt" = ? WHERE "id" = ?`,
      image,
      now,
      existing.id
    );
    return this.getSignature(userId);
  }
}
