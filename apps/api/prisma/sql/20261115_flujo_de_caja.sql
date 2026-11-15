-- Módulo Finanzas: Flujo de caja. Migración SOLO ADITIVA: 1 tabla nueva (ImportPayment) y 2 columnas
-- opcionales en WholesaleSale (tabla de Finanzas). No toca tablas del POS.
-- NO aplicar en producción sin aprobación explícita de Mauricio.

-- AlterTable
ALTER TABLE "WholesaleSale" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "paidAt" TIMESTAMP(3);
-- CreateTable
CREATE TABLE "ImportPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "installment" INTEGER NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amountEur" DOUBLE PRECISION,
    "amountClp" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paidAmountClp" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImportPayment_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "ImportPayment_dueDate_idx" ON "ImportPayment"("dueDate");
-- CreateIndex
CREATE UNIQUE INDEX "ImportPayment_orderId_installment_key" ON "ImportPayment"("orderId", "installment");
-- AddForeignKey
ALTER TABLE "ImportPayment" ADD CONSTRAINT "ImportPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ImportOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImportPayment" ENABLE ROW LEVEL SECURITY;
