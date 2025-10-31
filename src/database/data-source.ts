import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { Permission } from '../roles/entities/permission.entity';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { Salon } from '../salons/entities/salon.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerSalon } from '../customers/entities/customer-salon.entity';
import { SocialAccount } from '../auth/entities/social-account.entity';
import { Plan } from '../plans/entities/plan.entity';
import { resolveDatabaseConfig } from './database-env.util';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
dotenv.config();

const { host: dbHost, port: dbPort, username: dbUsername, password: dbPassword, database: dbName, useTest } =
  resolveDatabaseConfig();

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
export const AppDataSource = new DataSource({
  type: 'mysql',
  host: dbHost,
  port: dbPort,
  username: dbUsername,
  password: dbPassword,
  database: dbName,
  entities: [User, Role, Permission, Salon, Customer, CustomerSalon, SocialAccount, Plan],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: useTest ? false : true,
});
