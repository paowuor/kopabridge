import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'The refresh token issued during login or last token rotation',
    example: 'd9b8a34f8e1234567890abcdef1234567890abcdef1234567890abcdef123456',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
