#!/bin/bash
echo "Waiting for postgres to be ready..."
while ! pg_isready -h localhost -p 5432 -U postgres; do
  sleep 2
done
echo "Postgres is up! Seeding data..."
cd scripts
DATABASE_URL="postgresql://postgres:password@localhost:5432/mediahub" pnpm run seed
echo "Seeding completed successfully!"
