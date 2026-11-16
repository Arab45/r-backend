import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class OnboardingDto {
  @ApiProperty({
    example: 'Computer Science',
    description: 'User field of study',
  })
  @IsString()
  fieldOfStudy?: string;

  @ApiProperty({
    example: 'I am a passionate researcher in AI.',
    description: 'User bio',
  })
  @IsString()
  bio?: string;

  @ApiProperty({
    example: ['Machine Learning', 'Data Science'],
    description: 'User areas of interest',
  })
  @IsArray()
  @IsString({ each: true })
  areaOfInterest?: string[];

  @ApiProperty({
    example:
      'My research focuses on developing novel algorithms for natural language processing.',
    description: 'User brief research focus',
  })
  @IsString()
  briefResearchFocus?: string;

  @ApiProperty({ example: 2023, description: 'User year of graduation' })
  @IsNumber()
  yearOfGraduation?: number;

  @ApiProperty({
    example: 'University of Ibadan',
    description: 'User institution',
  })
  @IsString()
  institution?: string;
}

export class UpdateProfileDto {
  @ApiProperty({ required: false, example: 'Ada Lovelace' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiProperty({ required: false, example: 'ada_researcher' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(50)
  username?: string;

  @ApiProperty({ required: false, example: 'University of Ibadan' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(200)
  institution?: string;

  @ApiProperty({ required: false, example: 'Computer Science' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  fieldOfStudy?: string;

  @ApiProperty({ required: false, example: 'Researcher in machine learning.' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiProperty({ required: false, type: [String] })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @IsString({ each: true })
  areaOfInterest?: string[];

  @ApiProperty({ required: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  briefResearchFocus?: string;
}
