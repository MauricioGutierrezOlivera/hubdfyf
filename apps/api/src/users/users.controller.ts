import { Controller, Get, Post, Put, Body, Headers, Param, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';

@Controller('admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private checkAuth(userId: string) {
    if (!userId) {
      throw new UnauthorizedException('x-user-id header is required');
    }
  }

  @Post('users')
  async createUser(
    @Headers('x-user-id') creatorId: string,
    @Body() body: {
      email: string;
      name: string;
      role: Role;
      password?: string;
      countryId: string;
      storeIds?: string[];
    },
  ) {
    this.checkAuth(creatorId);
    return this.usersService.createUser(creatorId, body);
  }

  @Put('users/:id')
  async updateUser(
    @Headers('x-user-id') creatorId: string,
    @Param('id') userId: string,
    @Body() body: {
      email: string;
      name: string;
      role: Role;
      password?: string;
      countryId: string;
      storeIds?: string[];
    },
  ) {
    this.checkAuth(creatorId);
    return this.usersService.updateUser(creatorId, userId, body);
  }

  @Get('users')
  async getUsers(@Headers('x-user-id') userId: string) {
    this.checkAuth(userId);
    return this.usersService.getUsers(userId);
  }

  @Post('stores')
  async createStore(
    @Headers('x-user-id') creatorId: string,
    @Body() body: {
      name: string;
      address?: string;
      countryId: string;
      shopifyUrl?: string;
      shopifyClientId?: string;
      shopifyClientSecret?: string;
    },
  ) {
    this.checkAuth(creatorId);
    return this.usersService.createStore(creatorId, body);
  }

  @Get('stores')
  async getStores(@Headers('x-user-id') userId: string) {
    this.checkAuth(userId);
    return this.usersService.getStores(userId);
  }

  @Get('countries')
  async getCountries() {
    return this.usersService.getCountries();
  }
}
