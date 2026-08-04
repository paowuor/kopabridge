import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProviderDto } from './dto/create-provider.dto';

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProviderDto) {
    return this.prisma.provider.create({
      data: dto,
    });
  }

  async findAll() {
    return this.prisma.provider.findMany();
  }

  async findBySlug(slug: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { slug },
    });

    if (!provider || !provider.isActive) {
      throw new NotFoundException(`Provider "${slug}" not found`);
    }

    return provider;
  }
}
