-- Run as the database administrator against the intended application database.
-- psql reads passwords from protected process env, never from tracked files/CLI args.
\set ON_ERROR_STOP on
\getenv migrator_password MIGRATOR_DB_PASSWORD
\getenv runtime_password RUNTIME_DB_PASSWORD
SELECT length(:'migrator_password') >= 32 AND length(:'runtime_password') >= 32
  AND :'migrator_password' <> :'runtime_password' AS passwords_ok \gset
\if :passwords_ok
\else
  DO $$ BEGIN RAISE EXCEPTION 'Two distinct passwords of at least 32 characters are required'; END $$;
\endif
BEGIN;
SELECT 'CREATE ROLE mvbooking_migrator LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mvbooking_migrator') \gexec
SELECT 'CREATE ROLE mvbooking_runtime LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mvbooking_runtime') \gexec
ALTER ROLE mvbooking_migrator WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD :'migrator_password';
ALTER ROLE mvbooking_runtime WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD :'runtime_password';
-- NOINHERIT alone would still permit SET ROLE; remove all runtime memberships too.
SELECT format('REVOKE %I FROM mvbooking_runtime', parent.rolname)
FROM pg_auth_members membership JOIN pg_roles parent ON parent.oid = membership.roleid
WHERE membership.member = 'mvbooking_runtime'::regrole \gexec
SELECT format('ALTER DATABASE %I OWNER TO mvbooking_migrator', current_database()) \gexec
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC, mvbooking_runtime', current_database()) \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO mvbooking_runtime', current_database()) \gexec
ALTER SCHEMA public OWNER TO mvbooking_migrator;
REVOKE ALL ON SCHEMA public FROM PUBLIC, mvbooking_runtime;
GRANT USAGE ON SCHEMA public TO mvbooking_runtime;
-- Preinstall the trusted extension, so later releases need no administrator credentials.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
-- Transfer application objects on an existing installation; extension-owned objects stay untouched.
SELECT format('ALTER TABLE public.%I OWNER TO mvbooking_migrator', c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.objid = c.oid AND d.classid = 'pg_class'::regclass AND d.deptype = 'e') \gexec
SELECT format('ALTER SEQUENCE public.%I OWNER TO mvbooking_migrator', c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'S' \gexec
SELECT format('ALTER TYPE public.%I OWNER TO mvbooking_migrator', t.typname)
FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typtype IN ('e', 'd')
  AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.objid = t.oid AND d.classid = 'pg_type'::regclass AND d.deptype = 'e') \gexec
SELECT format('ALTER VIEW public.%I OWNER TO mvbooking_migrator', c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'v'
  AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.objid = c.oid AND d.classid = 'pg_class'::regclass AND d.deptype = 'e') \gexec
SELECT format('ALTER MATERIALIZED VIEW public.%I OWNER TO mvbooking_migrator', c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'm'
  AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.objid = c.oid AND d.classid = 'pg_class'::regclass AND d.deptype = 'e') \gexec
SELECT format('REVOKE CREATE ON SCHEMA %I FROM PUBLIC, mvbooking_runtime', nspname)
FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname <> 'information_schema' \gexec
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_namespace WHERE nspowner = 'mvbooking_runtime'::regrole)
    OR EXISTS (SELECT FROM pg_extension WHERE extowner = 'mvbooking_runtime'::regrole)
    OR EXISTS (SELECT FROM pg_proc WHERE proowner = 'mvbooking_runtime'::regrole) THEN
    RAISE EXCEPTION 'Runtime owns non-table objects; administrator ownership review is required';
  END IF;
END $$;
COMMIT;
-- Run migrations as mvbooking_migrator, followed by grant-runtime-access.sql before starting the app.
