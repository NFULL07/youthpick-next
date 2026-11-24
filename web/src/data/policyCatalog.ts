import { buildPolicies, toDateKey } from './catalogBuilder';
import {
  CATALOG_TABLES,
  type CatalogRows,
  type CatalogStats,
  type PolicyCatalog,
} from './catalogTypes';
import { POLICIES_DATA } from './policies';
import {
  fetchCatalogRows,
  readSupabaseConfig,
  type ConfigResult,
  type SupabaseConfig,
} from './supabaseSource';

/**
 * 화면이 쓰는 정책 목록을 정한다.
 * - Supabase 설정이 없으면: 시연용 예시 데이터
 * - 설정이 있고 읽기에 성공하면: Supabase 데이터 (이 브라우저에 사본을 받아 둔다)
 * - 읽기에 실패하면: 받아 둔 사본, 사본도 없으면 시연용 예시 데이터
 *
 * 받아 두는 사본은 공개 정책 데이터뿐이다. 사용자가 입력한 값은 들어가지 않는다.
 */

export const DEMO_NOTICE = '시연용 예시 데이터입니다. 실제 공고는 연결 후 표시됩니다.';
export const CATALOG_CACHE_KEY = 'cheongnyeonpick_catalog_cache_v1';
const CACHE_VERSION = 1;
const DEFAULT_TIMEOUT_MS = 8000;
/** 받아 둔 사본이 있을 때는 이 시간만 기다리고 사본으로 화면을 먼저 그린다 */
const DEFAULT_FAST_TIMEOUT_MS = 2500;

export const DEMO_CATALOG: PolicyCatalog = {
  source: 'demo',
  policies: POLICIES_DATA,
  notice: DEMO_NOTICE,
  stats: null,
};

export function liveNotice(stats: CatalogStats): string {
  const collected = stats.collectedOn ? `${stats.collectedOn} 수집` : '수집';
  return `정책 ${stats.policyCount}건의 소개·지원 내용·접수기간은 ${collected} 자료로, 공고 원문과 대조하지 않았어요. 조건 판정에는 검수한 규칙 ${stats.reviewedRuleCount}건만 써요. 신청 전에 공식 공고를 확인해 주세요.`;
}

export function cacheNotice(savedAt: string): string {
  return `연결이 되지 않아 ${savedAt}에 받아 둔 데이터를 보여 드려요. 신청 전에 공식 공고를 확인해 주세요.`;
}

export function fallbackNotice(reason: string): string {
  return `${reason} 지금은 시연용 예시 데이터를 보여 드려요.`;
}

type CacheStorage = Pick<Storage, 'getItem' | 'setItem'>;

interface CachedCatalog {
  version: number;
  savedAt: string;
  rows: CatalogRows;
}

function isCatalogRows(value: unknown): value is CatalogRows {
  if (typeof value !== 'object' || value === null) return false;
  return CATALOG_TABLES.every((table) => Array.isArray((value as Record<string, unknown>)[table]));
}

function readCache(storage: CacheStorage | null): CachedCatalog | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedCatalog>;
    if (parsed.version !== CACHE_VERSION || typeof parsed.savedAt !== 'string' || !isCatalogRows(parsed.rows)) {
      return null;
    }
    return parsed as CachedCatalog;
  } catch {
    return null;
  }
}

function writeCache(storage: CacheStorage | null, rows: CatalogRows, savedAt: string): void {
  if (!storage) return;
  try {
    const cached: CachedCatalog = { version: CACHE_VERSION, savedAt, rows };
    storage.setItem(CATALOG_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // 저장 공간이 없거나 막혀 있으면 사본 없이 계속한다
  }
}

type Settled<T> = { status: 'ok'; value: T } | { status: 'error' } | { status: 'timeout' };

/** ms 안에 끝나면 결과를, 아니면 timeout을 돌려준다. 원래 작업은 멈추지 않는다 */
function settleWithin<T>(promise: Promise<T>, ms: number): Promise<Settled<T>> {
  return new Promise<Settled<T>>((resolve) => {
    const timer = setTimeout(() => resolve({ status: 'timeout' }), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve({ status: 'ok', value });
      },
      () => {
        clearTimeout(timer);
        resolve({ status: 'error' });
      }
    );
  });
}

export interface CatalogDeps {
  config: ConfigResult;
  fetchRows: (config: SupabaseConfig) => Promise<CatalogRows>;
  storage: CacheStorage | null;
  now: () => Date;
  /** 사본이 없을 때 기다리는 시간 */
  timeoutMs?: number;
  /** 사본이 있을 때 기다리는 시간 */
  fastTimeoutMs?: number;
}

export async function loadPolicyCatalog(deps: CatalogDeps): Promise<PolicyCatalog> {
  if (deps.config.status === 'missing') return DEMO_CATALOG;
  if (deps.config.status === 'invalid') {
    return { ...DEMO_CATALOG, notice: fallbackNotice(deps.config.reason) };
  }

  const cached = readCache(deps.storage);
  const cachedCatalog = (): PolicyCatalog | null => {
    if (!cached) return null;
    const { policies, stats } = buildPolicies(cached.rows, deps.now());
    return policies.length > 0
      ? { source: 'cache', policies, notice: cacheNotice(cached.savedAt), stats }
      : null;
  };

  const request = deps.fetchRows(deps.config.config);
  const wait = cached
    ? (deps.fastTimeoutMs ?? DEFAULT_FAST_TIMEOUT_MS)
    : (deps.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const settled = await settleWithin(request, wait);

  let failure = '공고 데이터를 불러오지 못했어요.';
  if (settled.status === 'ok') {
    const { policies, stats } = buildPolicies(settled.value, deps.now());
    if (policies.length > 0) {
      writeCache(deps.storage, settled.value, toDateKey(deps.now()));
      return { source: 'supabase', policies, notice: liveNotice(stats), stats };
    }
    failure = 'Supabase에 정책 데이터가 아직 없어요.';
  } else if (settled.status === 'timeout') {
    // 늦게라도 도착하면 사본만 새로 받아 둔다(다음에 열 때 쓰인다). 지금 화면은 바꾸지 않는다
    request.then(
      (rows) => {
        if (buildPolicies(rows, deps.now()).policies.length > 0) {
          writeCache(deps.storage, rows, toDateKey(deps.now()));
        }
      },
      () => undefined
    );
  }

  return cachedCatalog() ?? { ...DEMO_CATALOG, notice: fallbackNotice(failure) };
}

let current: PolicyCatalog = DEMO_CATALOG;

/** 화면이 쓰는 정책 목록. 첫 화면을 그리기 전에 bootstrapPolicyCatalog가 정해 둔다 */
export function getPolicyCatalog(): PolicyCatalog {
  return current;
}

export function setPolicyCatalog(catalog: PolicyCatalog): void {
  current = catalog;
}

function browserStorage(): CacheStorage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** 설정이 있으면 Supabase에서 받아 오고, 결과를 화면이 쓸 목록으로 정한다 */
export async function bootstrapPolicyCatalog(): Promise<PolicyCatalog> {
  const env = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
  const catalog = await loadPolicyCatalog({
    config: readSupabaseConfig(env),
    fetchRows: fetchCatalogRows,
    storage: browserStorage(),
    now: () => new Date(),
  });
  setPolicyCatalog(catalog);
  return catalog;
}

/** Supabase 설정이 들어 있는지(불러오는 동안 안내를 보여 줄지 정할 때 쓴다) */
export function hasSupabaseConfig(): boolean {
  const env = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
  return readSupabaseConfig(env).status === 'ok';
}
