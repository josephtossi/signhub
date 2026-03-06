import { IsEnum, IsOptional, IsString } from "class-validator";

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
}
