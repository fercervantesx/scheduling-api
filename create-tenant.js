const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Demo Salon',
        subdomain: 'demo',
        status: 'ACTIVE',
        plan: 'PRO',
        features: { 
          locations: true, 
          employees: true, 
          services: true,
          customBranding: true,
          apiAccess: true,
          webhooks: true,
          multipleLocations: true,
          analytics: true
        },
      }
    });
    
    console.log('Created tenant:', tenant);
  } catch (error) {
    console.error('Error creating tenant:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
