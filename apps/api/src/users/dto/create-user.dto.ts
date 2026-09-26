import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

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
    description: 'The temporary or initial access password (8-128 chars)',
  })
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
