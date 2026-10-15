import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ example: 'A short research update from my lab...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  content!: string;

  @ApiProperty({ required: false, type: [String], example: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class UpdatePostDto extends PartialType(CreatePostDto) {}
