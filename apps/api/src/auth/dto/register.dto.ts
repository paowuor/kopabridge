import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

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
    description: 'Password must be at least 6 characters long',
  })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}