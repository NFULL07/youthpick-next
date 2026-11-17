import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { CatalogRows } from './catalogTypes';
import {
  CATALOG_CACHE_KEY,
  DEMO_NOTICE,
  getPolicyCatalog,
  loadPolicyCatalog,
  type CatalogDeps,
} from './policyCatalog';
import { POLICIES_DATA } from './policies';
import { isAdminKey, readSupabaseConfig, type ConfigResult } from './supabaseSource';
import { DEMO_DATA_NOTICE } from '../components/DemoDataBanner';

const rows = (): CatalogRows =>
  JSON.parse(readFileSync(new URL('./__fixtures__/catalogRows.fixture.json', import.meta.url), 'utf-8'));

const OK: ConfigResult = { status: 'ok', config: { url: 'https://example.supabase.co', anonKey: 'sb_publishable_test' } };

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

function deps(over: Partial<CatalogDeps>): CatalogDeps {
  return {
    config: OK,
    fetchRows: async () => rows(),
    storage: memoryStorage(),
    now: () => new Date('2026-11-17T05:00:00Z'),
    ...over,
  };
}

function jwt(role: string): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256' })}.${b64({ role, iss: 'supabase' })}.signature`;
}

test('설정이 없으면 시연용 예시 데이터와 기존 안내 문구 그대로', async () => {
  let called = false;
  const catalog = await loadPolicyCatalog(deps({ config: { status: 'missing' }, fetchRows: async () => { called = true; return rows(); } }));
  assert.equal(catalog.source, 'demo');
  assert.equal(catalog.policies, POLICIES_DATA);
  assert.equal(catalog.notice, DEMO_NOTICE);
  assert.equal(DEMO_NOTICE, DEMO_DATA_NOTICE);
  assert.equal(called, false); // 설정이 없으면 네트워크를 쓰지 않는다
  assert.equal(getPolicyCatalog().source, 'demo');
});

test('읽기에 성공하면 Supabase 데이터를 쓰고 공개 데이터 사본을 받아 둔다', async () => {
  const storage = memoryStorage();
  const catalog = await loadPolicyCatalog(deps({ storage }));
  assert.equal(catalog.source, 'supabase');
  assert.equal(catalog.policies.length, 7);
  assert.ok(catalog.notice.includes('정책 7건') && catalog.notice.includes('검수한 판정 규칙 13건'));
  assert.ok(catalog.notice.includes('공고 원문 검수 전'));
  const cached = JSON.parse(storage.data.get(CATALOG_CACHE_KEY)!);
  assert.equal(cached.savedAt, '2026-11-17');
  assert.equal(cached.rows.policy.length, rows().policy.length);
});

test('읽기에 실패하면 받아 둔 사본, 사본도 없으면 예시 데이터', async () => {
  const storage = memoryStorage();
  await loadPolicyCatalog(deps({ storage }));
  const fail = async (): Promise<CatalogRows> => { throw new Error('network'); };

  const fromCache = await loadPolicyCatalog(deps({ storage, fetchRows: fail }));
  assert.equal(fromCache.source, 'cache');
  assert.equal(fromCache.policies.length, 7);
  assert.ok(fromCache.notice.includes('2026-11-17에 받아 둔 데이터'));

  const noCache = await loadPolicyCatalog(deps({ fetchRows: fail }));
  assert.equal(noCache.source, 'demo');
  assert.equal(noCache.policies, POLICIES_DATA);
  assert.ok(noCache.notice.includes('불러오지 못했어요') && noCache.notice.includes('시연용 예시 데이터'));

  const broken = await loadPolicyCatalog(deps({ fetchRows: fail, storage: memoryStorage({ [CATALOG_CACHE_KEY]: '{"version":1,"savedAt":"x","rows":{"policy":"nope"}}' }) }));
  assert.equal(broken.source, 'demo'); // 깨진 사본은 쓰지 않는다
});

test('정책이 비어 있거나 응답이 늦어도 화면은 예시 데이터로 뜬다', async () => {
  const empty = rows();
  empty.policy = [];
  const none = await loadPolicyCatalog(deps({ fetchRows: async () => empty }));
  assert.equal(none.source, 'demo');
  assert.ok(none.notice.includes('정책 데이터가 아직 없어요'));

  const slow = await loadPolicyCatalog(deps({ timeoutMs: 20, fetchRows: () => new Promise((resolve) => setTimeout(() => resolve(rows()), 300)) }));
  assert.equal(slow.source, 'demo');

  const fullStorage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  const ok = await loadPolicyCatalog(deps({ storage: fullStorage }));
  assert.equal(ok.source, 'supabase'); // 사본을 못 남겨도 계속한다
});

test('사본이 있으면 오래 기다리지 않고, 늦게 온 데이터는 다음을 위해 받아 둔다', async () => {
  const storage = memoryStorage();
  await loadPolicyCatalog(deps({ storage, now: () => new Date('2026-11-10T05:00:00Z') }));
  assert.equal(JSON.parse(storage.data.get(CATALOG_CACHE_KEY)!).savedAt, '2026-11-10');

  const started = Date.now();
  const catalog = await loadPolicyCatalog(
    deps({ storage, fastTimeoutMs: 30, timeoutMs: 5000, fetchRows: () => new Promise((resolve) => setTimeout(() => resolve(rows()), 150)) })
  );
  assert.equal(catalog.source, 'cache');
  assert.ok(Date.now() - started < 140);
  assert.ok(catalog.notice.includes('2026-11-10에 받아 둔 데이터'));
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.equal(JSON.parse(storage.data.get(CATALOG_CACHE_KEY)!).savedAt, '2026-11-17'); // 늦게 온 데이터로 사본 갱신
});

test('환경변수 검사: 관리자 키는 화면에서 쓰지 않는다', async () => {
  assert.deepEqual(readSupabaseConfig(undefined), { status: 'missing' });
  assert.deepEqual(readSupabaseConfig({}), { status: 'missing' });
  assert.equal(readSupabaseConfig({ VITE_SUPABASE_URL: 'https://a.supabase.co' }).status, 'invalid');
  assert.equal(readSupabaseConfig({ VITE_SUPABASE_URL: 'http://a.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' }).status, 'invalid');
  assert.deepEqual(readSupabaseConfig({ VITE_SUPABASE_URL: ' https://a.supabase.co/ ', VITE_SUPABASE_ANON_KEY: ' sb_publishable_x ' }), {
    status: 'ok',
    config: { url: 'https://a.supabase.co', anonKey: 'sb_publishable_x' },
  });
  assert.equal(readSupabaseConfig({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: jwt('anon') }).status, 'ok');

  assert.equal(isAdminKey(jwt('service_role')), true);
  assert.equal(isAdminKey('sb_secret_abc'), true);
  assert.equal(isAdminKey(jwt('anon')), false);
  assert.equal(isAdminKey('sb_publishable_abc'), false);
  const admin = readSupabaseConfig({ VITE_SUPABASE_URL: 'https://a.supabase.co', VITE_SUPABASE_ANON_KEY: jwt('service_role') });
  assert.equal(admin.status, 'invalid');

  let called = false;
  const catalog = await loadPolicyCatalog(deps({ config: admin, fetchRows: async () => { called = true; return rows(); } }));
  assert.equal(called, false);
  assert.equal(catalog.source, 'demo');
  assert.ok(catalog.notice.includes('관리자 키'));
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

test('화면 코드는 Supabase를 읽기만 한다', () => {
  const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const banned = ['.insert(', '.upsert(', '.update(', '.delete(', '.rpc(', 'SERVICE_ROLE_KEY', 'supabase.auth', '.storage.from('];
  const files = sourceFiles(srcDir);
  assert.ok(files.length > 20);
  for (const file of files) {
    const src = readFileSync(file, 'utf-8');
    for (const word of banned) {
      assert.ok(!src.includes(word), `${path.relative(srcDir, file)}: ${word}`);
    }
  }
  // Supabase 클라이언트는 한 파일에서만 만든다
  const users = files.filter((f) => readFileSync(f, 'utf-8').includes('@supabase/supabase-js'));
  assert.deepEqual(users.map((f) => path.relative(srcDir, f)), [path.join('data', 'supabaseSource.ts')]);
});
