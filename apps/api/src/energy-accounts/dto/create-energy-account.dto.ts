import { IsString } from 'class-validator';

export class CreateEnergyAccountDto {
  @IsString()
  accountNumber: string;

  @IsString()
  deviceId: string;

  @IsString()
  customerName: string;

  @IsString()
  userId: string;

  @IsString()
  providerId: string;
}
