import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../common/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { compare, hash } from "bcryptjs";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new UnauthorizedException("Email already exists");

    const passwordHash = await hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        memberships: {
          create: {
            role: "OWNER",
            organization: {
              create: { name: `${dto.firstName} ${dto.lastName}`.trim() || "Personal Workspace" }
            }
          }
        }
      }
    });
    return this.issueTokens(user.id, user.email, ["OWNER"]);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { memberships: true }
    });
    if (!user) throw new UnauthorizedException("Invalid credentials");
    const ok = await compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    const roles = user.memberships.map((m) => m.role);
    return this.issueTokens(user.id, user.email, roles.length ? roles : ["MEMBER"]);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret"
      });
      return this.issueTokens(payload.sub, payload.email, payload.roles || ["MEMBER"]);
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        memberships: {
          include: { organization: true }
        }
      }
    });
  }

  private async issueTokens(userId: string, email: string, roles: string[]) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, roles },
      { secret: process.env.JWT_ACCESS_SECRET || "dev-access-secret", expiresIn: "15m" }
    );
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, email, roles },
      { secret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret", expiresIn: "7d" }
    );
    return { accessToken, refreshToken };
  }
}
