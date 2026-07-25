import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { URLSearchParams } from 'node:url';

/**
 * ShopifyService handles all communication with the Shopify Admin API.
 *
 * Authentication: Uses Client Credentials Grant (Dev Dashboard apps).
 * - Tokens are requested programmatically using Client ID + Client Secret.
 * - Tokens expire after 24 hours and are auto-refreshed.
 *
 * Uses REST Admin API for:
 * - Reading products and variants (models + sizes)
 * - Adjusting inventory levels (stock sync)
 * - Reading/creating customers
 * - Reading orders (for webhook validation)
 */
@Injectable()
export class ShopifyService implements OnModuleInit {
  private readonly logger = new Logger(ShopifyService.name);
  private shopName: string; // e.g. "dfyf-chile" (without .myshopify.com)
  private shopUrl: string; // e.g. "dfyf-chile.myshopify.com"
  private clientId: string;
  private clientSecret: string;
  private apiVersion = '2025-01';

  // Token cache
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.shopUrl = this.configService.get<string>('SHOPIFY_STORE_URL', '');
    this.clientId = this.configService.get<string>('SHOPIFY_CLIENT_ID', '');
    this.clientSecret = this.configService.get<string>(
      'SHOPIFY_CLIENT_SECRET',
      '',
    );

    // Extract shop name from URL (e.g. "dfyf-chile" from "dfyf-chile.myshopify.com")
    this.shopName = this.shopUrl.replace('.myshopify.com', '');

    if (!this.shopUrl || !this.clientId || !this.clientSecret) {
      this.logger.warn(
        'Shopify credentials not configured. Set SHOPIFY_STORE_URL, SHOPIFY_CLIENT_ID, and SHOPIFY_CLIENT_SECRET in .env',
      );
    } else {
      this.logger.log(`Shopify configured for store: ${this.shopUrl}`);
      this.logger.log('Using Client Credentials Grant for authentication');
    }
  }

  // ─── AUTHENTICATION (Client Credentials Grant) ──────────────

  /**
   * Get a valid access token, requesting a new one if expired.
   * Tokens are cached and refreshed 60 seconds before expiration.
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    this.logger.log('Requesting new Shopify access token via Client Credentials Grant...');

    const response = await fetch(
      `https://${this.shopUrl}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Token request failed [${response.status}]: ${errorBody}`,
      );
      throw new Error(
        `Shopify token request failed: ${response.status} - ${errorBody}`,
      );
    }

    const { access_token, expires_in, scope } = await response.json();
    this.accessToken = access_token;
    this.tokenExpiresAt = Date.now() + expires_in * 1000;

    this.logger.log(
      `Shopify token obtained successfully. Scopes: ${scope}. Expires in ${Math.round(expires_in / 3600)}h`,
    );

    return this.accessToken!;
  }

  // ─── GENERIC API WRAPPER ───────────────────────────────────

  /**
   * Generic fetch wrapper for Shopify Admin REST API.
   * Automatically handles token acquisition and refresh.
   */
  public async shopifyFetch<T = any>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `https://${this.shopUrl}/admin/api/${this.apiVersion}/${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Shopify API error [${response.status}]: ${errorBody}`,
      );
      throw new Error(
        `Shopify API error: ${response.status} - ${response.statusText}`,
      );
    }

    return response.json() as Promise<T>;
  }

  // ─── PRODUCTS ───────────────────────────────────────────────

  /**
   * Fetch all products from Shopify (paginated).
   * Returns products with their variants (each variant = a size).
   */
  async getProducts(limit = 50, status = 'active'): Promise<any> {
    return this.shopifyFetch(`products.json?limit=${limit}&status=${status}`);
  }

  /**
   * Fetch a single product by its Shopify ID.
   */
  async getProduct(productId: string): Promise<any> {
    return this.shopifyFetch(`products/${productId}.json`);
  }

  // ─── INVENTORY ──────────────────────────────────────────────

  /**
   * Get inventory levels for a specific item at a location.
   */
  async getInventoryLevel(
    inventoryItemId: string,
    locationId: string,
  ): Promise<any> {
    return this.shopifyFetch(
      `inventory_levels.json?inventory_item_ids=${inventoryItemId}&location_ids=${locationId}`,
    );
  }

  /**
   * Adjust inventory by a delta (e.g., -1 for a sale, +1 for a return).
   * This is the CRITICAL method for real-time stock sync.
   */
  async adjustInventory(
    inventoryItemId: string,
    locationId: string,
    delta: number,
  ): Promise<any> {
    this.logger.log(
      `Adjusting inventory: item=${inventoryItemId}, location=${locationId}, delta=${delta}`,
    );

    return this.shopifyFetch('inventory_levels/adjust.json', {
      method: 'POST',
      body: JSON.stringify({
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available_adjustment: delta,
      }),
    });
  }

  // ─── CUSTOMERS ──────────────────────────────────────────────

  /**
   * Search customers by query (e.g., email, name).
   */
  async searchCustomers(query: string): Promise<any> {
    return this.shopifyFetch(
      `customers/search.json?query=${encodeURIComponent(query)}`,
    );
  }

  // ─── LOCATIONS ──────────────────────────────────────────────

  /**
   * Fetch all locations (warehouses/stores) from Shopify.
   * Needed to map our Store entities to Shopify location IDs.
   */
  async getLocations(): Promise<any> {
    return this.shopifyFetch('locations.json');
  }

  // ─── CONNECTION TEST ────────────────────────────────────────

  /**
   * Test the connection to Shopify by fetching the shop details.
   * Returns shop info if successful.
   */
  async testConnection(): Promise<{
    success: boolean;
    shop?: any;
    error?: string;
  }> {
    try {
      const data = await this.shopifyFetch<any>('shop.json');
      this.logger.log(`Connected to Shopify store: ${data.shop?.name}`);
      return { success: true, shop: data.shop };
    } catch (error) {
      this.logger.error(`Shopify connection test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
