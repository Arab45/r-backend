import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'Tommy Adebakin', description: 'User full name' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ required: false, example: 'tommy_adebayo' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,30}$/)
  username?: string;

  @ApiProperty({
    example: 'tommy.adebakin@example.com',
    description: 'User email',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '********', description: 'User password' })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class ResearchStepDto {
  @ApiProperty({
    example: ['AI', 'Blockchain'],
    description: 'Research areas of interest (at least one)',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  areaOfInterest!: string[];

  @ApiProperty({
    example: 'AI in decentralized finance',
    description: 'Short summary of research focus',
  })
  @IsString()
  @IsNotEmpty()
  briefResearchFocus!: string;
}

export class AcademicStepDto {
  @ApiProperty({
    example: 'Computer Science',
    description: 'Primary field of study',
  })
  @IsString()
  @IsNotEmpty()
  fieldOfStudy!: string;

  @ApiProperty({
    example: 'University of Ibadan',
    description: 'Institution name',
  })
  @IsString()
  @IsNotEmpty()
  institution!: string;

  @ApiProperty({
    example: 'AI enthusiast and backend developer',
    description: 'Short professional / research bio',
  })
  @IsString()
  @IsNotEmpty()
  bio!: string;
}
