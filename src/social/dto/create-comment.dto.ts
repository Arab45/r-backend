import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Interesting result. What dataset did you use?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}
