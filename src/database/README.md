# Database Seeding

This directory contains seeding functionality for the EzSalon application.

## Files

- `seed-data.ts` - Contains sample data for permissions, roles, and users
- `seed-all.ts` - Comprehensive seeding script (all data: permissions, roles, users)
- `seed-users-only.ts` - Users-only seeding script (requires existing roles)
- `data-source.ts` - TypeORM data source configuration

## Seeding Commands

### Seed All Data (Permissions, Roles, Users)

```bash
npm run seed:all
```

This command seeds everything from scratch including:

- All permissions
- All roles with their permission assignments
- All users with their role assignments

**Use this for:** Initial setup or complete database reset

### Seed Users Only

```bash
npm run seed:user
```

This command only seeds users, assuming roles and permissions already exist.

**Use this for:** Adding users to an existing system or refreshing user data

## Sample Users

The seeding creates the following sample users:

### Admin

- **Email**: admin@ezsalon.com
- **Password**: admin123
- **Role**: admin

### Manager

- **Email**: manager@ezsalon.com
- **Password**: manager123
- **Role**: manager

### Stylists

- **Email**: stylist1@ezsalon.com | **Password**: stylist123 | **Role**: stylist
- **Email**: stylist2@ezsalon.com | **Password**: stylist123 | **Role**: stylist

### Receptionist

- **Email**: receptionist@ezsalon.com
- **Password**: reception123
- **Role**: receptionist

### Customers

- **Email**: customer1@example.com | **Password**: customer123 | **Role**: customer
- **Email**: customer2@example.com | **Password**: customer123 | **Role**: customer
- **Email**: customer3@example.com | **Password**: customer123 | **Role**: customer

## Usage

### Seed All Data (Recommended for first-time setup)

```bash
npm run seed:all
```

### Seed Users Only (When roles already exist)

```bash
npm run seed:user
```

### Via Docker

```bash
# If running in Docker, exec into the container first
docker-compose exec app npm run seed:all
# or for users only
docker-compose exec app npm run seed:user
```

## Script Behavior

### seed:all

- **Comprehensive seeding**: Creates permissions, roles, and users
- **Checks for existing data**: Won't create duplicates
- **Order-dependent**: Seeds in correct order (permissions → roles → users)

### seed:user

- **User-only seeding**: Only creates users
- **Requires existing roles**: Will fail if no roles exist in database
- **Checks for existing users**: Won't create duplicates if user email already exists

### Common Features

- **Hashes passwords**: All passwords are securely hashed using bcryptjs
- **Provides feedback**: Shows detailed console output of the seeding process
- **Handles errors**: Graceful error handling and database connection cleanup

## Testing Login

After seeding, you can test login with any of the sample users:

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ezsalon.com","password":"admin123"}'
```

## Environment Requirements

Make sure your `.env` file has the correct database configuration:

```env
DATABASE_HOST=mysql
DATABASE_PORT=3306
DATABASE_USERNAME=root
DATABASE_PASSWORD=password
DATABASE_NAME=ezsalon
```
