import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaleType } from '@prisma/client';
import { ShopifyService } from '../shopify/shopify.service';

const GOALS_MAP: Record<number, Record<number, { physical: number; online: number }>> = {
  2025: {
    3: { physical: 38, online: 4 },
    4: { physical: 70, online: 10 },
    5: { physical: 80, online: 20 },
    6: { physical: 80, online: 30 },
    7: { physical: 75, online: 35 },
    8: { physical: 70, online: 40 },
    9: { physical: 75, online: 45 },
    10: { physical: 90, online: 60 },
    11: { physical: 100, online: 70 },
    12: { physical: 130, online: 70 },
  },
  2026: {
    1: { physical: 50, online: 40 },
    2: { physical: 45, online: 45 },
    3: { physical: 100, online: 40 },
    4: { physical: 110, online: 50 },
    5: { physical: 45, online: 15 },
    6: { physical: 50, online: 20 },
    7: { physical: 45, online: 20 },
    8: { physical: 60, online: 30 },
    9: { physical: 60, online: 30 },
    10: { physical: 110, online: 60 },
    11: { physical: 125, online: 75 },
    12: { physical: 55, online: 35 },
  },
};

function isProductSockOrAccessory(name: string): boolean {
  const lower = name.toLowerCase();
  
  const hasAccessoryKeyword = 
    lower.includes('calcetín') ||
    lower.includes('calcetin') ||
    lower.includes('calcetines') ||
    lower.includes('socks') ||
    lower.includes('soquete') ||
    lower.includes('plantilla') ||
    lower.includes('insole');

  if (!hasAccessoryKeyword) return false;

  if (lower.includes('plantilla') || lower.includes('insole')) {
    const isShoeWithInclusions =
      lower.includes('incluye') ||
      lower.includes('extra') ||
      lower.includes('intercambiable') ||
      lower.includes('de pelo') ||
      lower.includes('de lana') ||
      lower.includes('de piel') ||
      lower.includes('bailarina') ||
      lower.includes('ballerinas') ||
      lower.includes('botín') ||
      lower.includes('blucher') ||
      lower.includes('zapato');
      
    if (isShoeWithInclusions) {
      return false; // It is a shoe, not an accessory!
    }
  }

  return true;
}

interface SaleItemDto {
  productId: string;
  quantity: number; // positive for sale, negative for return
  price: number;
  discount?: number;
}

interface CreateSaleDto {
  customerId?: string;
  type: SaleType;
  notes?: string;
  vendedor: string;
  channel: string;
  paymentMethod?: string;
  paymentBank?: string;
  items: SaleItemDto[];
}

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private prisma: PrismaService,
    private shopifyService: ShopifyService,
  ) {}

  private catalogCache = new Map<string, { timestamp: number; data: any }>();

  async getPOSCatalog(storeId: string) {
    const cached = this.catalogCache.get(storeId);
    if (cached && cached.data.length > 0 && Date.now() - cached.timestamp < 60_000) {
      return cached.data;
    }

    let inventoryItems: any[] = [];
    try {
      inventoryItems = await this.prisma.inventory.findMany({
        where: { 
          storeId,
          product: {
            status: 'active',
          },
        },
        select: {
          quantity: true,
          product: {
            select: {
              id: true,
              name: true,
              family: true,
              size: true,
              price: true,
              compareAtPrice: true,
              imageUrl: true,
              shopifyId: true,
            },
          },
        },
      });

      if (inventoryItems.length === 0) {
        inventoryItems = await this.prisma.inventory.findMany({
          where: { 
            product: {
              status: 'active',
            },
          },
          select: {
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
                family: true,
                size: true,
                price: true,
                compareAtPrice: true,
                imageUrl: true,
                shopifyId: true,
              },
            },
          },
        });
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch catalog with compareAtPrice (schema migration pending?), falling back: ${err}`);
      try {
        inventoryItems = await this.prisma.inventory.findMany({
          where: { 
            product: {
              status: 'active',
            },
          },
          select: {
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
                family: true,
                size: true,
                price: true,
                imageUrl: true,
                shopifyId: true,
              },
            },
          },
        });
      } catch (fallbackErr) {
        this.logger.error(`Critical error fetching catalog fallback: ${fallbackErr}`);
        return [];
      }
    }

    const grouped = new Map<
      string,
      {
        name: string;
        family: string | null;
        price: number;
        compareAtPrice: number | null;
        imageUrl: string | null;
        variants: { id: string; size: string; quantity: number; shopifyId: string; price?: number; compareAtPrice?: number | null }[];
      }
    >();

    for (const item of inventoryItems) {
      const p = item.product;
      if (!grouped.has(p.name)) {
        grouped.set(p.name, {
          name: p.name,
          family: p.family,
          price: p.price,
          compareAtPrice: p.compareAtPrice ?? null,
          imageUrl: p.imageUrl,
          variants: [],
        });
      } else if (p.compareAtPrice && !grouped.get(p.name)!.compareAtPrice) {
        grouped.get(p.name)!.compareAtPrice = p.compareAtPrice;
      }
      grouped.get(p.name)!.variants.push({
        id: p.id,
        size: p.size,
        quantity: item.quantity,
        shopifyId: p.shopifyId || '',
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
      });
    }

    // Sort variants by size ascending
    const result = Array.from(grouped.values());
    for (const item of result) {
      item.variants.sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }));
    }

    if (result.length > 0) {
      this.catalogCache.set(storeId, { timestamp: Date.now(), data: result });
    }
    return result;
  }

  async getCustomerSalesHistory(customerId: string) {
    return this.prisma.sale.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        store: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async getCustomerSalesHistoryByRut(rut: string) {
    // Normalization helper for RUT comparison
    const cleanRut = rut.replace(/[^0-9kK]/g, '').toLowerCase();

    // Find customer where rut matches (simple comparison after stripping non-alphanumeric)
    // We can do a findMany and filter locally or use Prisma contains/startsWith
    const customers = await this.prisma.customer.findMany();
    const customer = customers.find(c => {
      if (!c.rut) return false;
      return c.rut.replace(/[^0-9kK]/g, '').toLowerCase() === cleanRut;
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado en el CRM con ese RUT.');
    }

    return this.prisma.sale.findMany({
      where: { customerId: customer.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        store: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async getSaleDetails(saleId: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }

    return sale;
  }

  async searchCustomers(query: string) {
    if (!query) return [];
    const cleanQuery = query.toLowerCase().trim();
    const cleanRut = query.replace(/[^0-9kK]/g, '').toLowerCase();

    return this.prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: cleanQuery, mode: 'insensitive' } },
          { email: { contains: cleanQuery, mode: 'insensitive' } },
          cleanRut ? { rut: { contains: cleanRut } } : undefined,
        ].filter(Boolean) as any,
      },
      take: 10,
    });
  }

  async createCustomer(data: { name: string; rut?: string; email?: string; phone?: string }) {
    if (!data.name) {
      throw new BadRequestException('El nombre del cliente es obligatorio.');
    }
    
    let cleanRut: string | null = null;
    if (data.rut) {
      cleanRut = data.rut.replace(/[^0-9kK]/g, '').toLowerCase();
      // Check duplicate
      const existing = await this.prisma.customer.findUnique({
        where: { rut: cleanRut }
      });
      if (existing) {
        throw new BadRequestException('Ya existe un cliente registrado con ese RUT.');
      }
    }

    // 1. Create customer in Shopify
    let shopifyCustomerId: string | null = null;
    try {
      const shopifyCust = await this.shopifyService.createCustomer({
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        rut: cleanRut || data.rut,
      });
      if (shopifyCust && shopifyCust.id) {
        shopifyCustomerId = String(shopifyCust.id);
        this.logger.log(`Created customer in Shopify with ID: ${shopifyCustomerId}`);
      }
    } catch (err) {
      this.logger.warn(`Could not sync new customer to Shopify: ${err}`);
    }

    // 2. Create customer in DB
    return this.prisma.customer.create({
      data: {
        name: data.name,
        rut: cleanRut,
        email: data.email ? data.email.toLowerCase().trim() : null,
        phone: data.phone || null,
        shopifyId: shopifyCustomerId,
      }
    });
  }

  async deleteCustomer(id: string) {
    const existing = await this.prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('El cliente especificado no existe.');
    }

    // Disconnect sales from customer before deleting to prevent foreign key errors
    await this.prisma.sale.updateMany({
      where: { customerId: id },
      data: { customerId: null },
    });

    // Delete customer from local DB only (do not delete from Shopify)
    return this.prisma.customer.delete({
      where: { id },
    });
  }

  async getAllCustomers() {
    const customers = await this.prisma.customer.findMany({
      include: {
        sales: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return customers.map((c) => {
      let totalShoes = 0;
      const sizesSet = new Set<string>();
      let lastPurchaseDate: Date | null = null;

      for (const sale of c.sales) {
        if (!lastPurchaseDate || sale.date > lastPurchaseDate) {
          lastPurchaseDate = sale.date;
        }
        for (const item of sale.items) {
          if (item.quantity > 0) {
            const nameLower = (item.product?.name || '').toLowerCase();
            const isSock = isProductSockOrAccessory(nameLower);
            
            if (!isSock) {
              totalShoes += item.quantity;
            }

            if (item.product?.size && item.product.size !== 'UN') {
              sizesSet.add(item.product.size);
            }
          }
        }
      }

      const sortedSizes = Array.from(sizesSet).sort((a, b) => parseFloat(a) - parseFloat(b));
      const tallasDisplay = sortedSizes.join(', ') || '-';

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        rut: c.rut,
        shopifyId: c.shopifyId,
        zapatosComprados: totalShoes,
        tallasCompradas: tallasDisplay,
        fechaUltimaCompra: lastPurchaseDate ? lastPurchaseDate.toISOString() : null,
      };
    });
  }

  async updateCustomer(id: string, data: { name?: string; rut?: string; email?: string; phone?: string }) {
    let cleanRut: string | null | undefined = undefined;
    if (data.rut !== undefined) {
      cleanRut = data.rut ? data.rut.replace(/[^0-9kK]/g, '').toLowerCase() : null;
      if (cleanRut) {
        const existing = await this.prisma.customer.findFirst({
          where: { rut: cleanRut, id: { not: id } }
        });
        if (existing) {
          throw new BadRequestException('Ya existe otro cliente registrado con este RUT.');
        }
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        rut: cleanRut,
        email: data.email !== undefined ? (data.email ? data.email.toLowerCase().trim() : null) : undefined,
        phone: data.phone !== undefined ? (data.phone || null) : undefined,
      }
    });
  }

  async createSale(userId: string, storeId: string, data: CreateSaleDto) {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('La venta debe contener al menos un producto.');
    }

    // 1. Validate and fetch all products/inventories in the transaction
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('La tienda especificada no existe.');
    }

    const shopifyAdjustments: { shopifyVariantId: string; quantity: number }[] = [];

    // Start Transaction
    const sale = await this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const saleItemsToCreate = [];

      for (const item of data.items) {
        // Fetch current inventory
        const inv = await tx.inventory.findUnique({
          where: {
            storeId_productId: {
              storeId,
              productId: item.productId,
            },
          },
          include: {
            product: true,
          },
        });

        if (!inv) {
          throw new BadRequestException(`El producto con ID ${item.productId} no está disponible en esta tienda.`);
        }

        // For sales (positive quantity), check stock
        if (item.quantity > 0 && inv.quantity < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${inv.product.name} (Talla ${inv.product.size}). Disponibles: ${inv.quantity}, Solicitados: ${item.quantity}`,
          );
        }

        // Deduct inventory
        await tx.inventory.update({
          where: {
            storeId_productId: {
              storeId,
              productId: item.productId,
            },
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

        // Accumulate total
        const itemDiscount = item.discount || 0;
        const itemTotal = (item.price - itemDiscount) * item.quantity;
        totalAmount += itemTotal;

        saleItemsToCreate.push({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          discount: itemDiscount,
        });

        // Queue Shopify adjustment
        if (inv.product.shopifyId && !inv.product.shopifyId.startsWith('temp_')) {
          shopifyAdjustments.push({
            shopifyVariantId: inv.product.shopifyId,
            quantity: item.quantity,
          });
        }
      }

      // Save Sale
      return tx.sale.create({
        data: {
          storeId,
          userId,
          customerId: data.customerId || null,
          type: data.type,
          total: totalAmount,
          notes: data.notes,
          vendedor: data.vendedor,
          channel: data.channel,
          paymentMethod: data.paymentMethod,
          paymentBank: data.paymentBank,
          items: {
            create: saleItemsToCreate,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    // AFTER successful transaction commit, perform Shopify sync asynchronously
    const syncResults: { variantId: string; success: boolean; error?: string }[] = [];
    for (const adj of shopifyAdjustments) {
      try {
        this.logger.log(`[Shopify Sync] Syncing stock adjustment to Shopify for Variant ID ${adj.shopifyVariantId}...`);
        
        // 1. Fetch variant to get inventory_item_id
        const variantRes = await this.shopifyService.shopifyFetch(`variants/${adj.shopifyVariantId}.json`);
        const inventoryItemId = variantRes?.variant?.inventory_item_id;
        
        if (inventoryItemId) {
          const locationId = '69212209257'; // Shopify Location ID for Pausa Pasteur
          
          // 2. Adjust inventory in Shopify (note: positive local sale decreases shopify inventory, so we pass -quantity)
          await this.shopifyService.adjustInventory(
            inventoryItemId.toString(),
            locationId,
            -adj.quantity,
          );
          this.logger.log(`[Shopify Sync] Shopify stock adjustment SUCCESS: variant=${adj.shopifyVariantId}, delta=${-adj.quantity}`);
          syncResults.push({ variantId: adj.shopifyVariantId, success: true });
        } else {
          this.logger.warn(`[Shopify Sync] Could not find inventory_item_id for Shopify Variant ${adj.shopifyVariantId}`);
          syncResults.push({ variantId: adj.shopifyVariantId, success: false, error: 'No se encontró inventory_item_id para la variante.' });
        }
      } catch (e: any) {
        this.logger.error(`[Shopify Sync] Failed to adjust stock in Shopify for variant ${adj.shopifyVariantId}: ${e.message}`);
        syncResults.push({ variantId: adj.shopifyVariantId, success: false, error: e.message });
      }
    }

    this.catalogCache.delete(storeId);

    return {
      ...sale,
      shopifySync: {
        success: syncResults.length === 0 || syncResults.every(r => r.success),
        results: syncResults,
      }
    };
  }

  async getSalesReport(storeId: string, year: number, month?: number) {
    // 1. Determine period date range
    let startDate: Date;
    let endDate: Date;

    if (month && month >= 1 && month <= 12) {
      startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(year, 0, 1, 0, 0, 0, 0);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    }

    // 2. Fetch sales in period
    const sales = await this.prisma.sale.findMany({
      where: {
        storeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    const isSock = (name: string) => isProductSockOrAccessory(name);

    // 3. Map to report items
    const items = [];
    let currentMonthAmount = 0;
    let currentMonthShoesUnits = 0;

    // Track seller contribution for the selected period
    const sellerUnitsMap = new Map<string, number>();
    const sellerRevenueMap = new Map<string, number>();

    for (const sale of sales) {
      const hasPositive = sale.items.some(it => it.quantity > 0);
      const hasNegative = sale.items.some(it => it.quantity < 0);
      const isExchange = hasPositive && hasNegative;

      const isGiftSale = sale.notes?.toLowerCase().includes('regalo');

      for (const item of sale.items) {
        const isProductSock = isSock(item.product?.name || '');
        const prodCompareAt = item.product?.compareAtPrice || 0;
        let originalPrice = item.price;
        let discountVal = item.discount || 0;

        if (prodCompareAt > item.price && discountVal === 0) {
          originalPrice = prodCompareAt;
          discountVal = Math.round(((prodCompareAt - item.price) / prodCompareAt) * 100);
        }
        
        // If discountVal is <= 100, treat it as a percentage!
        const isPercent = discountVal > 0 && discountVal <= 100;
        const discountAmount = isPercent 
          ? Math.round(originalPrice * (discountVal / 100))
          : discountVal;
          
        const salePrice = originalPrice - discountAmount;

        // Determine event type
        let eventType = 'Venta';
        const normVendedor = (sale.vendedor || '').toLowerCase();
        if (normVendedor === 'cambio entra') {
          eventType = 'Cambio Entra';
        } else if (normVendedor === 'cambio sale') {
          eventType = 'Cambio Sale';
        } else if (normVendedor === 'regalo') {
          eventType = 'Regalo';
        } else if (item.quantity < 0) {
          eventType = isExchange ? 'Cambio Entra' : 'Devolución';
        } else {
          if (isExchange) {
            eventType = 'Cambio Sale';
          } else if (isGiftSale || salePrice === 0 || discountVal === 100) {
            eventType = 'Regalo';
          }
        }

        // Calculate amount and units
        const itemNetPrice = salePrice * item.quantity;
        currentMonthAmount += itemNetPrice;

        const seller = sale.vendedor || 'ONLINE';
        sellerRevenueMap.set(seller, (sellerRevenueMap.get(seller) || 0) + itemNetPrice);

        if (!isProductSock && eventType === 'Venta') {
          currentMonthShoesUnits += item.quantity;
          sellerUnitsMap.set(seller, (sellerUnitsMap.get(seller) || 0) + item.quantity);
        }

        items.push({
          id: item.id,
          saleId: sale.id,
          date: sale.date,
          event: eventType,
          model: item.product ? `${item.product.name}${item.product.color ? ` - ${item.product.color}` : ''}` : 'Producto',
          size: item.product?.size || 'UN',
          originalPrice,
          salePrice,
          discount: discountAmount * item.quantity,
          vendedor: sale.vendedor || 'ONLINE',
          isSock: isProductSock,
          quantity: item.quantity,
        });
      }
    }

    // 4. Calculate comparisons
    let prevMonthAmount = 0;
    let prevMonthShoesUnits = 0;
    let prevYearSameMonthAmount = 0;
    let prevYearSameMonthShoesUnits = 0;

    if (month && month >= 1 && month <= 12) {
      // Prior month
      let pmMonth = month - 1;
      let pmYear = year;
      if (pmMonth === 0) {
        pmMonth = 12;
        pmYear = year - 1;
      }
      const pmStart = new Date(pmYear, pmMonth - 1, 1, 0, 0, 0, 0);
      const pmEnd = new Date(pmYear, pmMonth, 0, 23, 59, 59, 999);

      const pmSales = await this.prisma.sale.findMany({
        where: {
          storeId,
          date: { gte: pmStart, lte: pmEnd },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      for (const sale of pmSales) {
        const hasPositive = sale.items.some(it => it.quantity > 0);
        const hasNegative = sale.items.some(it => it.quantity < 0);
        const isExchange = hasPositive && hasNegative;
        const isGiftSale = sale.notes?.toLowerCase().includes('regalo');

        for (const item of sale.items) {
          const isProductSock = isSock(item.product?.name || '');
          const prodCompareAt = item.product?.compareAtPrice || 0;
          let originalPrice = item.price;
          let discountVal = item.discount || 0;

          if (prodCompareAt > item.price && discountVal === 0) {
            originalPrice = prodCompareAt;
            discountVal = Math.round(((prodCompareAt - item.price) / prodCompareAt) * 100);
          }
          const isPercent = discountVal > 0 && discountVal <= 100;
          const discountAmount = isPercent 
            ? Math.round(originalPrice * (discountVal / 100))
            : discountVal;
          const salePrice = originalPrice - discountAmount;

          prevMonthAmount += salePrice * item.quantity;

          const isGift = isGiftSale || salePrice === 0 || discountVal === 100;
          const normVendedor = (sale.vendedor || '').toLowerCase();
          
          let eventType = 'Venta';
          if (normVendedor === 'cambio entra') {
            eventType = 'Cambio Entra';
          } else if (normVendedor === 'cambio sale') {
            eventType = 'Cambio Sale';
          } else if (normVendedor === 'regalo') {
            eventType = 'Regalo';
          } else if (item.quantity < 0) {
            eventType = isExchange ? 'Cambio Entra' : 'Devolución';
          } else {
            if (isExchange) {
              eventType = 'Cambio Sale';
            } else if (isGift) {
              eventType = 'Regalo';
            }
          }

          if (!isProductSock && eventType === 'Venta') {
            prevMonthShoesUnits += item.quantity;
          }
        }
      }

      // Prior year same month
      const pyStart = new Date(year - 1, month - 1, 1, 0, 0, 0, 0);
      const pyEnd = new Date(year - 1, month, 0, 23, 59, 59, 999);

      const pySales = await this.prisma.sale.findMany({
        where: {
          storeId,
          date: { gte: pyStart, lte: pyEnd },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      for (const sale of pySales) {
        const hasPositive = sale.items.some(it => it.quantity > 0);
        const hasNegative = sale.items.some(it => it.quantity < 0);
        const isExchange = hasPositive && hasNegative;
        const isGiftSale = sale.notes?.toLowerCase().includes('regalo');

        for (const item of sale.items) {
          const isProductSock = isSock(item.product?.name || '');
          const prodCompareAt = item.product?.compareAtPrice || 0;
          let originalPrice = item.price;
          let discountVal = item.discount || 0;

          if (prodCompareAt > item.price && discountVal === 0) {
            originalPrice = prodCompareAt;
            discountVal = Math.round(((prodCompareAt - item.price) / prodCompareAt) * 100);
          }
          const isPercent = discountVal > 0 && discountVal <= 100;
          const discountAmount = isPercent 
            ? Math.round(originalPrice * (discountVal / 100))
            : discountVal;
          const salePrice = originalPrice - discountAmount;

          prevYearSameMonthAmount += salePrice * item.quantity;

          const isGift = isGiftSale || salePrice === 0 || discountVal === 100;
          const normVendedor = (sale.vendedor || '').toLowerCase();
          
          let eventType = 'Venta';
          if (normVendedor === 'cambio entra') {
            eventType = 'Cambio Entra';
          } else if (normVendedor === 'cambio sale') {
            eventType = 'Cambio Sale';
          } else if (normVendedor === 'regalo') {
            eventType = 'Regalo';
          } else if (item.quantity < 0) {
            eventType = isExchange ? 'Cambio Entra' : 'Devolución';
          } else {
            if (isExchange) {
              eventType = 'Cambio Sale';
            } else if (isGift) {
              eventType = 'Regalo';
            }
          }

          if (!isProductSock && eventType === 'Venta') {
            prevYearSameMonthShoesUnits += item.quantity;
          }
        }
      }
    } else {
      // Prior full year (since "All" months is selected)
      const pyStart = new Date(year - 1, 0, 1, 0, 0, 0, 0);
      const pyEnd = new Date(year - 1, 11, 31, 23, 59, 59, 999);

      const pySales = await this.prisma.sale.findMany({
        where: {
          storeId,
          date: { gte: pyStart, lte: pyEnd },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      for (const sale of pySales) {
        const hasPositive = sale.items.some(it => it.quantity > 0);
        const hasNegative = sale.items.some(it => it.quantity < 0);
        const isExchange = hasPositive && hasNegative;
        const isGiftSale = sale.notes?.toLowerCase().includes('regalo');

        for (const item of sale.items) {
          const isProductSock = isSock(item.product?.name || '');
          const prodCompareAt = item.product?.compareAtPrice || 0;
          let originalPrice = item.price;
          let discountVal = item.discount || 0;

          if (prodCompareAt > item.price && discountVal === 0) {
            originalPrice = prodCompareAt;
            discountVal = Math.round(((prodCompareAt - item.price) / prodCompareAt) * 100);
          }
          const isPercent = discountVal > 0 && discountVal <= 100;
          const discountAmount = isPercent 
            ? Math.round(originalPrice * (discountVal / 100))
            : discountVal;
          const salePrice = originalPrice - discountAmount;

          prevYearSameMonthAmount += salePrice * item.quantity;

          const isGift = isGiftSale || salePrice === 0 || discountVal === 100;
          const normVendedor = (sale.vendedor || '').toLowerCase();
          
          let eventType = 'Venta';
          if (normVendedor === 'cambio entra') {
            eventType = 'Cambio Entra';
          } else if (normVendedor === 'cambio sale') {
            eventType = 'Cambio Sale';
          } else if (normVendedor === 'regalo') {
            eventType = 'Regalo';
          } else if (item.quantity < 0) {
            eventType = isExchange ? 'Cambio Entra' : 'Devolución';
          } else {
            if (isExchange) {
              eventType = 'Cambio Sale';
            } else if (isGift) {
              eventType = 'Regalo';
            }
          }

          if (!isProductSock && eventType === 'Venta') {
            prevYearSameMonthShoesUnits += item.quantity;
          }
        }
      }
    }

    // Helper for safe percentage calculation
    const calcDiffPercent = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return parseFloat((((curr - prev) / prev) * 100).toFixed(1));
    };

    // 5. Goals setup (group goal)
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    const isOnlineStore = store?.name.toLowerCase().includes('online') || store?.name.toLowerCase().includes('web');
    
    const yearGoals = GOALS_MAP[year];
    const monthGoal = yearGoals ? yearGoals[month || new Date().getMonth() + 1] : null;
    
    const physicalTarget = monthGoal ? monthGoal.physical : 50;
    const onlineTarget = monthGoal ? monthGoal.online : 30;
    const targetUnits = isOnlineStore ? onlineTarget : physicalTarget;

    // Build seller breakdown array
    const breakdownBySeller = [];
    const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1'];
    let colorIdx = 0;
    
    // Sort sellers by sales descending
    const sortedSellers = Array.from(sellerUnitsMap.entries()).sort((a, b) => b[1] - a[1]);
    const totalSellerUnits = sortedSellers.reduce((sum, item) => sum + item[1], 0);

    for (const [sellerName, units] of sortedSellers) {
      const percentageOfTotal = totalSellerUnits > 0 ? parseFloat(((units / totalSellerUnits) * 100).toFixed(1)) : 0;
      const revenue = sellerRevenueMap.get(sellerName) || 0;
      breakdownBySeller.push({
        sellerName,
        units,
        revenue,
        percentageOfTotal,
        color: colors[colorIdx % colors.length],
      });
      colorIdx++;
    }

    return {
      items,
      summary: {
        totalAmount: currentMonthAmount,
        totalUnits: currentMonthShoesUnits,
      },
      goals: {
        targetUnits,
        physicalTarget,
        onlineTarget,
        soldUnits: currentMonthShoesUnits,
        breakdownBySeller,
      },
      comparisons: {
        prevMonth: {
          totalAmount: prevMonthAmount,
          totalUnits: prevMonthShoesUnits,
          amountDiffPercent: calcDiffPercent(currentMonthAmount, prevMonthAmount),
          unitsDiffPercent: calcDiffPercent(currentMonthShoesUnits, prevMonthShoesUnits),
        },
        prevYearMonth: {
          totalAmount: prevYearSameMonthAmount,
          totalUnits: prevYearSameMonthShoesUnits,
          amountDiffPercent: calcDiffPercent(currentMonthAmount, prevYearSameMonthAmount),
          unitsDiffPercent: calcDiffPercent(currentMonthShoesUnits, prevYearSameMonthShoesUnits),
        },
      },
    };
  }

  async getAnalyticsReport(
    storeId: string,
    fromYear: number,
    fromMonth: number,
    toYear: number,
    toMonth: number,
  ) {
    const isSock = (name: string) => isProductSockOrAccessory(name);

    // Normalize range start and end dates
    const startDate = new Date(fromYear, fromMonth - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(toYear, toMonth, 0, 23, 59, 59, 999);

    // Fetch all sales in date range for this store
    const sales = await this.prisma.sale.findMany({
      where: {
        storeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        date: true,
        vendedor: true,
        channel: true,
        notes: true,
        items: {
          select: {
            price: true,
            discount: true,
            quantity: true,
            product: {
              select: {
                name: true,
                compareAtPrice: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Build list of months in period
    const monthsList: { year: number; month: number }[] = [];
    let curY = fromYear;
    let curM = fromMonth;

    while (curY < toYear || (curY === toYear && curM <= toMonth)) {
      monthsList.push({ year: curY, month: curM });
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }

    const monthLabelsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthLabelsFull = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    let grandTotalAmount = 0;
    let grandOnlineAmount = 0;
    let grandPhysicalAmount = 0;
    let grandTotalUnits = 0;
    let grandOnlineUnits = 0;
    let grandPhysicalUnits = 0;

    const monthlyData = monthsList.map(({ year, month }) => {
      const mStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const mEnd = new Date(year, month, 0, 23, 59, 59, 999);

      const mSales = sales.filter(s => s.date >= mStart && s.date <= mEnd);

      let mTotalAmount = 0;
      let mOnlineAmount = 0;
      let mPhysicalAmount = 0;
      let mTotalUnits = 0;
      let mOnlineUnits = 0;
      let mPhysicalUnits = 0;

      for (const sale of mSales) {
        const hasPositive = sale.items.some(it => it.quantity > 0);
        const hasNegative = sale.items.some(it => it.quantity < 0);
        const isExchange = hasPositive && hasNegative;
        const isGiftSale = sale.notes?.toLowerCase().includes('regalo');
        const isOnlineSale = 
          (sale.vendedor || '').toUpperCase().includes('ONLINE') ||
          (sale.channel || '').toUpperCase().includes('ONLINE') ||
          (sale.channel || '').toUpperCase().includes('WEB');

        for (const item of sale.items) {
          const isProductSock = isSock(item.product?.name || '');
          const prodCompareAt = item.product?.compareAtPrice || 0;
          const rawPrice = typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0;
          let discountVal = typeof item.discount === 'number' && !isNaN(item.discount) ? item.discount : 0;
          const qty = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 1;
          let originalPrice = rawPrice;

          if (prodCompareAt > rawPrice && discountVal === 0) {
            originalPrice = prodCompareAt;
            discountVal = Math.round(((prodCompareAt - rawPrice) / prodCompareAt) * 100);
          }
          const isPercent = discountVal > 0 && discountVal <= 100;
          const discountAmount = isPercent 
            ? Math.round(originalPrice * (discountVal / 100))
            : discountVal;
          const salePrice = Math.max(0, originalPrice - discountAmount);
          const itemNetPrice = isNaN(salePrice * qty) ? 0 : Math.round(salePrice * qty);

          let eventType = 'Venta';
          const normVendedor = (sale.vendedor || '').toLowerCase();
          if (normVendedor === 'cambio entra') {
            eventType = 'Cambio Entra';
          } else if (normVendedor === 'cambio sale') {
            eventType = 'Cambio Sale';
          } else if (normVendedor === 'regalo') {
            eventType = 'Regalo';
          } else if (qty < 0) {
            eventType = isExchange ? 'Cambio Entra' : 'Devolución';
          } else {
            if (isExchange) {
              eventType = 'Cambio Sale';
            } else if (isGiftSale || salePrice === 0 || discountVal === 100) {
              eventType = 'Regalo';
            }
          }

          mTotalAmount += itemNetPrice;
          if (isOnlineSale) {
            mOnlineAmount += itemNetPrice;
          } else {
            mPhysicalAmount += itemNetPrice;
          }

          if (!isProductSock && eventType === 'Venta') {
            mTotalUnits += qty;
            if (isOnlineSale) {
              mOnlineUnits += qty;
            } else {
              mPhysicalUnits += qty;
            }
          }
        }
      }

      grandTotalAmount += mTotalAmount;
      grandOnlineAmount += mOnlineAmount;
      grandPhysicalAmount += mPhysicalAmount;
      grandTotalUnits += mTotalUnits;
      grandOnlineUnits += mOnlineUnits;
      grandPhysicalUnits += mPhysicalUnits;

      const yearGoals = GOALS_MAP[year];
      const monthGoal = yearGoals ? yearGoals[month] : null;

      return {
        year,
        month,
        monthLabel: `${monthLabelsShort[month - 1]} ${year.toString().slice(-2)}`,
        fullMonthLabel: `${monthLabelsFull[month - 1]} ${year}`,
        totalAmount: mTotalAmount,
        onlineAmount: mOnlineAmount,
        physicalAmount: mPhysicalAmount,
        totalUnits: mTotalUnits,
        onlineUnits: mOnlineUnits,
        physicalUnits: mPhysicalUnits,
        physicalTarget: monthGoal ? monthGoal.physical : 50,
        onlineTarget: monthGoal ? monthGoal.online : 30,
      };
    });

    const averageMonthlyAmount = monthlyData.length > 0 
      ? Math.round(grandTotalAmount / monthlyData.length) 
      : 0;

    return {
      period: {
        fromYear,
        fromMonth,
        toYear,
        toMonth,
        totalMonths: monthlyData.length,
      },
      summary: {
        totalAmount: grandTotalAmount,
        onlineAmount: grandOnlineAmount,
        physicalAmount: grandPhysicalAmount,
        totalUnits: grandTotalUnits,
        onlineUnits: grandOnlineUnits,
        physicalUnits: grandPhysicalUnits,
        averageMonthlyAmount,
      },
      monthlyData,
    };
  }

  async getStyleReport(
    storeId: string,
    fromYear?: number,
    fromMonth?: number,
    toYear?: number,
    toMonth?: number,
  ) {
    let dateFilter: any = {};
    if (fromYear && fromMonth && toYear && toMonth) {
      const startDate = new Date(fromYear, fromMonth - 1, 1, 0, 0, 0, 0);
      const endDate = new Date(toYear, toMonth, 0, 23, 59, 59, 999);
      dateFilter = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    const sales = await this.prisma.sale.findMany({
      where: {
        storeId,
        ...dateFilter,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    const isSockOrAcc = (name: string) =>
      name.toLowerCase().includes('calcetin') ||
      name.toLowerCase().includes('plantilla');

    const CLOSED_STYLES = ['Blucher', 'Botín', 'Botin', 'Running'];

    const styleMap = new Map<
      string,
      {
        style: string;
        totalUnits: number;
        totalRevenue: number;
        sizes: Record<string, number>;
        modelsMap: Map<string, { model: string; units: number; revenue: number }>;
      }
    >();

    let grandUnits = 0;
    let grandRevenue = 0;
    let openUnits = 0;
    let openRevenue = 0;
    let closedUnits = 0;
    let closedRevenue = 0;

    for (const sale of sales) {
      const hasPositive = sale.items.some((it) => it.quantity > 0);
      const hasNegative = sale.items.some((it) => it.quantity < 0);
      const isExchange = hasPositive && hasNegative;
      const isGiftSale = sale.notes?.toLowerCase().includes('regalo');
      const normVendedor = (sale.vendedor || '').toLowerCase();

      for (const item of sale.items) {
        if (!item.product || item.quantity <= 0) continue;
        if (isProductSockOrAccessory(item.product.name || '')) continue;

        const prodCompareAt = item.product?.compareAtPrice || 0;
        let originalPrice = item.price;
        let discountVal = item.discount || 0;

        if (prodCompareAt > item.price && discountVal === 0) {
          originalPrice = prodCompareAt;
          discountVal = Math.round(((prodCompareAt - item.price) / prodCompareAt) * 100);
        }
        const isPercent = discountVal > 0 && discountVal <= 100;
        const discountAmount = isPercent
          ? Math.round(originalPrice * (discountVal / 100))
          : discountVal;
        const salePrice = originalPrice - discountAmount;

        let eventType = 'Venta';
        if (normVendedor === 'cambio entra') {
          eventType = 'Cambio Entra';
        } else if (normVendedor === 'cambio sale') {
          eventType = 'Cambio Sale';
        } else if (normVendedor === 'regalo') {
          eventType = 'Regalo';
        } else if (item.quantity < 0) {
          eventType = isExchange ? 'Cambio Entra' : 'Devolución';
        } else {
          if (isExchange) {
            eventType = 'Cambio Sale';
          } else if (isGiftSale || salePrice === 0 || discountVal === 100) {
            eventType = 'Regalo';
          }
        }

        if (eventType !== 'Venta') continue;

        const styleName = item.product.style || item.product.family || 'Calzado General';
        const size = item.product.size || 'UN';
        const modelName = item.product.name.split('(')[0].trim();
        const itemNet = (item.price - (item.discount || 0)) * item.quantity;

        grandUnits += item.quantity;
        grandRevenue += itemNet;

        if (CLOSED_STYLES.includes(styleName)) {
          closedUnits += item.quantity;
          closedRevenue += itemNet;
        } else {
          openUnits += item.quantity;
          openRevenue += itemNet;
        }

        if (!styleMap.has(styleName)) {
          styleMap.set(styleName, {
            style: styleName,
            totalUnits: 0,
            totalRevenue: 0,
            sizes: {},
            modelsMap: new Map(),
          });
        }

        const entry = styleMap.get(styleName)!;
        entry.totalUnits += item.quantity;
        entry.totalRevenue += itemNet;
        entry.sizes[size] = (entry.sizes[size] || 0) + item.quantity;

        if (!entry.modelsMap.has(modelName)) {
          entry.modelsMap.set(modelName, { model: modelName, units: 0, revenue: 0 });
        }
        const mEntry = entry.modelsMap.get(modelName)!;
        mEntry.units += item.quantity;
        mEntry.revenue += itemNet;
      }
    }

    const stylesResult = Array.from(styleMap.values())
      .map((s) => {
        const allSizes = ['35', '36', '37', '38', '39', '40', '41', '42'];
        const sizePercentages: Record<string, number> = {};
        allSizes.forEach((sz) => {
          const qty = s.sizes[sz] || 0;
          sizePercentages[sz] = s.totalUnits > 0 ? Math.round((qty / s.totalUnits) * 100) : 0;
        });

        const topModels = Array.from(s.modelsMap.values())
          .sort((a, b) => b.units - a.units)
          .slice(0, 5);

        return {
          style: s.style,
          totalUnits: s.totalUnits,
          totalRevenue: s.totalRevenue,
          shareOfUnitsPct: grandUnits > 0 ? Math.round((s.totalUnits / grandUnits) * 100) : 0,
          shareOfRevenuePct: grandRevenue > 0 ? Math.round((s.totalRevenue / grandRevenue) * 100) : 0,
          sizes: s.sizes,
          sizePercentages,
          topModels,
        };
      })
      .sort((a, b) => b.totalUnits - a.totalUnits);

    return {
      summary: {
        totalUnits: grandUnits,
        totalRevenue: grandRevenue,
        openUnits,
        openRevenue,
        openUnitsPct: grandUnits > 0 ? Math.round((openUnits / grandUnits) * 100) : 0,
        closedUnits,
        closedRevenue,
        closedUnitsPct: grandUnits > 0 ? Math.round((closedUnits / grandUnits) * 100) : 0,
      },
      styles: stylesResult,
    };
  }

  async getInventoryReport(storeId: string) {
    const inventory = await this.prisma.inventory.findMany({
      where: {
        storeId,
        product: {
          status: {
            equals: 'active',
            mode: 'insensitive',
          },
        },
      },
      include: {
        product: true,
      },
    });

    let grandTotalStock = 0;
    let shoeTotalStock = 0;
    let accTotalStock = 0;

    const styleMap = new Map<
      string,
      {
        style: string;
        sizes: Record<string, number>;
        total: number;
        modelsSet: Set<string>;
        price: number;
        compareAtPrice: number | null;
      }
    >();

    const modelMap = new Map<
      string,
      {
        model: string;
        style: string;
        sizes: Record<string, number>;
        total: number;
        price: number;
        compareAtPrice: number | null;
      }
    >();

    for (const inv of inventory) {
      if (inv.quantity <= 0) continue;

      const isAcc = isProductSockOrAccessory(inv.product.name);
      grandTotalStock += inv.quantity;

      if (isAcc) {
        accTotalStock += inv.quantity;
      } else {
        shoeTotalStock += inv.quantity;
      }

      const styleName = inv.product.style || inv.product.family || 'Calzado General';
      const modelName = inv.product.name.split('(')[0].trim();
      const size = inv.product.size || 'UN';
      const prodPrice = inv.product.price || 0;
      const prodComparePrice = inv.product.compareAtPrice || null;

      // Group by Style
      if (!styleMap.has(styleName)) {
        styleMap.set(styleName, {
          style: styleName,
          sizes: {},
          total: 0,
          modelsSet: new Set(),
          price: prodPrice,
          compareAtPrice: prodComparePrice,
        });
      }
      const sEntry = styleMap.get(styleName)!;
      sEntry.total += inv.quantity;
      sEntry.sizes[size] = (sEntry.sizes[size] || 0) + inv.quantity;
      sEntry.modelsSet.add(modelName);
      if (prodComparePrice && (!sEntry.compareAtPrice || prodComparePrice > sEntry.compareAtPrice)) {
        sEntry.compareAtPrice = prodComparePrice;
      }
      if (prodPrice && (!sEntry.price || prodPrice < sEntry.price)) {
        sEntry.price = prodPrice;
      }

      // Group by Model
      if (!modelMap.has(modelName)) {
        modelMap.set(modelName, {
          model: modelName,
          style: styleName,
          sizes: {},
          total: 0,
          price: prodPrice,
          compareAtPrice: prodComparePrice,
        });
      }
      const mEntry = modelMap.get(modelName)!;
      mEntry.total += inv.quantity;
      mEntry.sizes[size] = (mEntry.sizes[size] || 0) + inv.quantity;
      if (prodComparePrice && (!mEntry.compareAtPrice || prodComparePrice > mEntry.compareAtPrice)) {
        mEntry.compareAtPrice = prodComparePrice;
      }
      if (prodPrice && (!mEntry.price || prodPrice < mEntry.price)) {
        mEntry.price = prodPrice;
      }
    }

    const byStyle = Array.from(styleMap.values())
      .map((s) => {
        const originalPrice = (s.compareAtPrice && s.compareAtPrice > s.price) ? s.compareAtPrice : s.price;
        const currentPrice = s.price;
        const discount = originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
        return {
          style: s.style,
          total: s.total,
          sizes: s.sizes,
          modelCount: s.modelsSet.size,
          price: currentPrice,
          compareAtPrice: s.compareAtPrice,
          originalPrice,
          currentPrice,
          discount,
        };
      })
      .sort((a, b) => b.total - a.total);

    const byModel = Array.from(modelMap.values())
      .map((m) => {
        const originalPrice = (m.compareAtPrice && m.compareAtPrice > m.price) ? m.compareAtPrice : m.price;
        const currentPrice = m.price;
        const discount = originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
        return {
          model: m.model,
          style: m.style,
          total: m.total,
          sizes: m.sizes,
          price: currentPrice,
          compareAtPrice: m.compareAtPrice,
          originalPrice,
          currentPrice,
          discount,
        };
      })
      .sort((a, b) => b.total - a.total);

    return {
      summary: {
        totalStock: grandTotalStock,
        shoeStock: shoeTotalStock,
        accStock: accTotalStock,
        totalModels: modelMap.size,
        totalStyles: styleMap.size,
      },
      byStyle,
      byModel,
    };
  }

  async updateSale(
    id: string,
    userId: string,
    updateData: {
      date?: string;
      vendedor?: string;
      channel?: string;
      paymentMethod?: string;
      paymentBank?: string;
      notes?: string;
      customerId?: string | null;
      items?: Array<{
        id?: string;
        price: number;
        discount: number;
        quantity: number;
      }>;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const existingSale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        user: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!existingSale) {
      throw new NotFoundException('Venta no encontrada');
    }

    // Role check: CLERK can ONLY edit their own sales
    if (user && user.role === 'CLERK') {
      const isOwner =
        existingSale.userId === user.id ||
        (existingSale.vendedor && user.name && existingSale.vendedor.toLowerCase() === user.name.toLowerCase());
      if (!isOwner) {
        throw new ForbiddenException('Solo puedes editar las transacciones creadas por tu propio usuario');
      }
    }

    const dateVal = updateData.date ? new Date(updateData.date) : existingSale.date;
    const vendedorVal = updateData.vendedor !== undefined ? updateData.vendedor : existingSale.vendedor;
    const channelVal = updateData.channel !== undefined ? updateData.channel : existingSale.channel;
    const paymentMethodVal = updateData.paymentMethod !== undefined ? updateData.paymentMethod : existingSale.paymentMethod;
    const paymentBankVal = updateData.paymentBank !== undefined ? updateData.paymentBank : existingSale.paymentBank;
    const notesVal = updateData.notes !== undefined ? updateData.notes : existingSale.notes;
    const customerIdVal = updateData.customerId !== undefined ? updateData.customerId : existingSale.customerId;

    let newTotal = existingSale.total;

    if (updateData.items && updateData.items.length > 0) {
      newTotal = 0;
      for (const item of updateData.items) {
        const isPercent = item.discount > 0 && item.discount <= 100;
        const discountVal = isPercent
          ? Math.round(item.price * (item.discount / 100))
          : (item.discount || 0);
        const finalUnitPrice = item.price - discountVal;
        newTotal += finalUnitPrice * item.quantity;

        if (item.id) {
          const existingItem = existingSale.items.find((i) => i.id === item.id);
          if (existingItem) {
            const oldQty = existingItem.quantity;
            const newQty = item.quantity;
            const diff = newQty - oldQty; // e.g. +1 if quantity increased, -1 if decreased

            if (diff !== 0 && existingItem.productId) {
              // Update local DB stock
              await this.prisma.inventory.updateMany({
                where: {
                  storeId: existingSale.storeId,
                  productId: existingItem.productId,
                },
                data: {
                  quantity: {
                    decrement: diff,
                  },
                },
              });

              // Update Shopify stock
              if (existingItem.product?.shopifyId) {
                try {
                  const variantRes = await this.shopifyService.shopifyFetch(`variants/${existingItem.product.shopifyId}.json`);
                  const inventoryItemId = variantRes?.variant?.inventory_item_id;
                  if (inventoryItemId) {
                    const locationId = '69212209257';
                    await this.shopifyService.adjustInventory(
                      inventoryItemId.toString(),
                      locationId,
                      -diff,
                    );
                    this.logger.log(`[Shopify Sync] Adjusted stock on sale update: variant=${existingItem.product.shopifyId}, delta=${-diff}`);
                  }
                } catch (err: any) {
                  this.logger.error(`[Shopify Sync Error] Failed to adjust stock on update: ${err.message}`);
                }
              }
            }
          }

          await this.prisma.saleItem.update({
            where: { id: item.id },
            data: {
              quantity: item.quantity,
              price: item.price,
              discount: item.discount,
            },
          });
        }
      }
    }

    const updatedSale = await this.prisma.sale.update({
      where: { id },
      data: {
        date: dateVal,
        vendedor: vendedorVal,
        channel: channelVal,
        paymentMethod: paymentMethodVal,
        paymentBank: paymentBankVal,
        notes: notesVal,
        customerId: customerIdVal,
        total: newTotal,
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return updatedSale;
  }

  async deleteSale(id: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role === 'CLERK') {
      throw new ForbiddenException('Solo los Administradores pueden eliminar transacciones');
    }

    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException('Transacción no encontrada');
    }

    // Restore stock in local DB & Shopify for all items in the sale
    for (const item of sale.items) {
      if (item.quantity > 0 && item.productId) {
        await this.prisma.inventory.updateMany({
          where: {
            storeId: sale.storeId,
            productId: item.productId,
          },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        });

        if (item.product?.shopifyId) {
          try {
            const variantRes = await this.shopifyService.shopifyFetch(`variants/${item.product.shopifyId}.json`);
            const inventoryItemId = variantRes?.variant?.inventory_item_id;
            if (inventoryItemId) {
              const locationId = '69212209257';
              await this.shopifyService.adjustInventory(
                inventoryItemId.toString(),
                locationId,
                item.quantity, // restore stock to Shopify
              );
              this.logger.log(`[Shopify Sync] Restored stock for deleted sale item: variant=${item.product.shopifyId}, +${item.quantity}`);
            }
          } catch (err: any) {
            this.logger.error(`[Shopify Sync Error] Failed to restore stock on sale delete: ${err.message}`);
          }
        }
      }
    }

    await this.prisma.saleItem.deleteMany({ where: { saleId: id } });
    await this.prisma.sale.delete({ where: { id } });

    return { message: 'Transacción eliminada con éxito y stock restaurado' };
  }
}
