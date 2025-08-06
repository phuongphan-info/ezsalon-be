import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { CUSTOMER_SALON_ROLE } from '../entities/customer-salon.entity';

export class CreateCustomerSalonDto {
  @ApiProperty({ description: 'Customer UUID' })
  @IsUUID()
  @IsNotEmpty()
  customerUuid: string;

  @ApiProperty({ description: 'Salon UUID' })
  @IsUUID()
  @IsNotEmpty()
  salonUuid: string;

  @ApiProperty({ 
    description: 'Customer role in this salon', 
    enum: CUSTOMER_SALON_ROLE,
    example: CUSTOMER_SALON_ROLE.STAFF 
  })
  @IsEnum(CUSTOMER_SALON_ROLE)
  @IsNotEmpty()
  roleName: string;
}

export class UpdateCustomerSalonDto {
  @ApiProperty({ 
    description: 'Customer role in this salon', 
    enum: CUSTOMER_SALON_ROLE,
    required: false 
  })
  @IsEnum(CUSTOMER_SALON_ROLE)
  roleName?: string;
}
