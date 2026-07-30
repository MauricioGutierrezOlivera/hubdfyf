import { Controller, Get, Post, Put, Patch, Delete, Body, Headers, Param, Query, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SaleType } from '@prisma/client';

@Controller('admin')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  private checkAuth(userId: string, storeId?: string) {
    if (!userId) {
      throw new UnauthorizedException('x-user-id header is required');
    }
    if (storeId === undefined) {
      // Allow endpoints that don't need storeId to skip this check
      return;
    }
    if (!storeId) {
      throw new BadRequestException('x-store-id header is required');
    }
  }

  @Get('pos-catalog')
  async getPOSCatalog(
    @Headers('x-user-id') userId: string,
    @Headers('x-store-id') storeId: string,
  ) {
    this.checkAuth(userId, storeId);
    return this.salesService.getPOSCatalog(storeId);
  }

  @Get('sales/:id')
  async getSaleDetails(
    @Headers('x-user-id') userId: string,
    @Param('id') saleId: string,
  ) {
    this.checkAuth(userId);
    return this.salesService.getSaleDetails(saleId);
  }

  @Put('sales/:id')
  async updateSale(
    @Headers('x-user-id') userId: string,
    @Param('id') saleId: string,
    @Body() updateData: any,
  ) {
    this.checkAuth(userId);
    return this.salesService.updateSale(saleId, userId, updateData);
  }

  @Delete('sales/:id')
  async deleteSale(
    @Headers('x-user-id') userId: string,
    @Param('id') saleId: string,
  ) {
    this.checkAuth(userId);
    return this.salesService.deleteSale(saleId, userId);
  }

  @Get('sales/customer/:id')
  async getCustomerSalesHistory(
    @Headers('x-user-id') userId: string,
    @Param('id') customerId: string,
  ) {
    this.checkAuth(userId);
    return this.salesService.getCustomerSalesHistory(customerId);
  }

  @Get('sales/customer-rut/:rut')
  async getCustomerSalesHistoryByRut(
    @Headers('x-user-id') userId: string,
    @Param('rut') rut: string,
  ) {
    this.checkAuth(userId);
    return this.salesService.getCustomerSalesHistoryByRut(rut);
  }

  @Get('customers/search')
  async searchCustomer(
    @Headers('x-user-id') userId: string,
    @Query('query') query: string,
  ) {
    this.checkAuth(userId);
    return this.salesService.searchCustomers(query);
  }

  @Get('customers')
  async getAllCustomers(@Headers('x-user-id') userId: string) {
    this.checkAuth(userId);
    return this.salesService.getAllCustomers();
  }

  @Post('customers')
  async createCustomer(
    @Headers('x-user-id') userId: string,
    @Body() body: { name: string; rut?: string; email?: string; phone?: string },
  ) {
    this.checkAuth(userId);
    return this.salesService.createCustomer(body);
  }

  @Patch('customers/:id')
  async updateCustomer(
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; rut?: string; email?: string; phone?: string },
  ) {
    this.checkAuth(userId);
    return this.salesService.updateCustomer(id, body);
  }

  @Get('reports/sales')
  async getSalesReport(
    @Headers('x-user-id') userId: string,
    @Headers('x-store-id') storeId: string,
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    this.checkAuth(userId, storeId);
    const parsedYear = parseInt(year) || new Date().getFullYear();
    const parsedMonth = month ? parseInt(month) : undefined;
    return this.salesService.getSalesReport(storeId, parsedYear, parsedMonth);
  }

  @Get('reports/analytics')
  async getAnalyticsReport(
    @Headers('x-user-id') userId: string,
    @Headers('x-store-id') storeId: string,
    @Query('fromYear') fromYear: string,
    @Query('fromMonth') fromMonth: string,
    @Query('toYear') toYear: string,
    @Query('toMonth') toMonth: string,
  ) {
    this.checkAuth(userId, storeId);
    const now = new Date();
    const fY = parseInt(fromYear) || now.getFullYear() - 1;
    const fM = parseInt(fromMonth) || now.getMonth() + 1;
    const tY = parseInt(toYear) || now.getFullYear();
    const tM = parseInt(toMonth) || now.getMonth() + 1;
    return this.salesService.getAnalyticsReport(storeId, fY, fM, tY, tM);
  }

  @Get('reports/styles')
  async getStyleReport(
    @Headers('x-user-id') userId: string,
    @Headers('x-store-id') storeId: string,
    @Query('fromYear') fromYear?: string,
    @Query('fromMonth') fromMonth?: string,
    @Query('toYear') toYear?: string,
    @Query('toMonth') toMonth?: string,
  ) {
    this.checkAuth(userId, storeId);
    const fY = fromYear ? parseInt(fromYear) : undefined;
    const fM = fromMonth ? parseInt(fromMonth) : undefined;
    const tY = toYear ? parseInt(toYear) : undefined;
    const tM = toMonth ? parseInt(toMonth) : undefined;
    return this.salesService.getStyleReport(storeId, fY, fM, tY, tM);
  }

  @Get('reports/inventory')
  async getInventoryReport(
    @Headers('x-user-id') userId: string,
    @Headers('x-store-id') storeId: string,
  ) {
    this.checkAuth(userId, storeId);
    return this.salesService.getInventoryReport(storeId);
  }

  @Post('sales')
  async createSale(
    @Headers('x-user-id') userId: string,
    @Headers('x-store-id') storeId: string,
    @Body() body: {
      customerId?: string;
      type: SaleType;
      notes?: string;
      vendedor: string;
      channel: string;
      paymentMethod?: string;
      paymentBank?: string;
      items: Array<{
        productId: string;
        quantity: number;
        price: number;
        discount?: number;
      }>;
    },
  ) {
    this.checkAuth(userId, storeId);
    return this.salesService.createSale(userId, storeId, body);
  }
}
