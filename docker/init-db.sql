-- Separated database roles (Governance-First pillar)
-- mvp_rw: API application (read-write)
-- mvp_ro: tools, dashboards, debugging (read-only)

-- Create roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mvp_rw') THEN
    CREATE ROLE mvp_rw WITH LOGIN PASSWORD 'mvp_rw';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mvp_ro') THEN
    CREATE ROLE mvp_ro WITH LOGIN PASSWORD 'mvp_ro';
  END IF;
END
$$;

-- Grant permissions on database
GRANT ALL PRIVILEGES ON DATABASE mvp TO mvp_rw;
GRANT CONNECT ON DATABASE mvp TO mvp_ro;

-- Default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mvp_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO mvp_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO mvp_ro;
