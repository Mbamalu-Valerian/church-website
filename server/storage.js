import {
  BlobSASPermissions,
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Object storage for photos, videos and PDFs. Files go straight from the browser
// to storage using short-lived signed URLs; SQLite only keeps the metadata.
// Provider is picked from the environment: Azure Blob Storage first, then Cloudflare R2.

function parseConnectionString(value) {
  const parts = Object.fromEntries(
    value.split(';').filter(Boolean).map((part) => {
      const index = part.indexOf('=');
      return [part.slice(0, index), part.slice(index + 1)];
    }),
  );
  return { accountName: parts.AccountName, accountKey: parts.AccountKey };
}

export function createAzureStorage({ accountName, accountKey, container, endpoint }) {
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const baseUrl = (endpoint || `https://${accountName}.blob.core.windows.net`).replace(/\/+$/, '');
  const service = new BlobServiceClient(baseUrl, credential);
  const containerClient = service.getContainerClient(container);
  let containerReady = null;
  const ensureContainer = () => {
    containerReady ||= containerClient.createIfNotExists().catch((error) => {
      containerReady = null;
      throw error;
    });
    return containerReady;
  };
  const sasUrl = (key, permissions, seconds) => {
    const startsOn = new Date(Date.now() - 5 * 60 * 1000);
    const expiresOn = new Date(Date.now() + seconds * 1000);
    const sas = generateBlobSASQueryParameters({
      containerName: container,
      blobName: key,
      permissions: BlobSASPermissions.parse(permissions),
      startsOn,
      expiresOn,
    }, credential).toString();
    return `${containerClient.getBlobClient(key).url}?${sas}`;
  };
  return {
    provider: 'azure',
    label: 'Azure Blob Storage',
    async uploadUrl(key, contentType, seconds = 900) {
      await ensureContainer();
      return {
        uploadUrl: sasUrl(key, 'cw', seconds),
        uploadHeaders: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': contentType },
      };
    },
    async downloadUrl(key, seconds = 3600) {
      return sasUrl(key, 'r', seconds);
    },
    async size(key) {
      const properties = await containerClient.getBlobClient(key).getProperties();
      return Number(properties.contentLength);
    },
    async remove(key) {
      await containerClient.getBlobClient(key).deleteIfExists();
    },
  };
}

export function createR2Storage({ accountId, bucket, accessKeyId, secretAccessKey }) {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return {
    provider: 'r2',
    label: 'Cloudflare R2',
    async uploadUrl(key, contentType, seconds = 900) {
      const uploadUrl = await getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn: seconds });
      return { uploadUrl, uploadHeaders: { 'Content-Type': contentType } };
    },
    async downloadUrl(key, seconds = 3600) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: seconds });
    },
    async size(key) {
      const stored = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return Number(stored.ContentLength);
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

export function createStorageFromEnv(env = process.env) {
  const container = env.AZURE_STORAGE_CONTAINER || 'dominus-media';
  if (env.AZURE_STORAGE_CONNECTION_STRING) {
    const { accountName, accountKey } = parseConnectionString(env.AZURE_STORAGE_CONNECTION_STRING);
    if (accountName && accountKey) return createAzureStorage({ accountName, accountKey, container, endpoint: env.AZURE_STORAGE_ENDPOINT });
  }
  if (env.AZURE_STORAGE_ACCOUNT_NAME && env.AZURE_STORAGE_ACCOUNT_KEY) {
    return createAzureStorage({ accountName: env.AZURE_STORAGE_ACCOUNT_NAME, accountKey: env.AZURE_STORAGE_ACCOUNT_KEY, container, endpoint: env.AZURE_STORAGE_ENDPOINT });
  }
  if (['R2_ACCOUNT_ID', 'R2_BUCKET_NAME', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'].every((key) => Boolean(env[key]))) {
    return createR2Storage({
      accountId: env.R2_ACCOUNT_ID,
      bucket: env.R2_BUCKET_NAME,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    });
  }
  return null;
}

export const storageNotConfiguredMessage = 'Media storage is not configured. Set the Azure Blob Storage settings (AZURE_STORAGE_CONNECTION_STRING) in the hosting environment.';
