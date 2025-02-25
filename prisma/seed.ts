import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a tenant first
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Salon',
      subdomain: 'demo',
      features: {}, // Empty JSON object
    },
  });

  console.log('Created tenant:', tenant);

  // Create services
  const services = await Promise.all([
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

  // Create a location first
  const location = await prisma.location.create({
    data: {
      name: 'Downtown Salon',
      address: '123 Main St',
      tenant: {
        connect: { id: tenant.id },
      },
    },
  });

  console.log('Created location:', location);

  // Create employees
  const employees = await Promise.all([
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

  // Create schedules for the next 7 days
  const schedules = [];
  const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  // Create standard weekly schedule template instead of date-specific entries
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

  // Create a second tenant
  const tenant2 = await prisma.tenant.create({
    data: {
      name: 'Itinari Travel',
      subdomain: 'itinaritravel',
      features: {}, // Empty JSON object
    },
  });

  console.log('Created second tenant:', tenant2);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });