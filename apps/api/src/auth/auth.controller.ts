import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Validation failed or email already in use.',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests. Registration rate limit exceeded.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user and return access & refresh tokens' })
  @ApiResponse({
    status: 200,
    description:
      'Successfully authenticated. Access token and rotating refresh token issued.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized. Invalid email or password, account locked, or account disabled.',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests. Login rate limit exceeded.',
  })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;
    return this.authService.login(dto, { userAgent, ipAddress });
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate and exchange refresh token for a new access token pair',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens successfully rotated and refreshed.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid, expired, or reused refresh token.',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests. Refresh rate limit exceeded.',
  })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;
    return this.authService.refresh(dto.refreshToken, { userAgent, ipAddress });
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke refresh token and invalidate session' })
  @ApiResponse({
    status: 200,
    description: 'Session successfully invalidated.',
  })
  logout(@Body() dto: Partial<RefreshTokenDto>) {
    return this.authService.logout(dto.refreshToken);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset instructions for an account',
  })
  @ApiResponse({
    status: 200,
    description:
      'If the email is registered, password reset instructions are dispatched.',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests. Rate limit exceeded.',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password using a valid one-time recovery token',
  })
  @ApiResponse({
    status: 200,
    description:
      'Password successfully reset and all active sessions invalidated.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Invalid or expired token, or invalid password.',
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests. Rate limit exceeded.',
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
