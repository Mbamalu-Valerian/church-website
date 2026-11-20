import assert from 'node:assert/strict';
import test from 'node:test';
import { createAzureStorage, createStorageFromEnv } from './storage.js';

const key = Buffer.from('test-account-key-for-sas-signing-only').toString('base64');

test('storage is not configured without credentials', () => {
  assert.equal(createStorageFromEnv({}), null);
});

test('Supabase storage is selected when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set', () => {
  const storage = createStorageFromEnv({
    SUPABASE_URL: 'https://xyzcompany.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'mock-service-role-key',
  });
  assert.equal(storage.provider, 'supabase');
  assert.equal(storage.label, 'Supabase Storage');
});

test('Supabase S3 storage is selected when S3 access keys are provided', async () => {
  const storage = createStorageFromEnv({
    SUPABASE_S3_ACCESS_KEY_ID: 'supabase-access-key-id',
    SUPABASE_S3_SECRET_ACCESS_KEY: 'supabase-secret-access-key',
    SUPABASE_S3_ENDPOINT: 'https://xyzcompany.supabase.co/storage/v1/s3',
  });
  assert.equal(storage.provider, 'supabase-s3');
  const upload = await storage.uploadUrl('gallery/2026/test.jpg', 'image/jpeg');
  assert(upload.uploadUrl.includes('https://xyzcompany.supabase.co/storage/v1/s3/dominus-media/gallery/2026/test.jpg'));
});

test('Azure Blob storage is selected from a connection string and signs short-lived URLs', async () => {
  const storage = createStorageFromEnv({
    AZURE_STORAGE_CONNECTION_STRING: `DefaultEndpointsProtocol=https;AccountName=parishstore;AccountKey=${key};EndpointSuffix=core.windows.net`,
    AZURE_STORAGE_CONTAINER: 'dominus-media',
  });
  assert.equal(storage.provider, 'azure');
  const azure = createAzureStorage({ accountName: 'parishstore', accountKey: key, container: 'dominus-media' });
  azure.uploadUrl = azure.uploadUrl.bind(azure);
  const read = new URL(await azure.downloadUrl('gallery/2026-01-01/photo.jpg', 600));
  assert.equal(read.origin, 'https://parishstore.blob.core.windows.net');
  assert.equal(read.pathname, '/dominus-media/gallery/2026-01-01/photo.jpg');
  assert.equal(read.searchParams.get('sp'), 'r', 'downloads are read-only');
  assert(read.searchParams.get('sig'), 'downloads are signed');
  assert(new Date(read.searchParams.get('se')).getTime() > Date.now(), 'signature expires in the future');
});

test('R2 remains available as a fallback provider', () => {
  const storage = createStorageFromEnv({ R2_ACCOUNT_ID: 'a', R2_BUCKET_NAME: 'b', R2_ACCESS_KEY_ID: 'c', R2_SECRET_ACCESS_KEY: 'd' });
  assert.equal(storage.provider, 'r2');
});
