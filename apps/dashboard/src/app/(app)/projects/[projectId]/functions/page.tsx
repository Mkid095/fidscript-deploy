// Wrapper: the project shell at /projects/[id] has already chosen the project.
// Rendering the top-level /functions page here is enough — that page reads
// `useShellProjectId()` and hides its own project picker when the shell chose.
export { default } from '@/app/(app)/functions/page';
