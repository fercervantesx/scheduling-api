import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find or create the first tenant
  let tenant = await prisma.tenant.findUnique({
    where: { subdomain: 'demo' }
  });
  
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Demo Salon',
        subdomain: 'demo',
        features: {}, // Empty JSON object
      },
    });
    console.log('Created tenant:', tenant);
  } else {
    console.log('Using existing tenant:', tenant);
  }

  // Check if services already exist for this tenant
  const existingServices = await prisma.service.findMany({
    where: { tenantId: tenant.id }
  });
  
  let services;
  
  if (existingServices.length === 0) {
    // Create services if none exist
    services = await Promise.all([
      prisma.service.create({
        data: {
          name: 'Haircut',
          duration: 30, // 30 minutes
          tenant: {
            connect: { id: tenant.id },
          },
        },
      }),
      prisma.service.create({
        data: {
          name: 'Hair Coloring',
          duration: 120, // 2 hours
          tenant: {
            connect: { id: tenant.id },
          },
        },
      }),
      prisma.service.create({
        data: {
          name: 'Manicure',
          duration: 45, // 45 minutes
          tenant: {
            connect: { id: tenant.id },
          },
        },
      }),
    ]);
    console.log('Created services:', services);
  } else {
    console.log('Using existing services:', existingServices);
    services = existingServices;
  }

  // Check if location already exists
  let location = await prisma.location.findFirst({
    where: { 
      tenantId: tenant.id,
      name: 'Downtown Salon' 
    }
  });
  
  if (!location) {
    // Create a location
    location = await prisma.location.create({
      data: {
        name: 'Downtown Salon',
        address: '123 Main St',
        tenant: {
          connect: { id: tenant.id },
        },
      },
    });
    console.log('Created location:', location);
  } else {
    console.log('Using existing location:', location);
  }

  // Check if employees already exist
  const existingEmployees = await prisma.employee.findMany({
    where: { tenantId: tenant.id }
  });
  
  let employees;
  
  if (existingEmployees.length === 0) {
    // Create employees if none exist
    employees = await Promise.all([
      prisma.employee.create({
        data: {
          name: 'John Smith',
          tenant: {
            connect: { id: tenant.id },
          },
          locations: {
            create: [
              {
                location: {
                  connect: { id: location.id },
                },
              },
            ],
          },
        },
      }),
      prisma.employee.create({
        data: {
          name: 'Sarah Johnson',
          tenant: {
            connect: { id: tenant.id },
          },
          locations: {
            create: [
              {
                location: {
                  connect: { id: location.id },
                },
              },
            ],
          },
        },
      }),
    ]);
    console.log('Created employees:', employees);
  } else {
    console.log('Using existing employees:', existingEmployees);
    employees = existingEmployees;
  }

  // Check if schedules already exist
  const existingSchedules = await prisma.schedule.findMany({
    where: { tenantId: tenant.id }
  });
  
  if (existingSchedules.length === 0) {
    // Create schedules for the week
    const schedules = [];
    const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

    // Create standard weekly schedule template
    for (const weekday of weekdays) {
      // Create schedule for John Smith
      const johnSchedule = await prisma.schedule.create({
        data: {
          employeeId: employees[0].id,
          locationId: location.id,
          tenantId: tenant.id,
          startTime: "09:00",
          endTime: "17:00",
          blockType: 'WORKING_HOURS',
          weekday: weekday,
        },
      });

      schedules.push(johnSchedule);

      // Create schedule for Sarah Johnson
      const sarahSchedule = await prisma.schedule.create({
        data: {
          employeeId: employees[1].id,
          locationId: location.id,
          tenantId: tenant.id,
          startTime: "10:00",
          endTime: "18:00",
          blockType: 'WORKING_HOURS',
          weekday: weekday,
        },
      });

      schedules.push(sarahSchedule);
    }

    console.log('Created schedules:', schedules);
  } else {
    console.log(`Using existing schedules: Found ${existingSchedules.length} schedules`);
  }

  // Find or create the second tenant
  let tenant2 = await prisma.tenant.findUnique({
    where: { subdomain: 'itinaritravel' }
  });
  
  if (!tenant2) {
    tenant2 = await prisma.tenant.create({
      data: {
        name: 'Itinari Travel',
        subdomain: 'itinaritravel',
        features: {}, // Empty JSON object
      },
    });
    console.log('Created second tenant:', tenant2);
  } else {
    console.log('Using existing second tenant:', tenant2);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });