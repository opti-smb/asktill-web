export interface ReconAnswerSectionApi {
  title: string;
  items: string[];
  ordered?: boolean;
}

interface BigQuestionAnswerFields {
  answer_sections?: ReconAnswerSectionApi[];
  answer_bullets?: string[];
  answer_body?: string;
}

function splitMoneyClauses(gap: string): string[] {
  return gap
    .split(/,\s+(?=(?:and\s+)?\$)/)
    .map((s) => s.replace(/^and\s+/i, '').trim().replace(/\.\s*$/, ''))
    .filter(Boolean);
}

function splitChannelAndTiming(chText: string): { channels: string[]; timing: string[] } {
  const match = chText.match(/^(.+?)(\.\s+(?:June|Last week|Some\b).*)$/s);
  if (!match) {
    return {
      channels: chText
        .split(/;\s*/)
        .map((s) => s.trim().replace(/\.\s*$/, ''))
        .filter(Boolean),
      timing: [],
    };
  }
  const channels = match[1]
    .split(/;\s*/)
    .map((s) => s.trim().replace(/\.\s*$/, ''))
    .filter(Boolean);
  const timing = match[2]
    .split(/(?<=\.)\s+(?=(?:June|Last week|Some\b))/)
    .map((s) => s.trim().replace(/^\.\s*/, '').replace(/\.\s*$/, ''))
    .filter(Boolean);
  return { channels, timing };
}

/** Turn old single-paragraph API copy into titled bullet lists. */
export function parseLegacyAnswerBody(body: string): ReconAnswerSectionApi[] {
  const text = body.trim();
  if (!text || !/breaks down as/i.test(text)) return [];

  let rest = text;
  let channelBlock = '';
  let netBlock = '';
  let cashBlock = '';

  const channelIdx = rest.indexOf('By channel:');
  if (channelIdx >= 0) {
    channelBlock = rest.slice(channelIdx);
    rest = rest.slice(0, channelIdx).trim();
  }

  const netIdx = rest.indexOf('Net expected to bank');
  if (netIdx >= 0) {
    netBlock = rest.slice(netIdx).trim();
    rest = rest.slice(0, netIdx).trim();
  }

  const cashIdx = rest.indexOf('Additionally,');
  if (cashIdx >= 0) {
    cashBlock = rest.slice(cashIdx).trim();
    rest = rest.slice(0, cashIdx).trim();
  }

  const sections: ReconAnswerSectionApi[] = [];
  const [summaryRaw, gapRaw] = rest.split(/breaks down as:\s*/i);

  if (summaryRaw?.trim()) {
    sections.push({
      title: 'Summary',
      items: [summaryRaw.trim().replace(/\.\s*$/, '')],
    });
  }

  const gapItems = splitMoneyClauses(gapRaw || '');
  if (gapItems.length) {
    sections.push({
      title: 'What explains the gap',
      items: gapItems,
      ordered: true,
    });
  }

  if (cashBlock) {
    sections.push({
      title: 'Cash at register (separate)',
      items: [cashBlock.replace(/^Additionally,\s*/i, '').trim().replace(/\.\s*$/, '')],
    });
  }

  if (netBlock) {
    sections.push({
      title: 'Still settling',
      items: [netBlock.replace(/\.\s*$/, '')],
    });
  }

  if (channelBlock) {
    const chText = channelBlock.replace(/^By channel:\s*/i, '').trim();
    const { channels, timing } = splitChannelAndTiming(chText);
    if (channels.length) {
      sections.push({ title: 'By channel', items: channels });
    }
    if (timing.length) {
      sections.push({ title: 'Upcoming deposits & timing', items: timing });
    }
  }

  return sections;
}

/** Prefer grouped sections; parse legacy paragraph if the API is stale. */
export function getReconAnswerSections(
  bq: BigQuestionAnswerFields | null | undefined,
): ReconAnswerSectionApi[] {
  if (!bq) return [];
  if (bq.answer_sections?.length) return bq.answer_sections;
  if (bq.answer_bullets?.length) {
    return [{ title: 'Breakdown', items: bq.answer_bullets }];
  }
  if (bq.answer_body?.trim()) {
    const parsed = parseLegacyAnswerBody(bq.answer_body);
    if (parsed.length) return parsed;
  }
  return [];
}
