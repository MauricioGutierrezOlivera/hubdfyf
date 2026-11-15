-- Módulo Finanzas: Ventas mayoristas. Migración SOLO ADITIVA (2 tablas nuevas).
-- Generada con prisma migrate diff contra la base local el 2026-11-15.
-- NO aplicar en producción sin aprobación explícita de Mauricio.


-- CreateTable
CREATE TABLE "WholesaleSale" (
    "id" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "period" TEXT NOT NULL,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "documentUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WholesaleSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WholesaleSaleLine" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "modelKey" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceNet" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WholesaleSaleLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WholesaleSale_period_idx" ON "WholesaleSale"("period");

-- CreateIndex
CREATE UNIQUE INDEX "WholesaleSale_customer_invoiceNumber_key" ON "WholesaleSale"("customer", "invoiceNumber");

-- CreateIndex
CREATE INDEX "WholesaleSaleLine_saleId_idx" ON "WholesaleSaleLine"("saleId");

-- AddForeignKey
ALTER TABLE "WholesaleSaleLine" ADD CONSTRAINT "WholesaleSaleLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "WholesaleSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Seguridad: sin acceso desde la API pública de Supabase (igual que el resto de Finanzas).
ALTER TABLE "WholesaleSale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WholesaleSaleLine" ENABLE ROW LEVEL SECURITY;
