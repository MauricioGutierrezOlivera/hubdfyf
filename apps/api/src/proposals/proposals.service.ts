import { ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import imageSize from 'image-size';
import { PrismaService } from '../prisma/prisma.service';
import { ShopifyService } from '../shopify/shopify.service';
import { Role } from '@prisma/client';
import { DFYF_LOGO_BASE64 } from './dfyf-logo';

export interface ProposalItemInput {
  modelo: string;
  descripcion: string;
  imageUrl: string | null;
  pvp: number;
  margen: number; // fraction, e.g. 0.30
  sizes: Record<string, number>; // e.g. { "35": 2, "36": 3, ... }
}

export interface GenerateExcelInput {
  clientName?: string;
  items: ProposalItemInput[];
}

const IVA = 0.19;
const ALL_SIZES = ['35', '36', '37', '38', '39', '40', '41', '42'];

@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shopifyService: ShopifyService,
  ) {}

  private async checkAdmin(userId: string) {
    if (!userId) {
      throw new UnauthorizedException('x-user-id header is required');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.COUNTRY_ADMIN) {
      throw new ForbiddenException('Solo un administrador puede usar el módulo de Propuestas');
    }
    return user;
  }

  async searchProducts(userId: string, query: string) {
    await this.checkAdmin(userId);
    return this.shopifyService.searchProductsForProposal(query || '');
  }

  private async fetchImageBuffer(url: string): Promise<{ buffer: Buffer; extension: 'png' | 'jpeg' } | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = url.toLowerCase().includes('.png') ? 'png' : 'jpeg';
      return { buffer, extension: ext };
    } catch (err: any) {
      this.logger.warn(`No se pudo descargar la imagen ${url}: ${err.message}`);
      return null;
    }
  }

  async generateExcel(userId: string, input: GenerateExcelInput): Promise<Buffer> {
    await this.checkAdmin(userId);

    if (!input.items || input.items.length === 0) {
      throw new ForbiddenException('La propuesta no tiene modelos agregados');
    }

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Propuesta', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    ws.views = [{ showGridLines: false }];

    const FONT_NAME = 'Arial';
    const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    const YELLOW_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    const TOTAL_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    const BORDER: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      left: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      right: { style: 'thin', color: { argb: 'FFB0B0B0' } },
    };
    const CENTER: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle', wrapText: true };
    const LEFT: Partial<ExcelJS.Alignment> = { horizontal: 'left', vertical: 'middle', wrapText: true };

    // ---------- Logo ----------
    const logoBuffer = Buffer.from(DFYF_LOGO_BASE64, 'base64');
    const logoDims = imageSize(logoBuffer);
    const LOGO_MAX = 80;
    const logoScale = LOGO_MAX / Math.max(logoDims.width || 1, logoDims.height || 1);
    const logoImageId = workbook.addImage({ buffer: logoBuffer as any, extension: 'png' });
    ws.addImage(logoImageId, {
      tl: { col: 0, row: 0 },
      ext: { width: (logoDims.width || LOGO_MAX) * logoScale, height: (logoDims.height || LOGO_MAX) * logoScale },
    });
    for (let r = 1; r <= 4; r++) ws.getRow(r).height = 20;

    // ---------- Encabezado ----------
    ws.getCell('B2').value = 'PROPUESTA COMERCIAL - DFYF';
    ws.getCell('B2').font = { name: FONT_NAME, size: 16, bold: true };
    ws.getCell('B3').value = 'Cliente:';
    ws.getCell('B3').font = { name: FONT_NAME, size: 10, bold: true };
    ws.getCell('C3').value = input.clientName || '[Nombre potencial cliente]';
    ws.getCell('C3').font = { name: FONT_NAME, size: 10, color: { argb: 'FF0000FF' } };

    // ---------- Tabla ----------
    const HEADER_ROW = 6;
    const headers = [
      'Foto', 'Modelo', 'Descripción', 'PVP Sugerido', 'Margen',
      ...ALL_SIZES, 'Total Pares', 'Costo Cliente (neto)', 'Costo Total Cliente',
    ];
    const colWidths = [16, 20, 20, 13, 9, 6, 6, 6, 6, 6, 6, 6, 6, 12, 16, 17];
    headers.forEach((h, idx) => {
      const col = idx + 1;
      ws.getColumn(col).width = colWidths[idx];
      const cell = ws.getRow(HEADER_ROW).getCell(col);
      cell.value = h;
      cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = HEADER_FILL;
      cell.alignment = CENTER;
      cell.border = BORDER;
    });

    // Columnas: A Foto, B Modelo, C Desc, D PVP, E Margen, F-M tallas 35-42, N Total, O Costo neto, P Costo Total
    const SIZE_COLS = ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
    const ROW_HEIGHT = 95;
    const MAX_IMG_W = 95;
    const MAX_IMG_H = 120;

    let row = HEADER_ROW + 1;
    const firstDataRow = row;

    for (const item of input.items) {
      ws.getRow(row).height = ROW_HEIGHT;

      if (item.imageUrl) {
        const img = await this.fetchImageBuffer(item.imageUrl);
        if (img) {
          const dims = imageSize(img.buffer);
          const scale = Math.min(MAX_IMG_W / (dims.width || MAX_IMG_W), MAX_IMG_H / (dims.height || MAX_IMG_H));
          const imgId = workbook.addImage({ buffer: img.buffer as any, extension: img.extension });
          ws.addImage(imgId, {
            tl: { col: 0, row: row - 1 },
            ext: { width: (dims.width || MAX_IMG_W) * scale, height: (dims.height || MAX_IMG_H) * scale },
          });
        }
      }

      const modeloCell = ws.getCell(`B${row}`);
      modeloCell.value = item.modelo;
      modeloCell.font = { name: FONT_NAME, size: 10, bold: true };
      modeloCell.alignment = LEFT;

      const descCell = ws.getCell(`C${row}`);
      descCell.value = item.descripcion;
      descCell.font = { name: FONT_NAME, size: 10 };
      descCell.alignment = LEFT;

      const pvpCell = ws.getCell(`D${row}`);
      pvpCell.value = item.pvp;
      pvpCell.font = { name: FONT_NAME, size: 10, color: { argb: 'FF0000FF' } };
      pvpCell.fill = YELLOW_FILL;
      pvpCell.numFmt = '$#,##0';
      pvpCell.alignment = CENTER;

      const margenCell = ws.getCell(`E${row}`);
      margenCell.value = item.margen;
      margenCell.font = { name: FONT_NAME, size: 10, color: { argb: 'FF0000FF' } };
      margenCell.fill = YELLOW_FILL;
      margenCell.numFmt = '0%';
      margenCell.alignment = CENTER;

      SIZE_COLS.forEach((colLetter, i) => {
        const size = ALL_SIZES[i];
        const cell = ws.getCell(`${colLetter}${row}`);
        cell.value = item.sizes[size] || 0;
        cell.font = { name: FONT_NAME, size: 10, color: { argb: 'FF0000FF' } };
        cell.alignment = CENTER;
      });

      const totalCell = ws.getCell(`N${row}`);
      totalCell.value = { formula: `SUM(F${row}:M${row})` } as any;
      totalCell.font = { name: FONT_NAME, size: 10 };
      totalCell.alignment = CENTER;

      const costoCell = ws.getCell(`O${row}`);
      costoCell.value = { formula: `(D${row}/${1 + IVA})*(1-E${row})` } as any;
      costoCell.font = { name: FONT_NAME, size: 10 };
      costoCell.numFmt = '$#,##0';
      costoCell.alignment = CENTER;

      const costoTotalCell = ws.getCell(`P${row}`);
      costoTotalCell.value = { formula: `O${row}*N${row}` } as any;
      costoTotalCell.font = { name: FONT_NAME, size: 10 };
      costoTotalCell.numFmt = '$#,##0';
      costoTotalCell.alignment = CENTER;

      for (let c = 1; c <= headers.length; c++) {
        ws.getRow(row).getCell(c).border = BORDER;
      }

      row += 1;
    }
    const lastDataRow = row - 1;

    // ---------- Totales ----------
    const totalRow = row;
    const totalLabelCell = ws.getCell(`B${totalRow}`);
    totalLabelCell.value = 'MONTO FINAL A PAGAR';
    totalLabelCell.font = { name: FONT_NAME, size: 10, bold: true };

    const totalParesCell = ws.getCell(`N${totalRow}`);
    totalParesCell.value = { formula: `SUM(N${firstDataRow}:N${lastDataRow})` } as any;
    totalParesCell.font = { name: FONT_NAME, size: 10, bold: true };
    totalParesCell.alignment = CENTER;

    const totalMontoCell = ws.getCell(`P${totalRow}`);
    totalMontoCell.value = { formula: `SUM(P${firstDataRow}:P${lastDataRow})` } as any;
    totalMontoCell.font = { name: FONT_NAME, size: 10, bold: true };
    totalMontoCell.numFmt = '$#,##0';
    totalMontoCell.alignment = CENTER;

    for (let c = 1; c <= headers.length; c++) {
      const cell = ws.getRow(totalRow).getCell(c);
      cell.border = BORDER;
      cell.fill = TOTAL_FILL;
    }

    // ---------- Nota ----------
    const noteRow = totalRow + 2;
    const noteCell = ws.getCell(`B${noteRow}`);
    noteCell.value =
      'Celdas en amarillo = editables (PVP, margen por modelo, tallas). Tallas precargadas con el stock disponible en Shopify al armar la propuesta. Costo Cliente y Monto Final se recalculan automáticamente.';
    noteCell.font = { name: FONT_NAME, size: 8, italic: true, color: { argb: 'FF666666' } };

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
