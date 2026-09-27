import { Body, Controller, Get, Headers, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ProposalsService } from './proposals.service';
import type { GenerateExcelInput } from './proposals.service';

@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  /**
   * GET /proposals/search?q=lirio
   * Busca modelos activos en Shopify por nombre, con foto, PVP y stock por talla.
   * Solo Administradores.
   */
  @Get('search')
  async search(@Headers('x-user-id') userId: string, @Query('q') q: string) {
    return this.proposalsService.searchProducts(userId, q);
  }

  /**
   * POST /proposals/excel
   * Genera y descarga el Excel de la propuesta comercial con los modelos seleccionados.
   * Solo Administradores.
   */
  @Post('excel')
  async excel(
    @Headers('x-user-id') userId: string,
    @Body() body: GenerateExcelInput,
    @Res() res: Response,
  ) {
    const buffer = await this.proposalsService.generateExcel(userId, body);
    const filename = `Propuesta_DFYF_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
