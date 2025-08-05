// Salon seeding data
export const seedSalons = [
  {
    name: 'EZ Salon Downtown',
    description: 'Premium salon in the heart of downtown',
    address: '123 Main Street, Downtown, City 12345',
    phone: '+1-555-0101',
    email: 'downtown@ezsalon.com',
    status: 'ACTIVED',
  },
  {
    name: 'EZ Salon Uptown',
    description: 'Modern salon serving the uptown area',
    address: '456 Oak Avenue, Uptown, City 12346',
    phone: '+1-555-0102',
    email: 'uptown@ezsalon.com',
    status: 'ACTIVED',
  },
  {
    name: 'EZ Salon Westside',
    description: 'Full-service salon on the west side',
    address: '789 Pine Road, Westside, City 12347',
    phone: '+1-555-0103',
    email: 'westside@ezsalon.com',
    status: 'ACTIVED',
  },
];

// User-Salon assignments
export const seedUserSalonAssignments = [
  // Admin has access to all salons with admin role
  {
    userEmail: 'admin@ezsalon.com',
    salonName: 'EZ Salon Downtown',
    roleName: 'admin',
    status: 'ACTIVE',
  },
  {
    userEmail: 'admin@ezsalon.com',
    salonName: 'EZ Salon Uptown',
    roleName: 'admin',
    status: 'ACTIVE',
  },
  {
    userEmail: 'admin@ezsalon.com',
    salonName: 'EZ Salon Westside',
    roleName: 'admin',
    status: 'ACTIVE',
  },

  // Owner owns Downtown salon
  {
    userEmail: 'owner@ezsalon.com',
    salonName: 'EZ Salon Downtown',
    roleName: 'owner',
    status: 'ACTIVE',
  },

  // Manager manages Downtown salon
  {
    userEmail: 'manager@ezsalon.com',
    salonName: 'EZ Salon Downtown',
    roleName: 'manager',
    status: 'ACTIVE',
  },

  // Staff work at different salons
  {
    userEmail: 'staff1@ezsalon.com',
    salonName: 'EZ Salon Downtown',
    roleName: 'staff',
    status: 'ACTIVE',
  },
  {
    userEmail: 'staff2@ezsalon.com',
    salonName: 'EZ Salon Uptown',
    roleName: 'staff',
    status: 'ACTIVE',
  },
  {
    userEmail: 'staff3@ezsalon.com',
    salonName: 'EZ Salon Westside',
    roleName: 'staff',
    status: 'ACTIVE',
  },

  // Some staff work at multiple salons
  {
    userEmail: 'staff1@ezsalon.com',
    salonName: 'EZ Salon Uptown',
    roleName: 'staff',
    status: 'ACTIVE',
  },

  // Manager can also be staff at another salon
  {
    userEmail: 'manager@ezsalon.com',
    salonName: 'EZ Salon Uptown',
    roleName: 'staff',
    status: 'ACTIVE',
  },
];
