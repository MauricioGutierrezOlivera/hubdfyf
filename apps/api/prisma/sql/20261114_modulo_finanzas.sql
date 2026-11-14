-- Módulo Finanzas: migración SOLO ADITIVA (crea tipos, tablas e índices nuevos; no toca tablas existentes).
-- Generada con prisma migrate diff contra la base local el 2026-11-14.
-- NO aplicar en producción sin aprobación explícita de Mauricio.

-- CreateEnum
CREATE TYPE "ImportTransport" AS ENUM ('AIR', 'SEA');

-- CreateEnum
CREATE TYPE "ImportOrderStatus" AS ENUM ('DRAFT', 'IN_TRANSIT', 'RECEIVED');

-- CreateEnum
CREATE TYPE "ImportCostType" AS ENUM ('FACTORY_INVOICE', 'FREIGHT', 'INSURANCE', 'CUSTOMS_AGENT', 'DUTIES', 'LOCAL_TRANSPORT', 'BANK_FEES', 'OTHER', 'IMPORT_VAT');

-- CreateEnum
CREATE TYPE "FinanceCurrency" AS ENUM ('CLP', 'EUR', 'USD');

-- CreateEnum
CREATE TYPE "ImportItemCategory" AS ENUM ('FOOTWEAR', 'ACCESSORY', 'PACKAGING');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'COMMON_EXPENSES', 'SALARIES', 'COMMISSIONS', 'MARKETING', 'ACCOUNTING', 'FRANCHISE_FEE', 'UTILITIES', 'SUPPLIES', 'EVENTS', 'BANK_FEES', 'SHIPPING', 'INSURANCE', 'TAXES_OTHER', 'CAPEX', 'FINANCIAL_COST', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseKind" AS ENUM ('FIXED', 'VARIABLE');

-- CreateEnum
CREATE TYPE "CostMatchSource" AS ENUM ('AUTO', 'MANUAL');

-- CreateTable
CREATE TABLE "ImportOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "season" TEXT,
    "transport" "ImportTransport" NOT NULL,
    "orderDate" TIMESTAMP(3),
    "arrivalDate" TIMESTAMP(3),
    "eurClpRate" DOUBLE PRECISION NOT NULL,
    "status" "ImportOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportOrderCost" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "ImportCostType" NOT NULL,
    "supplier" TEXT,
    "documentNumber" TEXT,
    "date" TIMESTAMP(3),
    "currency" "FinanceCurrency" NOT NULL DEFAULT 'CLP',
    "amount" DOUBLE PRECISION NOT NULL,
    "fxRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "amountClp" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "documentUrl" TEXT,
    "notes" TEXT,
    "importKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportOrderCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "category" "ImportItemCategory" NOT NULL DEFAULT 'FOOTWEAR',
    "style" TEXT,
    "model" TEXT,
    "color" TEXT,
    "modelKey" TEXT NOT NULL,
    "quantityInvoiced" INTEGER NOT NULL,
    "quantityReceived" INTEGER NOT NULL,
    "unitCostEur" DOUBLE PRECISION NOT NULL,
    "retailPrice" DOUBLE PRECISION,
    "sizeBreakdown" JSONB,
    "factoryCostClp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allocatedExtraClp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "landedUnitCostClp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "importKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCostLink" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "modelKey" TEXT NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'WEIGHTED_AVERAGE',
    "matchSource" "CostMatchSource" NOT NULL DEFAULT 'AUTO',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCostLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "period" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "kind" "ExpenseKind" NOT NULL DEFAULT 'FIXED',
    "supplier" TEXT,
    "description" TEXT NOT NULL,
    "amountNet" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "documentUrl" TEXT,
    "notes" TEXT,
    "amortizeMonths" INTEGER,
    "importKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapitalContribution" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "partner" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "importKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapitalContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashBalance" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportOrder_code_key" ON "ImportOrder"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ImportOrderCost_importKey_key" ON "ImportOrderCost"("importKey");

-- CreateIndex
CREATE INDEX "ImportOrderCost_orderId_idx" ON "ImportOrderCost"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportOrderItem_importKey_key" ON "ImportOrderItem"("importKey");

-- CreateIndex
CREATE INDEX "ImportOrderItem_orderId_idx" ON "ImportOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "ImportOrderItem_modelKey_idx" ON "ImportOrderItem"("modelKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCostLink_productId_key" ON "ProductCostLink"("productId");

-- CreateIndex
CREATE INDEX "ProductCostLink_modelKey_idx" ON "ProductCostLink"("modelKey");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_importKey_key" ON "Expense"("importKey");

-- CreateIndex
CREATE INDEX "Expense_period_idx" ON "Expense"("period");

-- CreateIndex
CREATE UNIQUE INDEX "CapitalContribution_importKey_key" ON "CapitalContribution"("importKey");

-- AddForeignKey
ALTER TABLE "ImportOrderCost" ADD CONSTRAINT "ImportOrderCost_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ImportOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportOrderItem" ADD CONSTRAINT "ImportOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ImportOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCostLink" ADD CONSTRAINT "ProductCostLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Seguridad: las tablas de Finanzas no deben ser accesibles por la API pública de Supabase
-- (claves anon/authenticated). La API NestJS se conecta como dueña de las tablas y no se ve afectada.
ALTER TABLE "ImportOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImportOrderCost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImportOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductCostLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CapitalContribution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashBalance" ENABLE ROW LEVEL SECURITY;
