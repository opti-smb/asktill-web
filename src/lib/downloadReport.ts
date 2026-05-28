export function saveBlobDownload(data: Blob, filename: string) {
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function filenameFromDisposition(header: string | undefined, fallback: string) {
  if (!header) return fallback;
  const match = /filename="?([^";\n]+)"?/i.exec(header);
  return match?.[1] || fallback;
}
