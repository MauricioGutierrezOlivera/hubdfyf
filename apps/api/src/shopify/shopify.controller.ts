import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { ShopifyService } from './shopify.service';

@Controller('shopify')
export class ShopifyController {
  private readonly logger = new Logger(ShopifyController.name);

  constructor(private readonly shopifyService: ShopifyService) {}

  /**
   * GET /shopify/test
   * Tests the connection to Shopify and returns shop info.
   */
  @Get('test')
  async testConnection() {
    return this.shopifyService.testConnection();
  }

  /**
   * GET /shopify/products
   * Fetches all products from the connected Shopify store.
   */
  @Get('products')
  async getProducts() {
    return this.shopifyService.getProducts();
  }

  /**
   * GET /shopify/locations
   * Fetches all Shopify locations (warehouses/stores).
   */
  @Get('locations')
  async getLocations() {
    return this.shopifyService.getLocations();
  }

  /**
   * POST /shopify/webhooks/orders
   * Receives webhook notifications from Shopify when an online sale occurs.
   * Shopify sends POST requests here automatically.
   */
  @Post('webhooks/orders')
  async handleOrderWebhook(@Body() body: any) {
    this.logger.log(`Webhook received: Order #${body.order_number || body.id}`);
    // TODO: Process the online order and update local inventory
    return { received: true };
  }

  /**
   * POST /shopify/sync-catalog
   * Manually trigger full catalog & price sync from Shopify to PostgreSQL DB.
   */
  @Post('sync-catalog')
  async syncCatalog() {
    return this.shopifyService.syncCatalogFromShopify();
  }

  /**
   * POST /shopify/bulk-adjust-prices
   * Bulk adjust prices for a list of model names by discount percentage (0 = remove discount).
   */
  @Post('bulk-adjust-prices')
  async bulkAdjustPrices(
    @Body() body: { modelNames: string[]; discountPercentage: number },
  ) {
    const { modelNames, discountPercentage } = body;
    return this.shopifyService.bulkAdjustModelPrices(
      modelNames || [],
      discountPercentage ?? 0,
    );
  }
}
