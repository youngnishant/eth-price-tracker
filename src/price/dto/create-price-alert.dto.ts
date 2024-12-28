import { IsString, IsNumber, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePriceAlertDto {
  @ApiProperty()
  @IsString()
  chain: string;

  @ApiProperty()
  @IsNumber()
  targetPrice: number;

  @ApiProperty()
  @IsEmail()
  email: string;
}
