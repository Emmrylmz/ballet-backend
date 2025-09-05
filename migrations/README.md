# Database Migrations

This directory contains database migration scripts for the Ballet Neli Backend.

## Usage

### Automatic Migration Runner

```bash
# Run all pending migrations
node migrations/run_migrations.js
```

### Manual Migration Execution

For Docker PostgreSQL:
```bash
# Execute specific migration
docker exec CONTAINER_ID psql -U postgres -d ballet_neli -f /path/to/migration.sql

# Or copy and run directly:
docker exec CONTAINER_ID psql -U postgres -d ballet_neli -c "SQL_COMMANDS_HERE"
```

## Migration Files

| File | Description | Status |
|------|-------------|--------|
| `001_create_instructor_invitations.sql` | Creates instructor_invitations table with indexes | ✅ Applied |

## Current Database Container

Container ID: `7ca3bf4c4ba5d6e05bde4ca0223ff15ed6b84edc7e775c1874aa3d504ec953a6`

Quick commands:
```bash
# Connect to database
docker exec -it 7ca3bf4c4ba5d6e05bde4ca0223ff15ed6b84edc7e775c1874aa3d504ec953a6 psql -U postgres -d ballet_neli

# Check table structure
docker exec 7ca3bf4c4ba5d6e05bde4ca0223ff15ed6b84edc7e775c1874aa3d504ec953a6 psql -U postgres -d ballet_neli -c "\d instructor_invitations"

# Check applied migrations
docker exec 7ca3bf4c4ba5d6e05bde4ca0223ff15ed6b84edc7e775c1874aa3d504ec953a6 psql -U postgres -d ballet_neli -c "SELECT * FROM migrations ORDER BY id;"
```

## Migration Best Practices

1. **Always use transactions** for complex migrations
2. **Add proper indexes** for performance
3. **Use IF NOT EXISTS** for idempotent migrations
4. **Add comments** explaining the migration purpose
5. **Test migrations** on a copy of production data first
6. **Never modify existing migration files** - create new ones instead

## Rollback Strategy

Currently, rollbacks must be done manually. For each migration, consider creating a corresponding rollback file:

Example: `001_rollback_instructor_invitations.sql`
```sql
-- Rollback: Remove instructor_invitations table
DROP TABLE IF EXISTS instructor_invitations;
```