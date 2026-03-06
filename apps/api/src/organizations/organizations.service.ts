import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, name: string) {
    return this.prisma.organization.create({
      data: {
        name,
        users: {
          create: {
            userId,
            role: "OWNER"
          }
        }
      }
    });
  }

  listForUser(userId: string) {
    return this.prisma.organizationUser.findMany({
      where: { userId },
      include: { organization: true }
    });
  }
}
