import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly BCRYPT_SALT_ROUNDS = 12;

  constructor(private prisma: PrismaService) {}

  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    // Previously stored dto.password verbatim — this was writing
    // plaintext passwords to the database. Always hash before persisting.
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

  async getUsers() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
    });
    // Never return password hashes, even to admin-only endpoints.
    return users.map((user) => {
      const { password, ...rest } = user;
      void password;
      return rest;
    });
  }

  async softDeleteUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }
}
