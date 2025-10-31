import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CreateCustomerDefaultDto, UpdateCustomerDefaultDto } from 'src/customers/dto/customer.dto';
import { CUSTOMER_SALON_ROLE } from 'src/customers/entities/customer-salon.entity';
import { CUSTOMER_STATUS } from 'src/customers/entities/customer.entity';

export class CreateUserCustomerDto extends CreateCustomerDefaultDto {
  @ApiProperty({ 
    description: 'Role to assign when auto-assigning to salon (optional, defaults to STAFF)', 
    enum: [
      CUSTOMER_SALON_ROLE.MANAGER,
      CUSTOMER_SALON_ROLE.FRONT_DESK,
      CUSTOMER_SALON_ROLE.STAFF,
      CUSTOMER_SALON_ROLE.OWNER,
      CUSTOMER_SALON_ROLE.BUSINESS_OWNER,
    ],
    example: CUSTOMER_SALON_ROLE.STAFF,
    required: false 
  })
  @IsEnum(CUSTOMER_SALON_ROLE)
  @IsOptional()
  customerRoleName?: string;
  
  @ApiProperty({ 
    description: 'The customer who created the customer (optional)', 
    required: false 
  })
  @IsUUID()
  @IsOptional()
  createdByUuid?: string;

  @ApiProperty({ 
    description: 'Customer Status (optional, defaults to ACTIVED)', 
    enum: [CUSTOMER_STATUS.ACTIVED, CUSTOMER_STATUS.BLOCKED, CUSTOMER_STATUS.INACTIVED, CUSTOMER_STATUS.PENDING],
    example: CUSTOMER_STATUS.ACTIVED,
    required: false 
  })
  @IsEnum(CUSTOMER_STATUS)
  @IsOptional()
  status?: string;
}

export class UpdateUserCustomerDto extends UpdateCustomerDefaultDto {
  @ApiProperty({ 
    description: 'Role to assign when auto-assigning to salon (optional, defaults to STAFF)', 
    enum: [
      CUSTOMER_SALON_ROLE.MANAGER,
      CUSTOMER_SALON_ROLE.FRONT_DESK,
      CUSTOMER_SALON_ROLE.STAFF,
      CUSTOMER_SALON_ROLE.OWNER,
      CUSTOMER_SALON_ROLE.BUSINESS_OWNER,
    ],
    example: CUSTOMER_SALON_ROLE.STAFF,
    required: false 
  })
  @IsEnum(CUSTOMER_SALON_ROLE)
  @IsOptional()
  customerRoleName?: string;

  @ApiProperty({ 
    description: 'Customer Status (optional, defaults to ACTIVED)', 
    enum: [CUSTOMER_STATUS.ACTIVED, CUSTOMER_STATUS.BLOCKED, CUSTOMER_STATUS.INACTIVED, CUSTOMER_STATUS.PENDING],
    example: CUSTOMER_STATUS.ACTIVED,
    required: false 
  })
  @IsEnum(CUSTOMER_STATUS)
  @IsOptional()
  status?: string;
}
