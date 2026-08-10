import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

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

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

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
      // Trigger background catalog sync on startup to populate compareAtPrice & prices
      setTimeout(() => {
        this.syncCatalogFromShopify().catch((err) => {
          this.logger.error(`Initial Shopify catalog sync failed: ${err}`);
        });
      }, 5000);
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
   * Create a new customer in Shopify.
   */
  async createCustomer(data: { name: string; email?: string; phone?: string; rut?: string }): Promise<any> {
    const nameParts = data.name.trim().split(' ');
    const firstName = nameParts[0] || data.name;
    const lastName = nameParts.slice(1).join(' ') || '';

    let phone: string | undefined = undefined;
    if (data.phone) {
      const cleanDigits = data.phone.replace(/[^0-9]/g, '');
      if (cleanDigits.length === 9) {
        phone = `+56${cleanDigits}`;
      } else if (cleanDigits.startsWith('569') && cleanDigits.length === 11) {
        phone = `+${cleanDigits}`;
      } else {
        phone = data.phone;
      }
    }

    try {
      const res = await this.shopifyFetch<any>('customers.json', {
        method: 'POST',
        body: JSON.stringify({
          customer: {
            first_name: firstName,
            last_name: lastName,
            email: data.email || undefined,
            phone: phone || undefined,
            note: data.rut ? `RUT: ${data.rut}` : undefined,
            tags: 'POS',
          },
        }),
      });
      return res?.customer || null;
    } catch (err) {
      this.logger.error(`Error creating customer in Shopify: ${err}`);
      return null;
    }
  }

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

  /**
   * Sync all active products, prices, and compare_at_price values directly from Shopify into PostgreSQL database.
   */
  async syncCatalogFromShopify(): Promise<{ success: boolean; updatedVariantsCount: number }> {
    try {
      this.logger.log('[Shopify Sync] Syncing catalog & compareAtPrice values from Shopify...');
      const res = await this.getProducts(250);
      const products = res.products || [];
      let updatedVariantsCount = 0;

      for (const p of products) {
        for (const v of p.variants) {
          const shopifyId = String(v.id);
          const price = parseFloat(v.price || '0');
          const compareAtPrice = v.compare_at_price ? parseFloat(v.compare_at_price) : null;
          const imageUrl = p.image?.src || p.images?.[0]?.src || null;

          try {
            const resUpdate = await this.prisma.product.updateMany({
              where: { shopifyId },
              data: {
                price,
                compareAtPrice,
                ...(imageUrl ? { imageUrl } : {}),
              },
            });
            updatedVariantsCount += resUpdate.count;
          } catch (e) {
            // Ignore individual variant update errors
          }
        }
      }

      this.logger.log(`[Shopify Sync] Catalog sync complete. Updated ${updatedVariantsCount} product variants in DB.`);
      return { success: true, updatedVariantsCount };
    } catch (err) {
      this.logger.error(`[Shopify Sync] Catalog sync failed: ${err}`);
      return { success: false, updatedVariantsCount: 0 };
    }
  }

  /**
   * Bulk adjust prices for a list of model names by discount percentage (0 = remove discount).
   */
  async bulkAdjustModelPrices(
    modelNames: string[],
    discountPercentage: number,
  ): Promise<{ success: boolean; updatedVariantsCount: number; updatedModelsCount: number; errors?: string[] }> {
    try {
      this.logger.log(
        `[Shopify Price Adjustment] Starting bulk price adjustment for ${modelNames.length} models with ${discountPercentage}% discount...`,
      );

      // 1. Fetch products from Shopify
      let nextUrl: string | null = 'products.json?limit=250';
      const allShopifyProducts: any[] = [];

      while (nextUrl) {
        const data: any = await this.shopifyFetch(nextUrl);
        const products = data.products || [];
        allShopifyProducts.push(...products);
        nextUrl = null; // Shopify REST API limit=250
      }

      const normModelNames = modelNames.map(m => m.trim().toLowerCase()).filter(Boolean);

      // Match products in Shopify
      const matchingProducts = allShopifyProducts.filter(p => {
        const titleLower = p.title.trim().toLowerCase();
        return normModelNames.some(m => titleLower.includes(m) || m.includes(titleLower));
      });

      let updatedVariantsCount = 0;
      let updatedModelsCount = 0;
      const errors: string[] = [];

      // Loop through matching products and update variants
      for (const p of matchingProducts) {
        let modelHasUpdates = false;

        for (const v of p.variants) {
          const rawCompareAt = parseFloat(v.compare_at_price || v.price || '0');
          if (rawCompareAt <= 0) continue;

          let newPriceVal: number;
          let compareAtStr: string;

          if (discountPercentage === 0) {
            // Remove discount: new price equals compareAtPrice
            newPriceVal = Math.round(rawCompareAt);
            compareAtStr = String(Math.round(rawCompareAt));
          } else {
            // Apply discount
            newPriceVal = Math.round(rawCompareAt * (1 - discountPercentage / 100));
            compareAtStr = String(Math.round(rawCompareAt));
          }

          const priceStr = String(newPriceVal);

          try {
            // Send PUT to Shopify REST Admin API
            await this.shopifyFetch(`variants/${v.id}.json`, {
              method: 'PUT',
              body: JSON.stringify({
                variant: {
                  id: v.id,
                  price: priceStr,
                  compare_at_price: compareAtStr,
                },
              }),
            });

            // Also update local PostgreSQL database
            const shopifyId = String(v.id);
            await this.prisma.product.updateMany({
              where: { shopifyId },
              data: {
                price: newPriceVal,
                compareAtPrice: parseFloat(compareAtStr),
              },
            });

            updatedVariantsCount++;
            modelHasUpdates = true;
          } catch (vErr: any) {
            this.logger.error(`Error updating variant ${v.id} (${p.title}): ${vErr.message}`);
            errors.push(`Variant ${v.id} (${p.title}): ${vErr.message}`);
          }
        }

        if (modelHasUpdates) {
          updatedModelsCount++;
        }
      }

      // Also handle models in PostgreSQL DB that might not be matched above
      const dbProducts = await this.prisma.product.findMany({
        where: {
          OR: normModelNames.map(m => ({
            name: { contains: m, mode: 'insensitive' },
          })),
        },
      });

      for (const dbP of dbProducts) {
        if (!dbP.shopifyId) continue;
        const compareAt = dbP.compareAtPrice || dbP.price || 0;
        if (compareAt <= 0) continue;

        let newPriceVal = discountPercentage === 0
          ? Math.round(compareAt)
          : Math.round(compareAt * (1 - discountPercentage / 100));

        try {
          await this.prisma.product.update({
            where: { id: dbP.id },
            data: {
              price: newPriceVal,
              compareAtPrice: compareAt,
            },
          });
        } catch (e) {}
      }

      this.logger.log(
        `[Shopify Price Adjustment] Complete. Updated ${updatedVariantsCount} variants across ${updatedModelsCount} models.`,
      );

      return {
        success: true,
        updatedVariantsCount,
        updatedModelsCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (err: any) {
      this.logger.error(`[Shopify Price Adjustment] Failed: ${err.message}`);
      return {
        success: false,
        updatedVariantsCount: 0,
        updatedModelsCount: 0,
        errors: [err.message],
      };
    }
  }

  /**
   * Test connection to Shopify.
   */
  async testConnection(): Promise<{ success: boolean; shop?: any; error?: string }> {
    try {
      const data = await this.shopifyFetch<any>('shop.json');
      return { success: true, shop: data.shop };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
