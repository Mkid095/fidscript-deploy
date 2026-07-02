// Shared bucket type — mirrors @fidscript/sdk/modules/storage.ts Bucket
export interface Bucket {
  id: string;
  name: string;
  provider: string;
  status: string;
  createdAt: string;
}
