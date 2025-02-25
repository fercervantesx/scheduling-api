#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Generating Prisma client..."
npx prisma generate

echo "Seeding database..."
# Looking for the seed script in several possible locations
if [ -f "dist/prisma/seed.js" ]; then
  echo "Using compiled seed.js"
  node dist/prisma/seed.js
elif [ -f "prisma/seed.js" ]; then
  echo "Using prisma/seed.js"
  node prisma/seed.js
elif [ -f "prisma/seed.ts" ]; then
  echo "Using ts-node to run seed.ts"
  npx ts-node prisma/seed.ts
else
  echo "No seed file found"
fi

echo "Database setup complete"