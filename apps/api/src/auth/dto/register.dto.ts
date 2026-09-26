import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'paul@test.com',
    description: 'The unique email address used to create the account',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password must be between 8 and 128 characters long',
  })
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
