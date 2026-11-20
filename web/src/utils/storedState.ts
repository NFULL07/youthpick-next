import {
  AcademicWorkStatus,
  POLICY_CATEGORIES,
  PolicyCategory,
  UserProfile,
  WalletDocument,
} from '../types/policy';

/**
 * 브라우저 저장소에서 읽은 값의 형식 검사.
 * 형식이 다르면(이전 버전 저장값, 손상된 값) 기본값을 써서 화면이 비지 않게 한다.
 */

const ACADEMIC_WORK_STATUSES: readonly AcademicWorkStatus[] = [
  '대학 재학',
  '휴학',
  '졸업',
  '구직 중',
  '재직 중',
  '창업',
];

const WALLET_CATEGORIES: readonly WalletDocument['category'][] = ['학적', '거주', '소득', '기타'];
const WALLET_STATUSES: readonly WalletDocument['status'][] = ['확인 필요', '파일명 기록'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function sanitizeProfile(value: unknown, fallback: UserProfile): UserProfile {
  if (!isRecord(value)) return fallback;
  const { age, status, residence, schoolRegion, workRegion, interests } = value;
  if (
    typeof age !== 'number' ||
    !Number.isFinite(age) ||
    typeof status !== 'string' ||
    !ACADEMIC_WORK_STATUSES.includes(status as AcademicWorkStatus) ||
    typeof residence !== 'string' ||
    typeof schoolRegion !== 'string' ||
    typeof workRegion !== 'string' ||
    !Array.isArray(interests)
  ) {
    return fallback;
  }
  return {
    age,
    status: status as AcademicWorkStatus,
    residence,
    schoolRegion,
    workRegion,
    interests: interests.filter((c): c is PolicyCategory =>
      POLICY_CATEGORIES.includes(c as PolicyCategory)
    ),
  };
}

export function sanitizeStringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  return value.filter((v): v is string => typeof v === 'string');
}

export function sanitizeWalletDocs(
  value: unknown,
  fallback: WalletDocument[]
): WalletDocument[] {
  if (!Array.isArray(value)) return fallback;
  // 이전 버전 상태값 '보관 완료'는 실제 동작(파일 이름만 기록)에 맞는 '파일명 기록'으로 옮긴다
  const migrated = value.map((d) =>
    isRecord(d) && d.status === '보관 완료' ? { ...d, status: '파일명 기록' } : d
  );
  const valid = migrated.filter(
    (d): d is WalletDocument =>
      isRecord(d) &&
      typeof d.id === 'string' &&
      typeof d.name === 'string' &&
      typeof d.issuer === 'string' &&
      typeof d.linkedPolicyId === 'string' &&
      typeof d.linkedPolicyTitle === 'string' &&
      typeof d.previewNote === 'string' &&
      WALLET_CATEGORIES.includes(d.category as WalletDocument['category']) &&
      WALLET_STATUSES.includes(d.status as WalletDocument['status']) &&
      (d.uploadedFileName === undefined || typeof d.uploadedFileName === 'string') &&
      (d.uploadedAt === undefined || typeof d.uploadedAt === 'string')
  );
  return valid.length === value.length && valid.length > 0 ? valid : fallback;
}

/** 저장이 막힌 환경(사파리 개인정보 보호 모드, 용량 초과 등)에서도 버튼 동작이 멈추지 않게 저장 실패를 삼킨다 */
export function saveJson(
  key: string,
  value: unknown,
  storage: Pick<Storage, 'setItem'> | null = typeof window !== 'undefined' ? window.localStorage : null
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
