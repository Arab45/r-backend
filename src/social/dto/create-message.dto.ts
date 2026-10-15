import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ example: 'Would you be available to discuss the paper?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;
}
