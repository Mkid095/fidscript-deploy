import type { DocPage } from './types';

export const storage: DocPage = {
  slug: 'storage',
  title: 'Storage',
  description: 'The buckets a project holds, and the files in them.',
  group: 'Platform',
  blocks: [
    {
      paragraphs: [
        'A project may hold buckets — object storage for the files it serves or keeps.',
        'The application’s own files, the ones a user uploads, belong in the project’s backend, where the permissions are enforced. This is the raw store, for the cases where you want exactly that.',
      ],
    },
    {
      heading: 'Buckets and files',
      list: [
        'A bucket is made, and the files are put in it.',
        'A file can be fetched, or given a signed address that works for a while.',
        'A file can be given a public address, when it is meant to be public.',
      ],
    },
    {
      heading: 'Signed addresses',
      paragraphs: [
        'A signed address points at a file for a while and then stops working. It is what an upload or a download uses, so the address never has to carry a credential.',
      ],
      code: [
        {
          label: 'The API',
          code: `GET  /api/v1/projects/:id/storage/buckets
GET  /api/v1/projects/:id/storage/buckets/:bucketId/files
POST /api/v1/projects/:id/storage/buckets/:bucketId/files
POST /api/v1/projects/:id/storage/buckets/:bucketId/presign`,
        },
      ],
    },
    {
      heading: 'The app runtime',
      paragraphs: [
        'The registry that holds the built images of your deployments is a different thing, and it is not yours to use. It is the platform’s, and it has no screen of its own — only its health.',
      ],
    },
  ],
};
