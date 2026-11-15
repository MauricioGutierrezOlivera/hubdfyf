import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FinanceService } from './finance.service';
import { FinanceAdminGuard } from './finance-admin.guard';
import { MAX_DOCUMENT_BYTES } from './finance-storage.service';
import type { UploadedDocument } from './finance-storage.service';

type Body = Record<string, unknown>;

/** Módulo Finanzas (docs/modulo-finanzas.md). Todas las rutas: solo Administradores. */
@Controller('finance')
@UseGuards(FinanceAdminGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  // ---------------- Pedidos ----------------
  @Get('orders')
  listOrders() {
    return this.finance.listOrders();
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.finance.getOrder(id);
  }

  @Post('orders')
  createOrder(@Body() body: Body) {
    return this.finance.createOrder(body);
  }

  @Patch('orders/:id')
  updateOrder(@Param('id') id: string, @Body() body: Body) {
    return this.finance.updateOrder(id, body);
  }

  @Delete('orders/:id')
  deleteOrder(@Param('id') id: string) {
    return this.finance.deleteOrder(id);
  }

  // ---------------- Costos del pedido ----------------
  @Post('orders/:id/costs')
  createCost(@Param('id') orderId: string, @Body() body: Body) {
    return this.finance.createCost(orderId, body);
  }

  @Patch('costs/:id')
  updateCost(@Param('id') id: string, @Body() body: Body) {
    return this.finance.updateCost(id, body);
  }

  @Delete('costs/:id')
  deleteCost(@Param('id') id: string) {
    return this.finance.deleteCost(id);
  }

  @Post('costs/:id/document')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_BYTES } }))
  uploadCostDocument(@Param('id') id: string, @UploadedFile() file: UploadedDocument) {
    return this.finance.attachDocument('cost', id, file);
  }

  @Get('costs/:id/document')
  costDocument(@Param('id') id: string) {
    return this.finance.documentLink('cost', id);
  }

  // ---------------- Modelos del pedido ----------------
  @Post('orders/:id/items')
  createItem(@Param('id') orderId: string, @Body() body: Body) {
    return this.finance.createItem(orderId, body);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() body: Body) {
    return this.finance.updateItem(id, body);
  }

  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return this.finance.deleteItem(id);
  }

  // ---------------- Costos por producto ----------------
  @Get('product-costs')
  productCosts() {
    return this.finance.productCosts();
  }

  @Post('product-costs/assign')
  assignProductCost(@Body() body: Body) {
    return this.finance.assignProductCost(body);
  }

  @Post('product-costs/unassign')
  unassignProductCost(@Body() body: Body) {
    return this.finance.unassignProductCost(body);
  }

  @Post('product-costs/recompute')
  recomputeCostLinks() {
    return this.finance.recomputeCostLinks();
  }

  // ---------------- Gastos ----------------
  @Get('expenses')
  listExpenses(@Query('from') from?: string, @Query('to') to?: string, @Query('category') category?: string) {
    return this.finance.listExpenses({ from, to, category });
  }

  @Post('expenses')
  createExpense(@Body() body: Body) {
    return this.finance.createExpense(body);
  }

  @Post('expenses/duplicate-fixed')
  duplicateFixedExpenses(@Body() body: Body) {
    return this.finance.duplicateFixedExpenses(body);
  }

  @Patch('expenses/:id')
  updateExpense(@Param('id') id: string, @Body() body: Body) {
    return this.finance.updateExpense(id, body);
  }

  @Delete('expenses/:id')
  deleteExpense(@Param('id') id: string) {
    return this.finance.deleteExpense(id);
  }

  @Post('expenses/:id/document')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_BYTES } }))
  uploadExpenseDocument(@Param('id') id: string, @UploadedFile() file: UploadedDocument) {
    return this.finance.attachDocument('expense', id, file);
  }

  @Get('expenses/:id/document')
  expenseDocument(@Param('id') id: string) {
    return this.finance.documentLink('expense', id);
  }

  // ---------------- Ventas mayoristas ----------------
  @Get('wholesale')
  listWholesale() {
    return this.finance.listWholesale();
  }

  @Post('wholesale')
  createWholesale(@Body() body: Body) {
    return this.finance.createWholesale(body);
  }

  @Patch('wholesale/:id')
  updateWholesale(@Param('id') id: string, @Body() body: Body) {
    return this.finance.updateWholesale(id, body);
  }

  @Delete('wholesale/:id')
  deleteWholesale(@Param('id') id: string) {
    return this.finance.deleteWholesale(id);
  }

  @Post('wholesale/:id/document')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_BYTES } }))
  uploadWholesaleDocument(@Param('id') id: string, @UploadedFile() file: UploadedDocument) {
    return this.finance.attachDocument('wholesale', id, file);
  }

  @Get('wholesale/:id/document')
  wholesaleDocument(@Param('id') id: string) {
    return this.finance.documentLink('wholesale', id);
  }

  // ---------------- Aportes y caja ----------------
  @Get('contributions')
  listContributions() {
    return this.finance.listContributions();
  }

  @Post('contributions')
  createContribution(@Body() body: Body) {
    return this.finance.createContribution(body);
  }

  @Patch('contributions/:id')
  updateContribution(@Param('id') id: string, @Body() body: Body) {
    return this.finance.updateContribution(id, body);
  }

  @Delete('contributions/:id')
  deleteContribution(@Param('id') id: string) {
    return this.finance.deleteContribution(id);
  }

  @Get('cash')
  listCash() {
    return this.finance.listCashBalances();
  }

  @Post('cash')
  createCash(@Body() body: Body) {
    return this.finance.createCashBalance(body);
  }

  @Delete('cash/:id')
  deleteCash(@Param('id') id: string) {
    return this.finance.deleteCashBalance(id);
  }

  // ---------------- Resultado ----------------
  /** GET /finance/monthly?from=YYYY-MM&to=YYYY-MM */
  @Get('monthly')
  monthly(@Query('from') from?: string, @Query('to') to?: string) {
    return this.finance.monthly(from, to);
  }

  @Get('summary')
  summary() {
    return this.finance.summary();
  }
}
