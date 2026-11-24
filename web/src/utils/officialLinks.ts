import type { OfficialLink } from '../types/policy';

/** 화면에 걸어도 되는 주소인지: http(s)만. 그 밖(javascript:, data:, 상대 주소, 빈 값)은 버린다 */
export function safeLinkUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** 같은 주소는 한 번만, 안전한 주소만, 최대 max개 */
export function uniqueLinks(links: { label: string; url: unknown }[], max = 4): OfficialLink[] {
  const out: OfficialLink[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    const url = safeLinkUrl(link.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ label: link.label, url });
    if (out.length >= max) break;
  }
  return out;
}
