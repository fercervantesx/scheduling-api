/**
 * This script creates additional data for the second tenant.
 * Run this with: node create-tenant.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find the Itinari Travel tenant
  const tenant = await prisma.tenant.findUnique({
    where: {
      subdomain: 'itinaritravel'
    }
  });

  if (!tenant) {
    console.error('Tenant itinaritravel not found');
    return;
  }

  console.log('Found tenant:', tenant);

  // Create locations for Itinari Travel
  const locations = await Promise.all([
    prisma.location.create({
      data: {
        name: 'Rome Office',
        address: 'Via Veneto 123, Rome, Italy',
        tenant: {
          connect: { id: tenant.id },
        },
      },
    }),
    prisma.location.create({
      data: {
        name: 'Barcelona Office',
        address: 'Rambla de Catalunya 10, Barcelona, Spain',
        tenant: {
          connect: { id: tenant.id },
        },
      },
    }),
  ]);

  console.log('Created locations:', locations);

  // Create services
  const services = await Promise.all([
    prisma.service.create({
      data: {
        name: 'City Tour',
        duration: 180, // 3 hours
        tenant: {
          connect: { id: tenant.id },
        },
      },
    }),
    prisma.service.create({
      data: {
        name: 'Food Experience',
        duration: 240, // 4 hours
        tenant: {
          connect: { id: tenant.id },
        },
      },
    }),
    prisma.service.create({
      data: {
        name: 'Museum Tour',
        duration: 120, // 2 hours
        tenant: {
          connect: { id: tenant.id },
        },
      },
    }),
  ]);

  console.log('Created services:', services);

  // Create employees
  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        name: 'Marco Rossi',
        tenant: {
          connect: { id: tenant.id },
        },
        locations: {
          create: [
            {
              location: {
                connect: { id: locations[0].id }, // Rome Office
              },
            },
          ],
        },
      },
    }),
    prisma.employee.create({
      data: {
        name: 'Elena Bianchi',
        tenant: {
          connect: { id: tenant.id },
        },
        locations: {
          create: [
            {
              location: {
                connect: { id: locations[0].id }, // Rome Office
              },
            },
          ],
        },
      },
    }),
    prisma.employee.create({
      data: {
        name: 'Carlos Mendez',
        tenant: {
          connect: { id: tenant.id },
        },
        locations: {
          create: [
            {
              location: {
                connect: { id: locations[1].id }, // Barcelona Office
              },
            },
          ],
        },
      },
    }),
    prisma.employee.create({
      data: {
        name: 'Sofia Garcia',
        tenant: {
          connect: { id: tenant.id },
        },
        locations: {
          create: [
            {
              location: {
                connect: { id: locations[1].id }, // Barcelona Office
              },
            },
          ],
        },
      },
    }),
  ]);

  console.log('Created employees:', employees);

  // Create schedules for each employee
  const weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const schedules = [];

  // Create schedule for Rome employees (Marco and Elena)
  for (let i = 0; i < 2; i++) {
    const employeeId = employees[i].id;
    
    for (const weekday of weekdays) {
      // Skip Sunday for Rome Office
      if (weekday === 'SUNDAY' && i < 2) continue;
      
      const schedule = await prisma.schedule.create({
        data: {
          employeeId: employeeId,
          locationId: locations[0].id, // Rome Office
          tenantId: tenant.id,
          startTime: "09:00",
          endTime: "18:00",
          blockType: 'WORKING_HOURS',
          weekday: weekday,
        },
      });
      
      schedules.push(schedule);
    }
  }

  // Create schedule for Barcelona employees (Carlos and Sofia)
  for (let i = 2; i < 4; i++) {
    const employeeId = employees[i].id;
    
    for (const weekday of weekdays) {
      // Barcelona office has different hours on weekends
      let startTime = "09:00";
      let endTime = "18:00";
      
      if (weekday === 'SATURDAY' || weekday === 'SUNDAY') {
        startTime = "10:00";
        endTime = "15:00";
      }
      
      const schedule = await prisma.schedule.create({
        data: {
          employeeId: employeeId,
          locationId: locations[1].id, // Barcelona Office
          tenantId: tenant.id,
          startTime: startTime,
          endTime: endTime,
          blockType: 'WORKING_HOURS',
          weekday: weekday,
        },
      });
      
      schedules.push(schedule);
    }
  }

  console.log(`Created ${schedules.length} schedules`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });