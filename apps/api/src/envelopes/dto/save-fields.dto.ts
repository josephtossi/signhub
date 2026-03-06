import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

enum FieldKind {
  SIGNATURE = "SIGNATURE"
}

class FieldCoordinateDto {
  @IsEnum(FieldKind)
  type!: "SIGNATURE";

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
}

export class SaveFieldsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldCoordinateDto)
  fields!: FieldCoordinateDto[];
}
