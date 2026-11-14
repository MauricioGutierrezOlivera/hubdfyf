import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { FinanceStorageService } from './finance-storage.service';
import { FinanceAdminGuard } from './finance-admin.guard';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService, FinanceStorageService, FinanceAdminGuard],
  exports: [FinanceService],
})
export class FinanceModule {}
