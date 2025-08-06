# Cache Configuration

## Related Cache Clearing Configuration

The cache service now includes a configuration map that defines which related caches should be cleared when an entity is modified. This ensures cache consistency across related entities.

### Current Configuration

```typescript
private readonly relatedCacheMap: Record<string, string[]> = {
  customers: ['customers', 'customer_salons', 'salons'],
  salons: ['salons', 'customer_salons', 'customers'],
  customer_salons: ['customer_salons', 'customers', 'salons'],
  users: ['users'],
  roles: ['roles', 'permissions'],
  permissions: ['permissions', 'roles'],
};
```

### How it Works

When you modify any entity (create, update, delete), the system will automatically clear caches for all related entities:

1. **Customer Changes**: 
   - Clears `customers`, `customer_salons`, and `salons` caches
   - Reason: Customer changes can affect salon relationships and salon data visibility

2. **Salon Changes**: 
   - Clears `salons`, `customer_salons`, and `customers` caches  
   - Reason: Salon changes can affect customer-salon relationships and customer data visibility

3. **Customer-Salon Relationship Changes**:
   - Clears `customer_salons`, `customers`, and `salons` caches
   - Reason: Relationship changes affect both customer and salon data visibility

4. **User Changes**:
   - Clears only `users` caches
   - Reason: Users are independent of customer/salon relationships

5. **Role Changes**:
   - Clears `roles` and `permissions` caches
   - Reason: Role changes can affect permission visibility

6. **Permission Changes**:
   - Clears `permissions` and `roles` caches
   - Reason: Permission changes can affect role visibility

### Usage in Services

All services now use `clearRelatedCaches()` instead of `clearEntityCache()`:

```typescript
// Before
await this.cacheService.clearEntityCache(CUSTOMER_TABLE_NAME);

// After  
await this.cacheService.clearRelatedCaches(CUSTOMER_TABLE_NAME);
```

### Runtime Configuration

You can also modify the configuration at runtime if needed:

```typescript
// Get current configuration
const config = this.cacheService.getRelatedCacheMap();

// Update configuration for a specific table
this.cacheService.setRelatedCacheConfig('customers', ['customers', 'customer_salons']);
```

### Benefits

1. **Automatic Consistency**: No need to manually clear related caches in each service
2. **Centralized Configuration**: All cache relationships are defined in one place
3. **Performance**: Related caches are cleared in parallel using Promise.all()
4. **Flexibility**: Configuration can be modified at runtime if needed
5. **Maintainability**: Easy to add new relationships or modify existing ones

### Example Scenarios

**Scenario 1**: Customer creates a new salon
- Action: Customer record updated (becomes salon owner)
- Caches cleared: `customers`, `customer_salons`, `salons`
- Result: All customer lists, salon lists, and relationship data are refreshed

**Scenario 2**: User assigned new role  
- Action: User record updated with new role
- Caches cleared: `users` only
- Result: User data refreshed, but customer/salon caches remain intact

**Scenario 3**: Customer-salon relationship deleted
- Action: CustomerSalon record deleted
- Caches cleared: `customer_salons`, `customers`, `salons`  
- Result: All related entity lists are refreshed to reflect the relationship change
