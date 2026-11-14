import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateChatDto {
  @ApiProperty({ description: 'The other participant’s user ID' })
  @IsMongoId()
  recipientId!: string;
}

export class SendChatMessageDto {
  @ApiProperty({
    required: false,
    example: 'Would you be available to discuss the paper?',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;
}
