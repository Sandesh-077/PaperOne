#!/bin/bash
set -e

# Load environment variables from .env.local
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set"
  exit 1
fi

echo "🔗 Connecting to database: ${DATABASE_URL%\?*}..."
echo "📦 Deploying migrations..."

# Deploy migrations
npx prisma migrate deploy

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

echo "✅ Done! All migrations deployed successfully."
