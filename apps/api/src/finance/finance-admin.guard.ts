import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Finanzas es solo para Administradores (SUPER_ADMIN / COUNTRY_ADMIN).
 * El perfil VISITA no tiene acceso. Mismo mecanismo que Propuestas: header x-user-id.
 */
@Injectable()
export class FinanceAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const userId = req.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('x-user-id header is required');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.COUNTRY_ADMIN)) {
      throw new ForbiddenException('Solo un administrador puede usar el módulo de Finanzas');
    }
    return true;
  }
}
