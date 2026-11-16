/**
 * The name of a deployment's container — in one place.
 *
 * The name is the container's DNS identity: Traefik's file provider points
 * at it by name, and Docker's resolver only answers names up to 63
 * characters. A full UUID after the slug blows past that, and the route
 * 502s with a name it cannot resolve — so the deployment's id is shortened
 * to its first eight characters, which is what the rollback and cleanup
 * code matches on too.
 */
export function deploymentContainerName(
  projectSlug: string,
  deploymentId: string,
): string {
  return `fidscript-${projectSlug}-${deploymentId.slice(0, 8)}`;
}
