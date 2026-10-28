DO $runtime_grants$
DECLARE item record;
BEGIN
  IF current_user <> 'mvbooking_migrator' AND NOT EXISTS (SELECT FROM pg_roles WHERE rolname = current_user AND rolsuper) THEN
    RAISE EXCEPTION 'Only the migrator or administrator can grant application access';
  END IF;
  REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, mvbooking_runtime;
  REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, mvbooking_runtime;
  -- New tables default to no runtime access until this post-migration step succeeds.
  ALTER DEFAULT PRIVILEGES FOR ROLE mvbooking_migrator IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, mvbooking_runtime;
  ALTER DEFAULT PRIVILEGES FOR ROLE mvbooking_migrator IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, mvbooking_runtime;
  FOR item IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO mvbooking_runtime', item.tablename);
  END LOOP;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mvbooking_runtime;
END
$runtime_grants$;
