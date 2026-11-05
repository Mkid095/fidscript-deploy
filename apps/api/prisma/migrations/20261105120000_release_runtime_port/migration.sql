-- The port the built application actually listens on. The project type's
-- default port is only a guess — a Vite app listens on 4173, Astro on
-- 4321, SvelteKit on 5173 — and Traefik has to route to the real one.
ALTER TABLE "projects"."releases" ADD COLUMN "runtime_port" INTEGER;
