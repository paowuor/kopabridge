import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'The refresh token issued during login or last token rotation. Optional when transmitted via secure HttpOnly cookie.',
    example: 'd9b8a34f8e1234567890abcdef1234567890abcdef1234567890abcdef123456',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
