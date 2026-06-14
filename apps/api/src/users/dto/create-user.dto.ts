import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'paul@test.com',
    description: 'Email address used for creating a internal user resource',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'The temporary or initial access password',
  })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}