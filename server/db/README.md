# Database Setup

This directory contains the PostgreSQL database schema and migration scripts for the Weather App.

## Schema Overview

### Tables

1. **users**
   - `id` (UUID, Primary Key)
   - `email` (CITEXT, Unique) - Case-insensitive email storage
   - `password_hash` (TEXT) - Argon2id hashed password
   - `created_at`, `updated_at` (Timestamps)

2. **locations**
   - `id` (UUID, Primary Key)
   - `external_id` (TEXT, Unique) - Weather provider's location ID
   - `name`, `region`, `country` (TEXT)
   - `latitude`, `longitude` (DECIMAL)
   - `timezone` (TEXT)
   - `created_at`, `updated_at` (Timestamps)

3. **saved_locations**
   - `id` (UUID, Primary Key)
   - `user_id` (UUID, Foreign Key → users)
   - `location_id` (UUID, Foreign Key → locations)
   - `sort_key` (BIGINT) - For gapped ordering
   - `created_at`, `updated_at` (Timestamps)
   - **Unique constraint**: (user_id, location_id) - Prevents duplicate saves

## Setup Instructions

### Prerequisites

- PostgreSQL installed and running
- Default postgres user accessible

### Step 1: Configure Environment

Copy `.env.example` to `.env` and update with your PostgreSQL credentials:

```bash
cp .env.example .env
```

Default values:
- DB_NAME: `weather_app`
- DB_USER: `postgres`
- DB_PASSWORD: `postgres`
- DB_HOST: `localhost`
- DB_PORT: `5432`

### Step 2: Install Dependencies

From the server directory:

```bash
npm install
```

### Step 3: Create Database and Run Migrations

Run the complete setup:

```bash
npm run db:setup
```

Or run steps individually:

```bash
# Create the database
npm run db:create

# Run migrations
npm run db:migrate
```

## Migration Files

Migrations are executed in order:

1. `001_create_users_table.sql` - Creates users table with CITEXT extension
2. `002_create_locations_table.sql` - Creates locations table
3. `003_create_saved_locations_table.sql` - Creates saved_locations with foreign keys

## Database Features

- **Auto-updating timestamps**: Triggers automatically update `updated_at` fields
- **UUID primary keys**: All tables use UUIDs for better scalability
- **Cascade deletes**: Deleting a user removes their saved locations
- **Indexes**: Optimized for common query patterns
- **Case-insensitive emails**: Uses CITEXT extension for email storage

## Verify Setup

Connect to the database:

```bash
psql -U postgres -d weather_app
```

List tables:

```sql
\dt
```

You should see: `users`, `locations`, `saved_locations`

View schema:

```sql
\d users
\d locations
\d saved_locations
```
