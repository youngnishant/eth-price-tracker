import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwapRequestDto {
  @ApiProperty()
  @IsNumber()
  ethAmount: number;
}
