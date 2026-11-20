import {
  BlobSASPermissions,
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Object storage for photos, videos and PDFs. Files go straight from the browser
// to storage using short-lived signed URLs; SQLite only keeps the metadata.
// Provider priority:
// 1. Supabase Storage (if configured)
// 2. Azure Blob Storage (if configured)
// 3. Cloudflare R2 (if configured)
// 4. Local Host Persistent Disk Storage (Default: zero configuration required!)

function parseConnectionString(value) {
  const parts = Object.fromEntries(
    value.split(';').filter(Boolean).map((part) => {
      const index = part.indexOf('=');
      return [part.slice(0, index), part.slice(index + 1)];
    }),
  );
  return { accountName: parts.AccountName, accountKey: parts.AccountKey };
}

export function createLocalStorage({ baseDir, baseUrl = '', secret = 'dominus-local-storage-secret' }) {
  fs.mkdirSync(baseDir, { recursive: true });

  const sign = (key, expires) =>
    createHmac('sha256', secret).update(`${key}:${expires}`).digest('base64url');

  const safeResolve = (key) => {
    const cleanKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, '');
    const resolved = path.resolve(baseDir, cleanKey);
    const root = path.resolve(baseDir);
    if (!resolved.startsWith(root)) throw new Error('Invalid storage key');
    return resolved;
  };

  return {
    provider: 'local',
    label: 'Host Persistent Disk Storage',
    baseDir,
    async uploadUrl(key, contentType, seconds = 900) {
      const expires = Date.now() + seconds * 1000;
      const sig = sign(key, expires);
      const url = `${baseUrl}/api/storage/local-upload?key=${encodeURIComponent(key)}&expires=${expires}&sig=${sig}`;
      return {
        uploadUrl: url,
        uploadHeaders: { 'Content-Type': contentType },
      };
    },
    async downloadUrl(key, seconds = 3600) {
      const expires = Date.now() + seconds * 1000;
      const sig = sign(key, expires);
      return `${baseUrl}/api/public/storage/local-media?key=${encodeURIComponent(key)}&expires=${expires}&sig=${sig}`;
    },
    async size(key) {
      try {
        const filePath = safeResolve(key);
        const stat = await fs.promises.stat(filePath);
        return Number(stat.size);
      } catch {
        return 0;
      }
    },
    async remove(key) {
      try {
        const filePath = safeResolve(key);
        await fs.promises.rm(filePath, { force: true });
      } catch {
        // ignore deletion errors if file does not exist
      }
    },
    verify(key, expires, sig) {
      if (!key || !expires || !sig) return false;
      const numExpires = Number(expires);
      if (!Number.isFinite(numExpires) || Date.now() > numExpires) return false;
      const expected = sign(key, expires);
      try {
        return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
      } catch {
        return false;
      }
    },
    resolvePath(key) {
      return safeResolve(key);
    },
  };
}

export function createSupabaseStorage({ url, serviceKey, bucket = 'dominus-media' }) {
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const cleanUrl = url.replace(/\/+$/, '');
  return {
    provider: 'supabase',
    label: 'Supabase Storage',
    async uploadUrl(key, contentType, seconds = 900) {
      const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(key);
      if (error) throw error;
      const fullUrl = data.signedUrl.startsWith('http')
        ? data.signedUrl
        : `${cleanUrl}/storage/v1${data.signedUrl.startsWith('/') ? '' : '/'}${data.signedUrl}`;
      return {
        uploadUrl: fullUrl,
        uploadHeaders: { 'Content-Type': contentType },
      };
    },
    async downloadUrl(key, seconds = 3600) {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, seconds);
      if (error) throw error;
      return data.signedUrl;
    },
    async size(key) {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, 60);
      if (error) throw error;
      const head = await fetch(data.signedUrl, { method: 'HEAD' });
      const length = head.headers.get('content-length');
      return Number(length || 0);
    },
    async remove(key) {
      const { error } = await supabase.storage.from(bucket).remove([key]);
      if (error) throw error;
    },
  };
}

export function createSupabaseS3Storage({ endpoint, accessKeyId, secretAccessKey, bucket = 'dominus-media', region = 'us-east-1' }) {
  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
  return {
    provider: 'supabase-s3',
    label: 'Supabase Storage (S3 API)',
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

export function createStorageFromEnv(env = process.env, options = {}) {
  // If explicitly requested or no cloud provider configured, use Host Persistent Disk Storage
  if (env.STORAGE_PROVIDER === 'local') {
    return createLocalStorage({
      baseDir: options.baseDir || path.resolve('server/data/uploads'),
      baseUrl: options.baseUrl || '',
      secret: options.secret || env.SESSION_SECRET || 'local-storage-secret',
    });
  }

  // 1. Supabase Storage (URL + Service Role Key, or S3 API)
  const supabaseBucket = env.SUPABASE_STORAGE_BUCKET || env.SUPABASE_BUCKET || 'dominus-media';
  if (env.SUPABASE_S3_ACCESS_KEY_ID && env.SUPABASE_S3_SECRET_ACCESS_KEY) {
    const endpoint = env.SUPABASE_S3_ENDPOINT || (env.SUPABASE_URL ? `${env.SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/s3` : '');
    if (endpoint) {
      return createSupabaseS3Storage({
        endpoint,
        accessKeyId: env.SUPABASE_S3_ACCESS_KEY_ID,
        secretAccessKey: env.SUPABASE_S3_SECRET_ACCESS_KEY,
        bucket: supabaseBucket,
        region: env.SUPABASE_S3_REGION || 'us-east-1',
      });
    }
  }
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    return createSupabaseStorage({
      url: env.SUPABASE_URL,
      serviceKey: env.SUPABASE_SERVICE_ROLE_KEY,
      bucket: supabaseBucket,
    });
  }

  // 2. Azure Blob Storage
  const azureContainer = env.AZURE_STORAGE_CONTAINER || 'dominus-media';
  if (env.AZURE_STORAGE_CONNECTION_STRING) {
    const { accountName, accountKey } = parseConnectionString(env.AZURE_STORAGE_CONNECTION_STRING);
    if (accountName && accountKey) return createAzureStorage({ accountName, accountKey, container: azureContainer, endpoint: env.AZURE_STORAGE_ENDPOINT });
  }
  if (env.AZURE_STORAGE_ACCOUNT_NAME && env.AZURE_STORAGE_ACCOUNT_KEY) {
    return createAzureStorage({ accountName: env.AZURE_STORAGE_ACCOUNT_NAME, accountKey: env.AZURE_STORAGE_ACCOUNT_KEY, container: azureContainer, endpoint: env.AZURE_STORAGE_ENDPOINT });
  }

  // 3. Cloudflare R2
  if (['R2_ACCOUNT_ID', 'R2_BUCKET_NAME', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'].every((key) => Boolean(env[key]))) {
    return createR2Storage({
      accountId: env.R2_ACCOUNT_ID,
      bucket: env.R2_BUCKET_NAME,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    });
  }

  // Default: Host Persistent Disk Storage (zero setup required!)
  return createLocalStorage({
    baseDir: options.baseDir || path.resolve('server/data/uploads'),
    baseUrl: options.baseUrl || '',
    secret: options.secret || env.SESSION_SECRET || 'local-storage-secret',
  });
}

export const storageNotConfiguredMessage = 'Media storage is not configured.';
