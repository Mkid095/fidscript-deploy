// Local alias mirroring @fidscript-deploy/sdk's Bucket type.
// Kept as a single source-of-truth so storage components can import
// `Bucket` from a sibling path without coupling to a deep SDK path.
export interface Bucket {
  id: string;
  name: string;
  provider: string;
  status: string;
  createdAt: string;
}