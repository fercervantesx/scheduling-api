const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const expressDir = path.join(__dirname, '../../');
const nestDir = path.join(__dirname, '../');

console.log('=== Express to NestJS Migration Tool ===');
console.log(`Express directory: ${expressDir}`);
console.log(`NestJS directory: ${nestDir}`);

// Check for required environment variables
console.log('\nChecking for environment variables...');
const expressEnvPath = path.join(expressDir, '.env');

if (fs.existsSync(expressEnvPath)) {
  console.log('Found .env file in Express project');
  // Copy .env file to NestJS project
  fs.copyFileSync(expressEnvPath, path.join(nestDir, '.env'));
  console.log('Copied .env file to NestJS project');
} else {
  console.log('No .env file found in Express project');
  console.log('Please ensure the NestJS project has the required environment variables');
}

// Copy Supabase type definitions if they exist
console.log('\nChecking for Supabase type definitions...');
const expressTypesPath = path.join(expressDir, 'src/types');
const nestTypesPath = path.join(nestDir, 'src/types');

if (fs.existsSync(expressTypesPath)) {
  if (!fs.existsSync(nestTypesPath)) {
    fs.mkdirSync(nestTypesPath, { recursive: true });
  }
  
  // Copy Supabase types
  const files = fs.readdirSync(expressTypesPath);
  let typesCopied = false;
  
  for (const file of files) {
    if (file.includes('supabase') || file.endsWith('.d.ts')) {
      fs.copyFileSync(
        path.join(expressTypesPath, file),
        path.join(nestTypesPath, file)
      );
      console.log(`Copied ${file} to NestJS project`);
      typesCopied = true;
    }
  }
  
  if (!typesCopied) {
    console.log('No relevant type definitions found to copy');
  }
} else {
  console.log('No types directory found in Express project');
}

// Create Docker compose file for running both Express and NestJS side by side
console.log('\nCreating dual service docker-compose file...');
const dualComposeContent = `version: '3.8'

services:
  express-api:
    build:
      context: .
    environment:
      - NODE_ENV=development
      - PORT=3000
    ports:
      - "3000:3000"
    volumes:
      - ./:/app
      - /app/node_modules
    command: npm run dev
    networks:
      - app-network

  nestjs-api:
    build:
      context: ./nestjs-api
    environment:
      - NODE_ENV=development
      - PORT=3001
    ports:
      - "3001:3001"
    volumes:
      - ./nestjs-api:/app
      - /app/node_modules
    command: npm run start:dev
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
`;

const dualComposePath = path.join(expressDir, 'docker-compose.dual.yml');
fs.writeFileSync(dualComposePath, dualComposeContent);
console.log(`Created docker-compose.dual.yml in ${expressDir}`);

// Create combined launch script
console.log('\nCreating combined launch script...');
const launchScriptContent = `#!/bin/bash

# Launch both Express and NestJS APIs side by side
# Usage: ./run-both-apis.sh

# Function to stop both services on exit
function cleanup() {
  echo "Stopping services..."
  kill $EXPRESS_PID $NEST_PID 2>/dev/null
  exit
}

# Set trap to call cleanup on exit
trap cleanup EXIT INT TERM

# Start Express API
echo "Starting Express API on port 3000..."
cd "$(dirname "$0")"
npm run dev &
EXPRESS_PID=$!

# Start NestJS API
echo "Starting NestJS API on port 3001..."
cd "$(dirname "$0")/nestjs-api"
npm run start:dev &
NEST_PID=$!

# Wait for both processes
echo "Both APIs are running. Press Ctrl+C to stop."
wait $EXPRESS_PID $NEST_PID
`;

const launchScriptPath = path.join(expressDir, 'run-both-apis.sh');
fs.writeFileSync(launchScriptPath, launchScriptContent);
fs.chmodSync(launchScriptPath, '755');
console.log(`Created run-both-apis.sh in ${expressDir}`);

console.log('\nMigration setup complete!');
console.log('\nYou can now:');
console.log('1. Run both APIs side by side with:');
console.log('   ./run-both-apis.sh');
console.log('2. Or run with Docker Compose:');
console.log('   docker-compose -f docker-compose.dual.yml up');
console.log('\nNestJS API will be available at http://localhost:3001');
console.log('Express API will continue to run at http://localhost:3000');
console.log('\nOnce you\'ve verified that the NestJS API is working correctly,');
console.log('you can gradually migrate your clients to use the new API endpoints.');
console.log('\nNote: If you encounter build errors when starting the NestJS app,');
console.log('      run the following command:');
console.log('      cd nestjs-api && npm install --legacy-peer-deps');