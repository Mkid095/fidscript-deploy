import type { FidscriptSDK } from '@fidscript-deploy/sdk';

/**
 * Put an uploaded archive into a project's storage.
 *
 * The archive is what a deployment without a repository is built from, so it
 * has to land in the project's own bucket before the build starts.
 */
export async function uploadArchive(
  sdk: FidscriptSDK,
  projectId: string,
  file: File,
  bucketName = 'deploys',
): Promise<{ bucketId: string; objectKey: string }> {
  const buckets = await sdk.storage.listBuckets(projectId);
  let bucket = (buckets ?? []).find(b => b.name === bucketName);
  if (!bucket) {
    bucket = await sdk.storage.createBucket(projectId, bucketName, 'internal');
  }

  const objectKey = `deploys/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  await sdk.storage.uploadFile(projectId, bucket.id, file, file.name, {
    contentType: file.type || 'application/octet-stream',
    key: objectKey,
  });

  return { bucketId: bucket.id, objectKey };
}
