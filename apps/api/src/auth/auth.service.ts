import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';

export interface TokenMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

@Injectable()
export class AuthService {
  private readonly REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
  private readonly BCRYPT_SALT_ROUNDS = 12;
  private readonly MAX_FAILED_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly PASSWORD_RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
  // Pre-hashed bcrypt cost-12 dummy hash to defend against timing-based email enumeration
  private readonly DUMMY_PASSWORD_HASH =
    '$2b$12$Bz868uf/GcwO9.KY3lXkx.mfe2peHXuBRjqRqPbS2.gtkZ4BlEra2';

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(
      dto.password,
      this.BCRYPT_SALT_ROUNDS,
    );

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
      },
    });

    return { id: user.id, email: user.email };
  }

  async login(dto: LoginDto, metadata?: TokenMetadata): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Timing attack mitigation: if user does not exist, is soft-deleted, or disabled,
    // execute constant-time bcrypt comparison against dummy hash before rejecting.
    if (!user || user.deletedAt || user.isActive === false) {
      await bcrypt.compare(dto.password, this.DUMMY_PASSWORD_HASH);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Account Lockout check (brute-force defense)
    const now = new Date();
    if (user.lockedUntil && new Date(user.lockedUntil) > now) {
      // Execute constant-time bcrypt compare to avoid revealing lock status via timing
      await bcrypt.compare(dto.password, this.DUMMY_PASSWORD_HASH);
      throw new UnauthorizedException(
        'Account is temporarily locked due to consecutive failed login attempts. Please try again later.',
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      // If lockout previously expired, start a fresh attempt counter
      const isLockoutExpired =
        user.lockedUntil && new Date(user.lockedUntil) <= now;
      const currentFailedAttempts = isLockoutExpired
        ? 0
        : user.failedLoginAttempts || 0;
      const newAttempts = currentFailedAttempts + 1;

      if (newAttempts >= this.MAX_FAILED_LOGIN_ATTEMPTS) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newAttempts,
            lockedUntil: new Date(Date.now() + this.LOCKOUT_DURATION_MS),
          },
        });
        throw new UnauthorizedException(
          'Account is temporarily locked due to consecutive failed login attempts. Please try again later.',
        );
      } else {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newAttempts,
            lockedUntil: null,
          },
        });
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    // Login successful: reset failed attempts and lockout if previously flagged
    if (
      (user.failedLoginAttempts && user.failedLoginAttempts > 0) ||
      user.lockedUntil
    ) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // Generate cryptographically secure refresh token
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const family = crypto.randomUUID();

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        family,
        expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_TTL_MS),
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: rawRefreshToken,
      token_type: 'Bearer',
      expires_in: this.ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  async refresh(
    refreshToken: string,
    metadata?: TokenMetadata,
  ): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = this.hashToken(refreshToken);

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse detection: If a revoked token is presented, compromise is assumed.
    // Invalidate the entire token family immediately.
    if (tokenRecord.revoked) {
      await this.prisma.refreshToken.updateMany({
        where: { family: tokenRecord.family },
        data: {
          revoked: true,
          revokedAt: new Date(),
        },
      });
      throw new UnauthorizedException(
        'Revoked refresh token reuse detected. All active sessions in this family have been terminated.',
      );
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (tokenRecord.user.deletedAt || tokenRecord.user.isActive === false) {
      throw new UnauthorizedException('User account is inactive or disabled');
    }

    // Invalidate the used refresh token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });

    // Issue new tokens maintaining the same family lineage
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = this.hashToken(newRawRefreshToken);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: newTokenHash,
        userId: tokenRecord.userId,
        family: tokenRecord.family,
        expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_TTL_MS),
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      },
    });

    const accessToken = this.jwtService.sign({
      sub: tokenRecord.user.id,
      email: tokenRecord.user.email,
      role: tokenRecord.user.role,
    });

    return {
      access_token: accessToken,
      refresh_token: newRawRefreshToken,
      token_type: 'Bearer',
      expires_in: this.ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  async logout(
    refreshToken?: string,
  ): Promise<{ status: string; message: string }> {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (tokenRecord) {
        // Invalidate all tokens in the family
        await this.prisma.refreshToken.updateMany({
          where: { family: tokenRecord.family },
          data: {
            revoked: true,
            revokedAt: new Date(),
          },
        });
      }
    }

    return {
      status: 'success',
      message: 'Session successfully terminated.',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user && !user.deletedAt && user.isActive !== false) {
      // Invalidate any existing unused reset tokens for this user
      await this.prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(rawToken);

      await this.prisma.passwordResetToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt: new Date(Date.now() + this.PASSWORD_RESET_TOKEN_TTL_MS),
        },
      });

      // In production with email transport:
      // await this.mailService.sendPasswordResetEmail(user.email, rawToken);
    } else {
      // Constant-time execution to prevent email enumeration timing attacks
      await bcrypt.compare(dto.email, this.DUMMY_PASSWORD_HASH);
    }

    return {
      message:
        'If an account with that email exists, password reset instructions have been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);

    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !tokenRecord ||
      tokenRecord.usedAt !== null ||
      tokenRecord.expiresAt < new Date() ||
      tokenRecord.user.deletedAt ||
      tokenRecord.user.isActive === false
    ) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const hashedPassword = await bcrypt.hash(
      dto.newPassword,
      this.BCRYPT_SALT_ROUNDS,
    );

    // Atomically invalidate reset token, update user password & unlock, and revoke existing sessions
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: tokenRecord.userId },
        data: {
          password: hashedPassword,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId, revoked: false },
        data: {
          revoked: true,
          revokedAt: new Date(),
        },
      }),
    ]);

    return {
      message:
        'Password has been successfully reset. Please log in with your new password.',
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
