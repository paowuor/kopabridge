import { Injectable } from '@nestjs/common';
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
}