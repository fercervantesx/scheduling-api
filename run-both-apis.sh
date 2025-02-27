#!/bin/bash

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
