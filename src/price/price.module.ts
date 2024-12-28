import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceController } from './price.controller';
import { PriceService } from './price.service';
import { Price } from './entities/price.entity';
import { PriceAlert } from './entities/price-alert.entity';
import { EmailService } from '../shared/email.service';

@Module({
  imports: [TypeOrmModule.forFeature([Price, PriceAlert])],
  controllers: [PriceController],
  providers: [PriceService, EmailService],
})
export class PriceModule {}
