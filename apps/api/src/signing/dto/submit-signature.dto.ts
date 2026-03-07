import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

enum SignatureKind {
  DRAW = "DRAW",
  TYPE = "TYPE",
  UPLOAD = "UPLOAD"
}

export class SubmitSignatureDto {
  @IsString()
  fieldId!: string;

  @IsEnum(SignatureKind)
  signatureType!: "DRAW" | "TYPE" | "UPLOAD";

  @IsOptional()
  @IsString()
  imageBase64?: string;

  @IsOptional()
  @IsString()
  typedSignature?: string;

  @IsOptional()
  @IsString()
  userSignatureId?: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  checked?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  saveAsDefault?: boolean;
}
