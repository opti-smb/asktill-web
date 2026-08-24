import type { ReactNode } from 'react';

const SECTION_RE = /^(\d+[A-Z]?)\.\s+(.+)$/;
const SUBHEAD_RE = /^[A-Z][A-Za-z,&' -]{4,90}$/;

function isListItem(line: string): boolean {
  return line.endsWith(';') || line.endsWith(' and');
}

function formatTitle(line: string): string {
  if (!line.startsWith('ASKTILL ')) return line;
  return line
    .slice('ASKTILL '.length)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function linkifyEmails(text: string): ReactNode[] {
  const parts = text.split(/(support@asktill\.com)/g);
  return parts.map((part, i) =>
    part === 'support@asktill.com' ? (
      <a key={i} href={`mailto:${part}`}>
        {part}
      </a>
    ) : (
      part
    ),
  );
}

export function formatPolicyBody(
  body: string,
  styles: Record<string, string>,
): ReactNode[] {
  const lines = body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (i === 0 && line.startsWith('ASKTILL ')) {
      nodes.push(
        <h1 key={key++} className={styles.docTitle}>
          {formatTitle(line)}
        </h1>,
      );
      i += 1;
      continue;
    }

    if (line.startsWith('Last Updated:')) {
      nodes.push(
        <p key={key++} className={styles.updated}>
          {line}
        </p>,
      );
      i += 1;
      continue;
    }

    const section = SECTION_RE.exec(line);
    if (section) {
      nodes.push(
        <h2 key={key++} className={styles.section}>
          {line}
        </h2>,
      );
      i += 1;
      continue;
    }

    if (
      SUBHEAD_RE.test(line) &&
      i > 2 &&
      !line.includes('.') &&
      lines[i + 1] &&
      !SECTION_RE.test(lines[i + 1])
    ) {
      nodes.push(
        <h3 key={key++} className={styles.subsection}>
          {line}
        </h3>,
      );
      i += 1;
      continue;
    }

    if (line.endsWith(':') && i + 1 < lines.length && isListItem(lines[i + 1])) {
      const intro = line;
      const items: string[] = [];
      i += 1;
      while (i < lines.length && isListItem(lines[i]) && !SECTION_RE.test(lines[i])) {
        items.push(lines[i]);
        i += 1;
      }
      nodes.push(
        <div key={key++} className={styles.listBlock}>
          <p>{linkifyEmails(intro)}</p>
          <ul>
            {items.map((item) => (
              <li key={item}>{linkifyEmails(item)}</li>
            ))}
          </ul>
        </div>,
      );
      continue;
    }

    const paraClass =
      line === line.toUpperCase() && line.length > 40 ? styles.legalCaps : styles.paragraph;

    nodes.push(
      <p key={key++} className={paraClass}>
        {linkifyEmails(line)}
      </p>,
    );
    i += 1;
  }

  return nodes;
}
