import { Controller, Post, Get, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: { email: string; password?: string },
  ) {
    return this.authService.login(body.email, body.password || '');
  }

  @Get('users')
  async getUsers() {
    return this.authService.listUsers();
  }

  @Post('change-password')
  async changePassword(
    @Body() body: { email: string; newPassword?: string },
  ) {
    return this.authService.changePassword(body.email, body.newPassword || '');
  }
}
