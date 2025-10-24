import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitDatabase1729801600000 implements MigrationInterface {
  name = 'InitDatabase1729801600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create permissions table
    await queryRunner.query(`
      CREATE TABLE \`permissions\` (
        \`uuid\` varchar(36) NOT NULL,
        \`permission_name\` varchar(255) NOT NULL,
        \`display_name\` varchar(255) NOT NULL,
        \`permission_description\` varchar(255) NULL,
        \`resource_type\` varchar(255) NOT NULL,
        \`action_type\` varchar(255) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_permission_name\` (\`permission_name\`),
        PRIMARY KEY (\`uuid\`)
      ) ENGINE=InnoDB
    `);

    // Create roles table
    await queryRunner.query(`
      CREATE TABLE \`roles\` (
        \`uuid\` varchar(36) NOT NULL,
        \`role_name\` varchar(255) NOT NULL,
        \`display_name\` varchar(255) NOT NULL,
        \`role_description\` varchar(255) NULL,
        \`ui_color\` varchar(255) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_role_name\` (\`role_name\`),
        PRIMARY KEY (\`uuid\`)
      ) ENGINE=InnoDB
    `);

    // Create role_permissions junction table
    await queryRunner.query(`
      CREATE TABLE \`role_permissions\` (
        \`role_uuid\` varchar(36) NOT NULL,
        \`permission_uuid\` varchar(36) NOT NULL,
        INDEX \`IDX_role_permissions_role\` (\`role_uuid\`),
        INDEX \`IDX_role_permissions_permission\` (\`permission_uuid\`),
        PRIMARY KEY (\`role_uuid\`, \`permission_uuid\`)
      ) ENGINE=InnoDB
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`uuid\` varchar(36) NOT NULL,
        \`email_address\` varchar(255) NOT NULL,
        \`full_name\` varchar(255) NOT NULL,
        \`password_hash\` varchar(255) NOT NULL,
        \`phone_number\` varchar(255) NULL,
        \`avatar_url\` varchar(255) NULL,
        \`status\` varchar(255) NOT NULL DEFAULT 'ACTIVED',
        \`role_uuid\` varchar(36) NULL,
        \`created_by_uuid\` varchar(36) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_user_email\` (\`email_address\`),
        INDEX \`IDX_user_role\` (\`role_uuid\`),
        INDEX \`IDX_user_created_by\` (\`created_by_uuid\`),
        PRIMARY KEY (\`uuid\`)
      ) ENGINE=InnoDB
    `);

    // Create salons table
    await queryRunner.query(`
      CREATE TABLE \`salons\` (
        \`uuid\` varchar(36) NOT NULL,
        \`salon_name\` varchar(255) NOT NULL,
        \`description\` text NULL,
        \`salon_address\` varchar(255) NOT NULL,
        \`phone_number\` varchar(255) NOT NULL,
        \`email_address\` varchar(255) NOT NULL,
        \`business_hours\` json NULL,
        \`website_url\` varchar(255) NULL,
        \`status\` varchar(255) NOT NULL DEFAULT 'ACTIVED',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_salon_email\` (\`email_address\`),
        PRIMARY KEY (\`uuid\`)
      ) ENGINE=InnoDB
    `);

    // Create customers table
    await queryRunner.query(`
      CREATE TABLE \`customers\` (
        \`uuid\` varchar(36) NOT NULL,
        \`full_name\` varchar(255) NOT NULL,
        \`email_address\` varchar(255) NOT NULL,
        \`phone_number\` varchar(255) NULL,
        \`date_of_birth\` date NULL,
        \`gender\` varchar(255) NULL,
        \`avatar_url\` varchar(255) NULL,
        \`status\` varchar(255) NOT NULL DEFAULT 'ACTIVED',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_customer_email\` (\`email_address\`),
        PRIMARY KEY (\`uuid\`)
      ) ENGINE=InnoDB
    `);

    // Create customer_salons junction table
    await queryRunner.query(`
      CREATE TABLE \`customer_salons\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`customer_uuid\` varchar(36) NOT NULL,
        \`salon_uuid\` varchar(36) NOT NULL,
        \`relationship_status\` varchar(255) NOT NULL DEFAULT 'ACTIVE',
        \`joined_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_customer_salons_customer\` (\`customer_uuid\`),
        INDEX \`IDX_customer_salons_salon\` (\`salon_uuid\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Create social_accounts table
    await queryRunner.query(`
      CREATE TABLE \`social_accounts\` (
        \`uuid\` varchar(36) NOT NULL,
        \`provider\` varchar(255) NOT NULL,
        \`provider_id\` varchar(255) NOT NULL,
        \`email_address\` varchar(255) NOT NULL,
        \`full_name\` varchar(255) NOT NULL,
        \`avatar_url\` varchar(255) NULL,
        \`user_uuid\` varchar(36) NULL,
        \`customer_uuid\` varchar(36) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_social_provider_id\` (\`provider\`, \`provider_id\`),
        INDEX \`IDX_social_user\` (\`user_uuid\`),
        INDEX \`IDX_social_customer\` (\`customer_uuid\`),
        PRIMARY KEY (\`uuid\`)
      ) ENGINE=InnoDB
    `);

    // Create products table
    await queryRunner.query(`
      CREATE TABLE \`products\` (
        \`uuid\` varchar(36) NOT NULL,
        \`product_name\` varchar(255) NOT NULL,
        \`description\` text NULL,
        \`price\` decimal(10,2) NOT NULL,
        \`duration_minutes\` int NULL,
        \`category\` varchar(255) NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`uuid\`)
      ) ENGINE=InnoDB
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE \`role_permissions\` 
      ADD CONSTRAINT \`FK_role_permissions_role\` 
      FOREIGN KEY (\`role_uuid\`) REFERENCES \`roles\`(\`uuid\`) ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`role_permissions\` 
      ADD CONSTRAINT \`FK_role_permissions_permission\` 
      FOREIGN KEY (\`permission_uuid\`) REFERENCES \`permissions\`(\`uuid\`) ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`users\` 
      ADD CONSTRAINT \`FK_users_role\` 
      FOREIGN KEY (\`role_uuid\`) REFERENCES \`roles\`(\`uuid\`) ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`users\` 
      ADD CONSTRAINT \`FK_users_created_by\` 
      FOREIGN KEY (\`created_by_uuid\`) REFERENCES \`users\`(\`uuid\`) ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`customer_salons\` 
      ADD CONSTRAINT \`FK_customer_salons_customer\` 
      FOREIGN KEY (\`customer_uuid\`) REFERENCES \`customers\`(\`uuid\`) ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`customer_salons\` 
      ADD CONSTRAINT \`FK_customer_salons_salon\` 
      FOREIGN KEY (\`salon_uuid\`) REFERENCES \`salons\`(\`uuid\`) ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`social_accounts\` 
      ADD CONSTRAINT \`FK_social_accounts_user\` 
      FOREIGN KEY (\`user_uuid\`) REFERENCES \`users\`(\`uuid\`) ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`social_accounts\` 
      ADD CONSTRAINT \`FK_social_accounts_customer\` 
      FOREIGN KEY (\`customer_uuid\`) REFERENCES \`customers\`(\`uuid\`) ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    await queryRunner.query(`ALTER TABLE \`social_accounts\` DROP FOREIGN KEY \`FK_social_accounts_customer\``);
    await queryRunner.query(`ALTER TABLE \`social_accounts\` DROP FOREIGN KEY \`FK_social_accounts_user\``);
    await queryRunner.query(`ALTER TABLE \`customer_salons\` DROP FOREIGN KEY \`FK_customer_salons_salon\``);
    await queryRunner.query(`ALTER TABLE \`customer_salons\` DROP FOREIGN KEY \`FK_customer_salons_customer\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_users_created_by\``);
    await queryRunner.query(`ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_users_role\``);
    await queryRunner.query(`ALTER TABLE \`role_permissions\` DROP FOREIGN KEY \`FK_role_permissions_permission\``);
    await queryRunner.query(`ALTER TABLE \`role_permissions\` DROP FOREIGN KEY \`FK_role_permissions_role\``);

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE \`products\``);
    await queryRunner.query(`DROP TABLE \`social_accounts\``);
    await queryRunner.query(`DROP TABLE \`customer_salons\``);
    await queryRunner.query(`DROP TABLE \`customers\``);
    await queryRunner.query(`DROP TABLE \`salons\``);
    await queryRunner.query(`DROP TABLE \`users\``);
    await queryRunner.query(`DROP TABLE \`role_permissions\``);
    await queryRunner.query(`DROP TABLE \`roles\``);
    await queryRunner.query(`DROP TABLE \`permissions\``);
  }
}