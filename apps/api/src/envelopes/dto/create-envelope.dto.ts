import { IsArray, IsBoolean, IsEmail, IsInt, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class RecipientDto {
  @IsEmail()
  email!: string;

  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  routingOrder?: number;
}

export class CreateEnvelopeDto {
  @IsString()
  documentId!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsBoolean()
  signingOrder?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  recipients!: RecipientDto[];
}
