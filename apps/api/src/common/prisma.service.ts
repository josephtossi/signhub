import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { DatabaseClient } from "@signhub/database";
import { join } from "path";

@Injectable()
export class PrismaService extends DatabaseClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const dbUrl = process.env.DATABASE_URL || "";
    const sqliteUrl = dbUrl.startsWith("file:");
    const rawPath = sqliteUrl ? dbUrl.slice(5) : "";
    const absoluteSqlite = sqliteUrl && (rawPath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(rawPath));

    const normalizedDbUrl =
      !dbUrl || (sqliteUrl && !absoluteSqlite)
        ? `file:${join(__dirname, "../../../../packages/database/prisma/dev.db").replace(/\\/g, "/")}`
        : dbUrl;

    super({
      datasources: {
        db: {
          url: normalizedDbUrl
        }
      }
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
