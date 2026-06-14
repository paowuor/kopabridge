import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'paul@test.com',
    description: 'The primary email address of the user account',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'The secure account password',
  })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}