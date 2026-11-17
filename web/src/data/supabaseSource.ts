import type { CatalogRows } from './catalogTypes';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export type ConfigResult =
  | { status: 'missing' }
  | { status: 'invalid'; reason: string }
  | { status: 'ok'; config: SupabaseConfig };

function decodeJwtRole(key: string): string | null {
  const parts = key.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const role = (JSON.parse(json) as { role?: unknown }).role;
    return typeof role === 'string' ? role : null;
  } catch {
    return null;
  }
}

/** 관리자 키(service_role, sb_secret_)인지. 화면에는 공개용 키(anon, sb_publishable_)만 넣는다 */
export function isAdminKey(key: string): boolean {
  return key.startsWith('sb_secret_') || decodeJwtRole(key) === 'service_role';
}

/** 환경변수에서 Supabase 설정을 읽는다. 값이 없으면 시연용 예시 데이터로 동작한다 */
export function readSupabaseConfig(env: Record<string, unknown> | undefined): ConfigResult {
  const url = typeof env?.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL.trim() : '';
  const anonKey = typeof env?.VITE_SUPABASE_ANON_KEY === 'string' ? env.VITE_SUPABASE_ANON_KEY.trim() : '';
  if (!url && !anonKey) return { status: 'missing' };
  if (!url || !anonKey) {
    return { status: 'invalid', reason: 'VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 둘 다 넣어야 해요.' };
  }
  if (!/^https:\/\/|^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url)) {
    return { status: 'invalid', reason: 'VITE_SUPABASE_URL은 https:// 로 시작해야 해요.' };
  }
  if (isAdminKey(anonKey)) {
    // 관리자 키가 화면 코드에 들어가면 누구나 DB를 고칠 수 있다. 쓰지 않고 멈춘다
    return { status: 'invalid', reason: '관리자 키(service_role)는 화면에 넣을 수 없어요. 공개용 키로 바꿔 주세요.' };
  }
  return { status: 'ok', config: { url: url.replace(/\/+$/, ''), anonKey } };
}

/**
 * Supabase에서 공개 정책 데이터를 읽는다. 읽기만 하고, 사용자 값은 보내지 않는다.
 * 로그인 기능을 쓰지 않으므로 세션을 브라우저에 남기지 않게 끈다.
 */
export async function fetchCatalogRows(config: SupabaseConfig): Promise<CatalogRows> {
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const read = async <T>(table: keyof CatalogRows, reviewedOnly = false): Promise<T[]> => {
    const query = client.from(table).select('*');
    const { data, error } = await (reviewedOnly ? query.eq('review_status', 'reviewed') : query);
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data ?? []) as T[];
  };

  const [
    policy,
    policy_notice,
    eligibility_rule,
    policy_relationship,
    document_requirement,
    source_document,
    personal_field,
    document_catalog,
    region,
  ] = await Promise.all([
    read<CatalogRows['policy'][number]>('policy'),
    read<CatalogRows['policy_notice'][number]>('policy_notice'),
    read<CatalogRows['eligibility_rule'][number]>('eligibility_rule', true),
    read<CatalogRows['policy_relationship'][number]>('policy_relationship', true),
    read<CatalogRows['document_requirement'][number]>('document_requirement', true),
    read<CatalogRows['source_document'][number]>('source_document'),
    read<CatalogRows['personal_field'][number]>('personal_field'),
    read<CatalogRows['document_catalog'][number]>('document_catalog'),
    read<CatalogRows['region'][number]>('region'),
  ]);

  return {
    policy,
    policy_notice,
    eligibility_rule,
    policy_relationship,
    document_requirement,
    source_document,
    personal_field,
    document_catalog,
    region,
  };
}
