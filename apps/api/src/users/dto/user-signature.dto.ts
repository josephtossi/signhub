import { IsString, MinLength } from "class-validator";

export class UserSignatureDto {
  @IsString()
  @MinLength(32)
  imageBase64!: string;
}
