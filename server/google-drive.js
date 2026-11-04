const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;

export const isValidDriveId = (value) => typeof value === 'string' && DRIVE_ID_PATTERN.test(value);

export const driveFileIdFromLink = (value) => {
  if (typeof value !== 'string') return null;
  const input = value.trim();
  if (isValidDriveId(input)) return input;
  try {
    const url = new URL(input);
    if (!['drive.google.com', 'docs.google.com'].includes(url.hostname)) return null;
    const pathParts = url.pathname.split('/').filter(Boolean);
    const fileIndex = pathParts.findIndex((part) => part === 'd');
    const fileId = url.searchParams.get('id') || (fileIndex >= 0 ? pathParts[fileIndex + 1] : null);
    return isValidDriveId(fileId) ? fileId : null;
  } catch {
    return null;
  }
};

export const driveViewerUrl = (fileId) => (
  isValidDriveId(fileId)
    ? `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`
    : null
);
