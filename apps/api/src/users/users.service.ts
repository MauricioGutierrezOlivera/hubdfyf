import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(creatorId: string, data: {
    email: string;
    name: string;
    role: Role;
    password?: string;
    countryId: string;
    storeIds?: string[];
  }) {
    // Get creator details
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator user not found');
    }

    // Role restrictions
    if (creator.role === Role.CLERK || creator.role === Role.VISITOR) {
      throw new ForbiddenException('Los usuarios VENDEDOR y VISITA no pueden crear usuarios');
    }

    if (creator.role === Role.COUNTRY_ADMIN) {
      if (data.role !== Role.CLERK && data.role !== Role.VISITOR) {
        throw new ForbiddenException('ADMINISTRADOR TIENDA solo puede crear usuarios VENDEDOR o VISITA');
      }

      // Check if storeIds are within creator's stores
      const creatorStores = await this.prisma.userStore.findMany({
        where: { userId: creatorId },
        select: { storeId: true },
      });
      const creatorStoreIds = creatorStores.map((s) => s.storeId);

      const invalidStore = data.storeIds?.find((id) => !creatorStoreIds.includes(id));
      if (invalidStore) {
        throw new ForbiddenException('ADMINISTRADOR TIENDA can only assign their own stores');
      }
    }

    // Check email uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Create user
    const newUser = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        password: data.password || 'dfyf123', // default password
        countryId: data.countryId,
      },
    });

    // Link stores
    if (data.storeIds && data.storeIds.length > 0) {
      await this.prisma.userStore.createMany({
        data: data.storeIds.map((storeId) => ({
          userId: newUser.id,
          storeId,
        })),
      });
    }

    return this.prisma.user.findUnique({
      where: { id: newUser.id },
      include: {
        stores: {
          include: {
            store: true,
          },
        },
      },
    });
  }

  async getUsers(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === Role.CLERK) {
      throw new ForbiddenException('VENDEDOR has no access to users list');
    }

    if (user.role === Role.SUPER_ADMIN) {
      // MAESTRO sees all users
      return this.prisma.user.findMany({
        include: {
          stores: {
            include: {
              store: true,
            },
          },
          country: true,
        },
      });
    }

    // ADMINISTRADOR TIENDA sees only CLERKs of their stores
    const myStores = await this.prisma.userStore.findMany({
      where: { userId },
      select: { storeId: true },
    });
    const myStoreIds = myStores.map((s) => s.storeId);

    return this.prisma.user.findMany({
      where: {
        role: Role.CLERK,
        stores: {
          some: {
            storeId: { in: myStoreIds },
          },
        },
      },
      include: {
        stores: {
          include: {
            store: true,
          },
        },
        country: true,
      },
    });
  }

  async getStores(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === Role.SUPER_ADMIN) {
      // MAESTRO sees all stores
      return this.prisma.store.findMany({
        include: {
          country: true,
        },
      });
    }

    // Store admin and Clerks see only their assigned stores
    const myStores = await this.prisma.userStore.findMany({
      where: { userId },
      include: {
        store: {
          include: {
            country: true,
          },
        },
      },
    });

    return myStores.map((ms) => ms.store);
  }

  async createStore(creatorId: string, data: {
    name: string;
    address?: string;
    countryId: string;
    shopifyUrl?: string;
    shopifyClientId?: string;
    shopifyClientSecret?: string;
  }) {
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
    });

    if (!creator || creator.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only MAESTRO can create stores');
    }

    return this.prisma.store.create({
      data: {
        name: data.name,
        address: data.address,
        countryId: data.countryId,
        shopifyUrl: data.shopifyUrl,
        shopifyClientId: data.shopifyClientId,
        shopifyClientSecret: data.shopifyClientSecret,
      },
    });
  }

  async updateUser(creatorId: string, userId: string, data: {
    email: string;
    name: string;
    role: Role;
    password?: string;
    countryId: string;
    storeIds?: string[];
  }) {
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator user not found');
    }

    if (creator.role === Role.CLERK || creator.role === Role.VISITOR) {
      throw new ForbiddenException('Los usuarios VENDEDOR y VISITA no pueden editar usuarios');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!targetUser) {
      throw new NotFoundException('User to update not found');
    }

    if (creator.role === Role.COUNTRY_ADMIN) {
      const isTargetAllowed = targetUser.role === Role.CLERK || targetUser.role === Role.VISITOR;
      const isNewRoleAllowed = !data.role || data.role === Role.CLERK || data.role === Role.VISITOR;
      if (!isTargetAllowed || !isNewRoleAllowed) {
        throw new ForbiddenException('ADMINISTRADOR TIENDA solo puede gestionar usuarios VENDEDOR y VISITA');
      }

      const creatorStores = await this.prisma.userStore.findMany({
        where: { userId: creatorId },
        select: { storeId: true },
      });
      const creatorStoreIds = creatorStores.map((s) => s.storeId);

      const invalidStore = data.storeIds?.find((id) => !creatorStoreIds.includes(id));
      if (invalidStore) {
        throw new ForbiddenException('ADMINISTRADOR TIENDA can only assign their own stores');
      }
    }

    if (data.email !== targetUser.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existing) {
        throw new ConflictException('Email already registered');
      }
    }

    const updateData: any = {
      email: data.email,
      name: data.name,
      role: data.role,
      countryId: data.countryId,
    };

    if (data.password) {
      updateData.password = data.password;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await this.prisma.userStore.deleteMany({
      where: { userId },
    });

    if (data.storeIds && data.storeIds.length > 0) {
      await this.prisma.userStore.createMany({
        data: data.storeIds.map((storeId) => ({
          userId,
          storeId,
        })),
      });
    }

    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        stores: {
          include: {
            store: true,
          },
        },
      },
    });
  }

  async getCountries() {
    return this.prisma.country.findMany();
  }
}
