import { PrismaClient } from '@prisma/client';
import type { Schedule } from '../tests/types/models';

const prisma = new PrismaClient();

async function main() {
  // Create services
  const services = await Promise.all([
    prisma.service.create({
      data: {
        name: 'Haircut',
        duration: 30, // 30 minutes
      },
    }),
    prisma.service.create({
      data: {
        name: 'Hair Coloring',
        duration: 120, // 2 hours
      },
    }),
    prisma.service.create({
      data: {
        name: 'Manicure',
        duration: 45, // 45 minutes
      },
    }),
  ]);

  console.log('Created services:', services);

  // Create a location first
  const location = await prisma.location.create({
    data: {
      name: 'Downtown Salon',
      address: '123 Main St',
    },
  });

  console.log('Created location:', location);

  // Create employees
  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        name: 'John Smith',
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
    const johnSchedule = await prisma.schedule.create({
      data: {
        employeeId: employees[0].id,
        locationId: location.id,
        startTime: new Date(currentDate.setHours(9, 0, 0, 0)), // 9 AM
        endTime: new Date(currentDate.setHours(17, 0, 0, 0)), // 5 PM
        blockType: 'WORKING_HOURS',
      },
    });
    schedules.push(johnSchedule);

    // Create schedule for Sarah Johnson
    const sarahSchedule = await prisma.schedule.create({
      data: {
        employeeId: employees[1].id,
        locationId: location.id,
        startTime: new Date(currentDate.setHours(10, 0, 0, 0)), // 10 AM
        endTime: new Date(currentDate.setHours(18, 0, 0, 0)), // 6 PM
        blockType: 'WORKING_HOURS',
      },
    });
    schedules.push(sarahSchedule);
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