import { KOREA_REGIONS, normalizeLegacyRegion } from '../data/regions';

/** 지역 비교 결과. unknown은 미입력·시군 미선택·해석할 수 없는 값이라 판단하지 않은 경우 */
export type RegionMatch = 'match' | 'mismatch' | 'unknown';

export interface ParsedRegion {
  sido: string;
  /** null이면 시·도 단위 (시·군·구 미선택) */
  sigungu: string | null;
}

/**
 * '충청남도' 또는 '충청남도 천안시' 형식만 해석한다. 지역 목록(KOREA_REGIONS)과
 * 정확히 같은 이름일 때만 인정하고, 부분 문자열이나 시·군·구 이름만으로는 추측하지 않는다.
 */
export function parseRegion(value: string): ParsedRegion | null {
  const trimmed = normalizeLegacyRegion(value);
  if (!trimmed) return null;
  for (const group of KOREA_REGIONS) {
    if (trimmed === group.sido) {
      return { sido: group.sido, sigungu: null };
    }
    if (trimmed.startsWith(`${group.sido} `)) {
      const rest = trimmed.slice(group.sido.length + 1).trim();
      if (!rest.endsWith('전체') && group.sigunguList.includes(rest)) {
        return { sido: group.sido, sigungu: rest };
      }
      return null;
    }
  }
  return null;
}

export function compareRegion(targetRegions: string[], userRegion: string): RegionMatch {
  const user = parseRegion(userRegion);
  if (!user) return 'unknown';

  let result: RegionMatch = 'mismatch';
  for (const raw of targetRegions) {
    if (raw.trim() === '전국') return 'match';
    const target = parseRegion(raw);
    if (!target) {
      result = 'unknown';
      continue;
    }
    if (target.sido !== user.sido) continue;
    if (target.sigungu === null) return 'match';
    if (user.sigungu === null) {
      result = 'unknown';
      continue;
    }
    if (target.sigungu === user.sigungu) return 'match';
  }
  return result;
}

export function matchesRegion(targetRegions: string[], userRegion: string): boolean {
  return compareRegion(targetRegions, userRegion) === 'match';
}
