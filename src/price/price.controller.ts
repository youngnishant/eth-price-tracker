import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { PriceService } from './price.service';
import { CreatePriceAlertDto } from './dto/create-price-alert.dto';
import { SwapRequestDto } from './dto/swap-request.dto';

@ApiTags('prices')
@Controller('prices')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get(':chain/hourly')
  @ApiOperation({ summary: 'Get hourly prices for the last 24 hours' })
  @ApiParam({ name: 'chain', enum: ['ethereum', 'polygon'] })
  getHourlyPrices(@Param('chain') chain: string) {
    if (!['ethereum', 'polygon'].includes(chain)) {
      throw new BadRequestException('Chain must be either ethereum or polygon');
    }
    return this.priceService.getHourlyPrices(chain);
  }

  @Post('alerts')
  @ApiOperation({ summary: 'Create a price alert' })
  createPriceAlert(@Body() createPriceAlertDto: CreatePriceAlertDto) {
    return this.priceService.createPriceAlert(
      createPriceAlertDto.chain,
      createPriceAlertDto.targetPrice,
      createPriceAlertDto.email,
    );
  }

  @Post('swap')
  @ApiOperation({ summary: 'Get ETH to BTC swap rate' })
  getSwapRate(@Body() swapRequestDto: SwapRequestDto) {
    return this.priceService.getSwapRate(swapRequestDto.ethAmount);
  }
}
