/**
 * Unit-style checks for pure upload validation helpers.
 * Run with: npx tsx src/lib/uploadFileValidation.test.ts
 */
import { MAX_UPLOAD_BYTES, validateUploadFile } from './uploadFileValidation.ts';

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failed += 1;
    console.error('FAIL', msg);
  } else {
    console.log('ok', msg);
  }
}

async function main() {
  const empty = new File([], 'x.pdf', { type: 'application/pdf' });
  assert((await validateUploadFile(empty)) != null, 'rejects empty file');

  const huge = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], 'big.pdf', {
    type: 'application/pdf',
  });
  assert((await validateUploadFile(huge))?.includes('too large') === true, 'rejects oversized');

  const badExt = new File([new Uint8Array([1, 2, 3])], 'note.exe', { type: 'application/octet-stream' });
  assert((await validateUploadFile(badExt)) != null, 'rejects bad extension');

  const pdfBytes = new TextEncoder().encode('%PDF-1.4\n%âãÏÓ\n');
  const pdf = new File([pdfBytes], 'stmt.pdf', { type: 'application/pdf' });
  assert((await validateUploadFile(pdf)) == null, 'accepts PDF magic');

  if (failed) {
    console.error(`${failed} failed`);
    process.exit(1);
  }
  console.log('uploadFileValidation tests passed');
}

void main();
