import { IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateProviderDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsUrl()
  apiBaseUrl?: string;
}
