import { IsString } from "class-validator";

export class CreateDocumentDto {
  @IsString()
  organizationId!: string;

  @IsString()
  title!: string;
}

