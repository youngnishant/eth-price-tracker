import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Price } from './entities/price.entity';
import { PriceAlert } from './entities/price-alert.entity';
import { EmailService } from '../shared/email.service';
import axios from 'axios';

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);

  constructor(
    @InjectRepository(Price)
    private priceRepository: Repository<Price>,
    @InjectRepository(PriceAlert)
    private priceAlertRepository: Repository<PriceAlert>,
    private emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async trackPrices() {
    await this.fetchAndSavePrice('ethereum');
    await this.fetchAndSavePrice('polygon');
    await this.checkPriceChanges();
    await this.checkPriceAlerts();
  }

  private async fetchAndSavePrice(chain: string) {
    try {
      const tokenAddress =
        chain === 'ethereum'
          ? '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' // ETH
          : '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0'; // polygon

      const response = await axios.get(
        `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress}/price`,
        {
          headers: {
            'X-API-Key': process.env.MORALIS_API_KEY,
            accept: 'application/json',
          },
        },
      );

      const price = new Price();
      price.chain = chain;
      price.price = response.data.usdPrice;
      await this.priceRepository.save(price);
    } catch (error) {
      this.logger.error(`Failed to fetch ${chain} price: ${error.message}`);
    }
  }
  async getHourlyPrices(chain: string) {
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    return this.priceRepository.find({
      where: {
        chain,
        timestamp: MoreThanOrEqual(yesterday),
      },
      order: {
        timestamp: 'DESC',
      },
    });
  }

  async createPriceAlert(chain: string, targetPrice: number, email: string) {
    const alert = new PriceAlert();
    alert.chain = chain;
    alert.targetPrice = targetPrice;
    alert.email = email;
    return this.priceAlertRepository.save(alert);
  }

  async getSwapRate(ethAmount: number) {
    try {
      const response = await axios.get(
        'https://api.moralis.io/v2/erc20/eth/price',
        {
          headers: {
            'X-API-Key': process.env.MORALIS_API_KEY,
          },
        },
      );

      const ethPrice = response.data.usdPrice;
      const btcResponse = await axios.get(
        'https://api.moralis.io/v2/erc20/btc/price',
        {
          headers: {
            'X-API-Key': process.env.MORALIS_API_KEY,
          },
        },
      );
      const btcPrice = btcResponse.data.usdPrice;

      const fee = ethAmount * 0.0003; // 0.03% fee
      const feeInUsd = fee * ethPrice;
      const btcAmount = ((ethAmount - fee) * ethPrice) / btcPrice;

      return {
        btcAmount,
        fee: {
          eth: fee,
          usd: feeInUsd,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get swap rate: ${error.message}`);
      throw error;
    }
  }

  private async checkPriceChanges() {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    for (const chain of ['ethereum', 'polygon']) {
      const [currentPrice, oldPrice] = await Promise.all([
        this.priceRepository.findOne({
          where: { chain },
          order: { timestamp: 'DESC' },
        }),
        this.priceRepository.findOne({
          where: {
            chain,
            timestamp: LessThanOrEqual(oneHourAgo),
          },
          order: { timestamp: 'DESC' },
        }),
      ]);

      if (currentPrice && oldPrice) {
        const priceChange =
          ((currentPrice.price - oldPrice.price) / oldPrice.price) * 100;

        if (priceChange > 3) {
          await this.emailService.sendEmail(
            'hyperhire_assignment@hyperhire.in',
            `${chain} Price Alert`,
            `${chain} price has increased by ${priceChange.toFixed(
              2,
            )}% in the last hour`,
          );
        }
      }
    }
  }

  private async checkPriceAlerts() {
    const alerts = await this.priceAlertRepository.find({
      where: { triggered: false },
    });

    for (const alert of alerts) {
      const currentPrice = await this.priceRepository.findOne({
        where: { chain: alert.chain },
        order: { timestamp: 'DESC' },
      });

      if (currentPrice && currentPrice.price >= alert.targetPrice) {
        await this.emailService.sendEmail(
          alert.email,
          'Price Alert Triggered',
          `${alert.chain} has reached your target price of $${alert.targetPrice}`,
        );

        alert.triggered = true;
        await this.priceAlertRepository.save(alert);
      }
    }
  }
}
