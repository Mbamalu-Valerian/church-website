import assert from 'node:assert/strict';
import test from 'node:test';
import { driveFileIdFromLink, driveViewerUrl, isValidDriveId } from './google-drive.js';

const fileId = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';

test('extracts Drive file IDs from share links', () => {
  assert.equal(driveFileIdFromLink(`https://drive.google.com/file/d/${fileId}/view?usp=sharing`), fileId);
  assert.equal(driveFileIdFromLink(`https://drive.google.com/open?id=${fileId}`), fileId);
  assert.equal(driveFileIdFromLink(fileId), fileId);
  assert.equal(driveFileIdFromLink(`https://drive.google.com/drive/folders/${fileId}`), null);
  assert.equal(driveFileIdFromLink(`https://example.com/file/d/${fileId}`), null);
  assert.equal(isValidDriveId('unsafe/id'), false);
});

test('creates a canonical Drive viewer URL', () => {
  assert.equal(driveViewerUrl(fileId), `https://drive.google.com/file/d/${fileId}/view`);
  assert.equal(driveViewerUrl('invalid'), null);
});
