import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'paul@test.com',
    description: 'Email address of the account to recover',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
