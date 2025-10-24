import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Permission } from '../roles/entities/permission.entity';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { Salon } from '../salons/entities/salon.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerSalon } from '../customers/entities/customer-salon.entity';
import { SocialAccount } from '../auth/entities/social-account.entity';
import { Product } from '../products/entities/product.entity';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
dotenv.config();

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '3306', 10),
  username: process.env.DATABASE_USERNAME || 'root',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'ezsalon',
  entities: [User, Role, Permission, Salon, Customer, CustomerSalon, SocialAccount, Product],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: false,
});
