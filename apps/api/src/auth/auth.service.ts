import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        stores: {
          include: {
            store: true,
          },
        },
      },
    });

    if (!user || user.password !== password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Exclude password from output
    const { password: _, ...result } = user;
    return result;
  }

  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async changePassword(email: string, newPassword: string) {
    const user = await this.prisma.user.update({
      where: { email },
      data: { password: newPassword },
      include: {
        stores: {
          include: {
            store: true,
          },
        },
      },
    });
    const { password: _, ...result } = user;
    return result;
  }
}
