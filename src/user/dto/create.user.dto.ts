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
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,30}$/)
  username?: string;


  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class ResearchStepDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  areaOfInterest!: string[];


  @IsString()
  @IsNotEmpty()
  briefResearchFocus!: string;
}

export class AcademicStepDto {
  @IsString()
  @IsNotEmpty()
  fieldOfStudy!: string;


  @IsString()
  @IsNotEmpty()
  institution!: string;


  @IsString()
  @IsNotEmpty()
  bio!: string;
}
