import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

enum FieldKind {
  SIGNATURE = "SIGNATURE",
  INITIAL = "INITIAL",
  DATE = "DATE",
  TEXT = "TEXT",
  CHECKBOX = "CHECKBOX"
}

class FieldCoordinateDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsEnum(FieldKind)
  type!: "SIGNATURE" | "INITIAL" | "DATE" | "TEXT" | "CHECKBOX";

  @IsInt()
  @Type(() => Number)
  page!: number;

  @IsNumber()
  @Type(() => Number)
  x!: number;

  @IsNumber()
  @Type(() => Number)
  y!: number;

  @IsNumber()
  @Type(() => Number)
  width!: number;

  @IsNumber()
  @Type(() => Number)
  height!: number;

  @IsOptional()
  @IsString()
  recipientId?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @Type(() => Boolean)
  required?: boolean;

  @IsOptional()
  @IsString()
  value?: string;
}

export class SaveFieldsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldCoordinateDto)
  fields!: FieldCoordinateDto[];
}
