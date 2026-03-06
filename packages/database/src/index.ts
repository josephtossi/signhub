import { PrismaClient } from "@prisma/client";

export class DatabaseClient extends PrismaClient {}

export const db = new DatabaseClient();

