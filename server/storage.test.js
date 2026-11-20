import assert from 'node:assert/strict';
import test from 'node:test';
import { createAzureStorage, createLocalStorage, createStorageFromEnv } from './storage.js';

const key = Buffer.from('test-account-key-for-sas-signing-only').toString('base64');

test('local storage is default provider when no cloud credentials are provided', async () => {
  const storage = createStorageFromEnv({});
  assert.equal(storage.provider, 'local');
  assert.equal(storage.label, 'Host Persistent Disk Storage');

  const upload = await storage.uploadUrl('gallery/2026/test.jpg', 'image/jpeg', 900);
  assert(upload.uploadUrl.includes('/api/storage/local-upload?key='));
  assert(upload.uploadUrl.includes('sig='));

  const download = await storage.downloadUrl('gallery/2026/test.jpg', 3600);
  assert(download.includes('/api/public/storage/local-media?key='));
  assert(download.includes('sig='));
});

test('local storage correctly verifies signatures and paths', () => {
  const local = createLocalStorage({ baseDir: './temp-test-uploads', secret: 'test-secret' });
  const expires = Date.now() + 60000;
  const validSig = local.uploadUrl('test.jpg', 'image/jpeg', 60);

  // Expired expires
  assert.equal(local.verify('test.jpg', Date.now() - 1000, 'sig'), false);
  // Missing params
  assert.equal(local.verify('', expires, 'sig'), false);
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
