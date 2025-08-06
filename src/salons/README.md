# Salons Module - API Documentation

## Overview
The Salons module provides a complete CRUD API for managing salons in the EzSalon application. All endpoints require JWT authentication.

## Authentication
All salon endpoints require a valid JWT access token. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Salon Management Endpoints

### 1. Create Salon
- **Method**: `POST /salons`
- **Description**: Create a new salon
- **Auth**: Required (JWT)
- **Body**: CreateSalonDto
- **Responses**:
  - 201: Salon created successfully
  - 400: Bad request
  - 401: Unauthorized - Invalid JWT token

### 2. Get All Salons
- **Method**: `GET /salons`
- **Description**: Get all salons with optional filtering
- **Auth**: Required (JWT)
- **Query Parameters**:
  - `status` (optional): Filter by salon status (ACTIVE, INACTIVE, PENDING)
  - `search` (optional): Search salons by name, address, or email
- **Responses**:
  - 200: List of all salons
  - 401: Unauthorized - Invalid JWT token

### 3. Get Salon by ID
- **Method**: `GET /salons/:uuid`
- **Description**: Get a specific salon by its UUID
- **Auth**: Required (JWT)
- **Parameters**: `uuid` (salon ID)
- **Responses**:
  - 200: Salon found
  - 404: Salon not found
  - 401: Unauthorized - Invalid JWT token

### 4. Update Salon
- **Method**: `PATCH /salons/:uuid`
- **Description**: Update salon information
- **Auth**: Required (JWT)
- **Parameters**: `uuid` (salon ID)
- **Body**: UpdateSalonDto
- **Responses**:
  - 200: Salon updated successfully
  - 400: Bad request
  - 404: Salon not found
  - 401: Unauthorized - Invalid JWT token

### 5. Delete Salon
- **Method**: `DELETE /salons/:uuid`
- **Description**: Delete a salon
- **Auth**: Required (JWT)
- **Parameters**: `uuid` (salon ID)
- **Responses**:
  - 204: Salon deleted successfully
  - 404: Salon not found
  - 401: Unauthorized - Invalid JWT token

### 6. Find Salon by Email
- **Method**: `GET /salons/email/:email`
- **Description**: Find a salon by email address
- **Auth**: Required (JWT)
- **Parameters**: `email` (salon email)
- **Responses**:
  - 200: Salon found
  - 404: Salon not found
  - 401: Unauthorized - Invalid JWT token

## User-Salon Relationship Endpoints

### 1. Create User-Salon Relationship
- **Method**: `POST /user-salons`
- **Description**: Create a relationship between a user and salon
- **Auth**: Required (JWT)
- **Body**: CreateUserSalonDto
- **Responses**:
  - 201: Relationship created successfully
  - 400: Bad request or relationship already exists
  - 401: Unauthorized - Invalid JWT token
  - 404: User or Salon not found

### 2. Get All Relationships
- **Method**: `GET /user-salons`
- **Description**: Get all user-salon relationships
- **Auth**: Required (JWT)
- **Responses**:
  - 200: List of all relationships
  - 401: Unauthorized - Invalid JWT token

### 3. Get Relationship by ID
- **Method**: `GET /user-salons/:uuid`
- **Description**: Get a specific relationship by ID
- **Auth**: Required (JWT)
- **Parameters**: `uuid` (relationship ID)
- **Responses**:
  - 200: Relationship found
  - 404: Relationship not found
  - 401: Unauthorized - Invalid JWT token

### 4. Update Relationship
- **Method**: `PATCH /user-salons/:uuid`
- **Description**: Update user-salon relationship
- **Auth**: Required (JWT)
- **Parameters**: `uuid` (relationship ID)
- **Body**: UpdateUserSalonDto
- **Responses**:
  - 200: Relationship updated successfully
  - 400: Bad request
  - 404: Relationship not found
  - 401: Unauthorized - Invalid JWT token

### 5. Delete Relationship
- **Method**: `DELETE /user-salons/:uuid`
- **Description**: Delete user-salon relationship
- **Auth**: Required (JWT)
- **Parameters**: `uuid` (relationship ID)
- **Responses**:
  - 204: Relationship deleted successfully
  - 404: Relationship not found
  - 401: Unauthorized - Invalid JWT token

### 6. Get Users by Salon
- **Method**: `GET /user-salons/salon/:salonUuid/users`
- **Description**: Get all users working at a specific salon
- **Auth**: Required (JWT)
- **Parameters**: `salonUuid` (salon ID)
- **Responses**:
  - 200: List of users for the salon
  - 401: Unauthorized - Invalid JWT token

### 7. Get Salon Owners
- **Method**: `GET /user-salons/salon/:salonUuid/owners`
- **Description**: Get all owners of a specific salon
- **Auth**: Required (JWT)
- **Parameters**: `salonUuid` (salon ID)
- **Responses**:
  - 200: List of salon owners
  - 401: Unauthorized - Invalid JWT token

### 8. Get Salon Managers
- **Method**: `GET /user-salons/salon/:salonUuid/managers`
- **Description**: Get all managers of a specific salon
- **Auth**: Required (JWT)
- **Parameters**: `salonUuid` (salon ID)
- **Responses**:
  - 200: List of salon managers
  - 401: Unauthorized - Invalid JWT token

### 9. Get Salon Staff
- **Method**: `GET /user-salons/salon/:salonUuid/staff`
- **Description**: Get all staff members of a specific salon
- **Auth**: Required (JWT)
- **Parameters**: `salonUuid` (salon ID)
- **Responses**:
  - 200: List of salon staff
  - 401: Unauthorized - Invalid JWT token

### 10. Assign User to Salon
- **Method**: `POST /user-salons/salon/:salonUuid/assign-user`
- **Description**: Assign a user to a salon with a specific role
- **Auth**: Required (JWT)
- **Parameters**: `salonUuid` (salon ID)
- **Body**: AssignUserToSalonDto
- **Responses**:
  - 201: User assigned to salon successfully
  - 400: Bad request
  - 401: Unauthorized - Invalid JWT token
  - 404: User or Salon not found

### 11. Remove User from Salon
- **Method**: `DELETE /user-salons/salon/:salonUuid/user/:userUuid`
- **Description**: Remove a user from a salon
- **Auth**: Required (JWT)
- **Parameters**: 
  - `salonUuid` (salon ID)
  - `userUuid` (user ID)
- **Responses**:
  - 204: User removed from salon successfully
  - 404: Relationship not found
  - 401: Unauthorized - Invalid JWT token

### 12. Get Salons by User
- **Method**: `GET /user-salons/user/:userUuid/salons`
- **Description**: Get all salons where a user works
- **Auth**: Required (JWT)
- **Parameters**: `userUuid` (user ID)
- **Responses**:
  - 200: List of salons for the user
  - 401: Unauthorized - Invalid JWT token

## Data Models

### Salon Entity
```typescript
{
  uuid: string;           // Primary key (UUID)
  name: string;           // Salon name
  description?: string;   // Optional description
  address: string;        // Salon address
  phone: string;          // Phone number
  email: string;          // Email address (unique)
  businessHours?: object; // Business hours (JSON)
  website?: string;       // Website URL (optional)
  logo?: string;          // Logo URL (optional)
  status: string;         // ACTIVE, INACTIVE, PENDING
  userSalons: UserSalon[]; // Related user-salon relationships
  createdAt: Date;        // Creation timestamp
  updatedAt: Date;        // Last update timestamp
}
```

### UserSalon Entity
```typescript
{
  uuid: string;           // Primary key (UUID)
  user: User;             // Related user
  salon: Salon;           // Related salon
  role: string;           // OWNER, MANAGER, STAFF
  status: string;         // ACTIVE, INACTIVE, PENDING
  startDate?: Date;       // Employment start date
  endDate?: Date;         // Employment end date
  notes?: string;         // Additional notes
  createdAt: Date;        // Creation timestamp
  updatedAt: Date;        // Last update timestamp
}
```

### CreateUserSalonDto
```typescript
{
  userUuid: string;       // Required - User UUID
  salonUuid: string;      // Required - Salon UUID
  role: string;           // Required - OWNER, MANAGER, STAFF
  startDate?: string;     // Optional - ISO date string
  endDate?: string;       // Optional - ISO date string
  notes?: string;         // Optional - Additional notes
}
```

### UpdateUserSalonDto
```typescript
{
  role?: string;          // Optional - OWNER, MANAGER, STAFF
  status?: string;        // Optional - ACTIVE, INACTIVE, PENDING
  startDate?: string;     // Optional - ISO date string
  endDate?: string;       // Optional - ISO date string
  notes?: string;         // Optional - Additional notes
}
```

### AssignUserToSalonDto
```typescript
{
  userUuid: string;       // Required - User UUID
  role: string;           // Required - OWNER, MANAGER, STAFF
  startDate?: string;     // Optional - ISO date string
  notes?: string;         // Optional - Additional notes
}
```

## User Roles in Salons

### OWNER
- Full control over the salon
- Can manage all users, services, and settings
- Can assign/remove managers and staff
- Business owner or primary stakeholder

### MANAGER
- Day-to-day operational control
- Can manage staff and services
- Reports to owners
- Handles scheduling and customer management

### STAFF
- Service providers (stylists, technicians, etc.)
- Limited access to their own schedule and client information
- Cannot manage other users or salon settings

## Database Tables

### `salons` Table
- `uuid` (PRIMARY KEY)
- `salon_name`
- `description`
- `salon_address`
- `phone_number`
- `email_address` (UNIQUE)
- `business_hours` (JSON)
- `website_url`
- `logo_url`
- `status`
- `created_at`
- `updated_at`

### `user_salons` Table
- `uuid` (PRIMARY KEY)
- `user_uuid` (FOREIGN KEY → users.uuid)
- `salon_uuid` (FOREIGN KEY → salons.uuid)
- `salon_role` (OWNER/MANAGER/STAFF)
- `status` (ACTIVE/INACTIVE/PENDING)
- `start_date`
- `end_date`
- `notes`
- `created_at`
- `updated_at`

## Use Cases

### Example 1: Find who owns a salon
```bash
GET /user-salons/salon/SALON_UUID/owners
```

### Example 2: Find all salons where a user works
```bash
GET /user-salons/user/USER_UUID/salons
```

### Example 3: Assign a user as staff to a salon
```bash
POST /user-salons/salon/SALON_UUID/assign-user
{
  "userUuid": "USER_UUID",
  "role": "STAFF",
  "startDate": "2024-01-15",
  "notes": "Senior stylist specializing in color"
}
```

### Example 4: Promote staff to manager
```bash
PATCH /user-salons/RELATIONSHIP_UUID
{
  "role": "MANAGER",
  "notes": "Promoted to manager position"
}
```

## Features
- ✅ Complete salon CRUD operations
- ✅ User-salon relationship management
- ✅ Role-based access (Owner/Manager/Staff)
- ✅ Employment tracking (start/end dates)
- ✅ JWT authentication required
- ✅ Search and filtering capabilities
- ✅ Comprehensive API documentation
- ✅ TypeScript strict mode compliance
- ✅ Snake_case database columns
- ✅ UUID primary keys
- ✅ Automatic timestamps
- ✅ Relationship validation
