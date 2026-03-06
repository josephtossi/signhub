import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { compare, hash } from "bcryptjs";
import { PrismaService } from "../common/prisma.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
}
