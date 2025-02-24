import { PrismaClient } from '@prisma/client';
import type { Schedule } from '../tests/types/models';

const prisma = new PrismaClient();

async function main() {
  // Create a tenant first
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Salon',
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
  const startDate = new Date();
  const schedules: Schedule[] = [];

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    // Create schedule for John Smith
    const johnStartTime = new Date(currentDate);
    johnStartTime.setHours(9, 0, 0, 0);
    const johnEndTime = new Date(currentDate);
    johnEndTime.setHours(17, 0, 0, 0);

    const johnSchedule = await prisma.schedule.create({
      data: {
        employeeId: employees[0].id,
        locationId: location.id,
        tenantId: tenant.id,
        startTime: johnStartTime.toISOString(),
        endTime: johnEndTime.toISOString(),
        blockType: 'WORKING_HOURS',
        weekday: currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
      },
    });

    schedules.push({
      ...johnSchedule,
      startTime: new Date(johnSchedule.startTime),
      endTime: new Date(johnSchedule.endTime),
    });

    // Create schedule for Sarah Johnson
    const sarahStartTime = new Date(currentDate);
    sarahStartTime.setHours(10, 0, 0, 0);
    const sarahEndTime = new Date(currentDate);
    sarahEndTime.setHours(18, 0, 0, 0);

    const sarahSchedule = await prisma.schedule.create({
      data: {
        employeeId: employees[1].id,
        locationId: location.id,
        tenantId: tenant.id,
        startTime: sarahStartTime.toISOString(),
        endTime: sarahEndTime.toISOString(),
        blockType: 'WORKING_HOURS',
        weekday: currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
      },
    });

    schedules.push({
      ...sarahSchedule,
      startTime: new Date(sarahSchedule.startTime),
      endTime: new Date(sarahSchedule.endTime),
    });
  }

  console.log('Created schedules:', schedules);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 