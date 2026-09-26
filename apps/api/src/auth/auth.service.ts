import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
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

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);

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

    if (!user || user.deletedAt || user.isActive === false) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
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

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
