# Database Migrations Guide

This document provides a comprehensive guide for managing database migrations in the EzSalon application using TypeORM.

## Overview

Database migrations are version-controlled scripts that modify your database schema in a consistent and repeatable way. They allow you to:

- Track changes to your database schema over time
- Share database changes with your team
- Deploy database changes consistently across environments
- Roll back problematic changes if needed

## Setup

### Prerequisites

- MySQL database server running
- Environment variables configured (see `.env` file)
- TypeORM configured in `src/database/data-source.ts`

### Configuration

The migration system is configured in `src/database/data-source.ts`:

```typescript
export const AppDataSource = new DataSource({
  // ... other config
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'migrations',
  synchronize: false, // Important: Always false in production
});
```

## Available Commands

### Run Migrations

Execute all pending migrations:

```bash
npm run migration:run
```

This command will:
- Check the `migrations` table to see which migrations have been applied
- Run any new migrations in chronological order
- Update the `migrations` table with the new migration records

### Revert Migration

Revert the last applied migration:

```bash
npm run migration:revert
```

**⚠️ Warning**: This will undo the last migration. Use with caution in production environments.

### Generate Migration

Generate a new migration based on entity changes:

```bash
npm run migration:generate src/migrations/DescriptiveName
```

This command will:
- Compare your current entities with the database schema
- Generate a migration file with the necessary changes
- Name the file with a timestamp and your provided name

### Create Empty Migration

Create an empty migration file for custom changes:

```bash
npm run migration:create src/migrations/DescriptiveName
```

### Show Migration Status

Display the status of all migrations:

```bash
npm run migration:show
```

## Initial Database Setup

### First Time Setup

1. **Create the database** (if it doesn't exist):
   ```sql
   CREATE DATABASE ezsalon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Run the initial migration**:
   ```bash
   npm run migration:run
   ```

This will create all the necessary tables:
- `permissions` - System permissions
- `roles` - User roles with permissions
- `users` - Application users (staff, managers, etc.)
- `salons` - Salon information
- `customers` - Customer information
- `customer_salons` - Many-to-many relationship between customers and salons
- `social_accounts` - OAuth social login accounts
- `plans` - Services and plans offered by salons

### Database Schema

The initial migration (`1729801600000-InitDatabase.ts`) creates the following table structure:

#### Core Tables

**permissions**
- Stores system permissions (create, read, update, delete operations)
- Links to roles via many-to-many relationship

**roles**
- Defines user roles (admin, owner, manager, staff)
- Has many permissions and many users

**users**
- Application users with authentication
- Belongs to a role, can be created by another user
- Includes status tracking (ACTIVED, INACTIVED, PENDING)

**salons**
- Salon business information
- Includes business hours (JSON field), contact info
- Status tracking for active/inactive salons

**customers**
- Customer information and profiles
- Includes demographics and contact information
- Status tracking

#### Relationship Tables

**customer_salons**
- Junction table linking customers to salons
- Tracks relationship status and join date
- Allows customers to be associated with multiple salons

**social_accounts**
- OAuth social login integration
- Can link to either users or customers
- Supports multiple providers (Google, Facebook, etc.)

**plans**
- Services and plans offered
- Includes pricing, duration, and categorization
- Status tracking for active/inactive plans

## Migration Best Practices

### Naming Conventions

Use descriptive names for your migrations:
- `AddUserAvatarColumn`
- `CreateBookingsTable`
- `UpdatePlanPricing`
- `AddIndexesToUsersTable`

### Writing Safe Migrations

1. **Always test migrations in development first**
2. **Backup your database before running migrations in production**
3. **Write both `up` and `down` methods**
4. **Use transactions when possible**
5. **Consider data migration needs**

### Example Migration Structure

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAvatarColumn1729801700000 implements MigrationInterface {
  name = 'AddUserAvatarColumn1729801700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      ADD COLUMN \`avatar_url\` varchar(255) NULL 
      AFTER \`phone_number\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\` 
      DROP COLUMN \`avatar_url\`
    `);
  }
}
```

## Environment-Specific Considerations

### Development

- Use `synchronize: false` to rely on migrations
- Run migrations after pulling new code
- Generate migrations when you modify entities

### Planion

- **Never use `synchronize: true`**
- Always review generated migrations before applying
- Backup database before running migrations
- Consider maintenance windows for schema changes
- Test migrations on staging environment first

## Troubleshooting

### Common Issues

**Migration table doesn't exist**
```bash
# The migration table will be created automatically on first migration run
npm run migration:run
```

**Migration fails**
- Check database connection
- Verify database user has necessary permissions
- Review migration SQL for syntax errors
- Check for conflicting schema changes

**Entity changes not reflected**
```bash
# Generate a new migration after entity changes
npm run migration:generate src/migrations/YourChangeName
```

### Manual Migration Table Management

The migrations are tracked in the `migrations` table. You can check the status:

```sql
SELECT * FROM migrations ORDER BY timestamp DESC;
```

**⚠️ Advanced**: Only modify this table if you know what you're doing.

## Data Seeding

After running migrations, you may want to seed initial data:

```bash
# Seed all default data
npm run seed:all

# Or seed specific data
npm run seed:permissions
npm run seed:users
npm run seed:plans
```

## Integration with CI/CD

Add migration commands to your deployment scripts:

```bash
# In your deployment script
npm run migration:run
npm run seed:all  # If needed for initial setup
```

## Security Considerations

1. **Database User Permissions**: Ensure the database user has appropriate permissions for schema changes
2. **Backup Strategy**: Always backup before migrations in production
3. **Review Process**: Have a code review process for migration files
4. **Rollback Plan**: Always have a rollback plan for production deployments

## Further Reading

- [TypeORM Migrations Documentation](https://typeorm.io/migrations)
- [Database Migration Best Practices](https://www.atlassian.com/data/sql/how-database-migrations-work)
- [MySQL Migration Strategies](https://dev.mysql.com/doc/refman/8.0/en/upgrade-strategies.html)