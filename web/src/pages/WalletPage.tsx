import React, { useMemo, useRef, useState } from 'react';
import { ArrowRight, FileText, Search, Upload } from 'lucide-react';
import { RouteId, UserProfile, WalletDocument } from '../types/policy';
import { WalletExternalDocsSection } from '../components/WalletExternalDocsSection';
import type { WalletFacts } from '../data/virtualWallet';

interface WalletPageProps {
  profile: UserProfile;
  documents: WalletDocument[];
  activePolicyTitle: string;
  prepPolicyCount: number;
  onUploadDocFile: (docId: string, fileName: string) => void;
  onNavigate: (route: RouteId, policyId?: string) => void;
  /** 가상 지갑(시연용) */
  personas?: readonly WalletFacts[];
  activePersonaId?: string | null;
  onSelectPersona?: (id: string | null) => void;
}

export const WalletPage: React.FC<WalletPageProps> = ({
  profile,
  documents,
  activePolicyTitle,
  prepPolicyCount,
  onUploadDocFile,
  onNavigate,
  personas = [],
  activePersonaId = null,
  onSelectPersona,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    '전체' | '학적' | '거주' | '소득'
  >('전체');
  const [selectedDocId, setSelectedDocId] = useState(documents[0]?.id ?? '');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      if (categoryFilter !== '전체' && doc.category !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        return (
          doc.name.toLowerCase().includes(q) ||
          doc.issuer.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [documents, categoryFilter, searchQuery]);

  const selectedDoc =
    documents.find((d) => d.id === selectedDocId) ?? filteredDocs[0] ?? documents[0];

  const uploadedCount = documents.filter((d) => Boolean(d.uploadedFileName)).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="t-page">준비는 한곳에. 쓰임은 한눈에.</h1>
        <p className="t-lead mt-2">
          내 정보와 서류를 잇고, 다음 신청 준비를 가볍게 시작해요.
        </p>
      </div>

      {personas.length > 0 && onSelectPersona && (
        <section
          aria-labelledby="virtual-wallet-title"
          className="card-tactile rounded-3xl bg-white p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="virtual-wallet-title" className="t-section">
              가상 지갑으로 시연하기
            </h2>
            <span className="rounded-lg border border-[#B8860B] bg-[#FFF0CC] px-3 py-1 text-[13px] font-bold text-ink">
              가상 인물 · 저장 안 함
            </span>
          </div>
          <p className="mt-2 text-[15px] text-ink-2">
            서류에서 읽었다고 가정한 가상 인물의 정보로 정책 조건을 판정해 봐요. 켜 두는 동안 판정에만 쓰고,
            내 정보는 바꾸지 않아요. 새로고침하면 꺼져요.
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {personas.map((persona) => {
              const active = persona.id === activePersonaId;
              return (
                <li key={persona.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelectPersona(active ? null : persona.id)}
                    className={`h-full w-full cursor-pointer rounded-2xl border-[1.5px] px-4 py-3 text-left ${
                      active ? 'border-[#262A27] bg-[#D8F279]' : 'border-[#DCD7C9] bg-[#FDFCF8] hover:border-[#262A27]'
                    }`}
                  >
                    <strong className="block text-[15px] font-extrabold text-ink">{persona.name}</strong>
                    <span className="mt-1 block text-[13px] font-semibold text-ink-2">{persona.summary}</span>
                    <span className="mt-2 block text-[12px] font-bold text-ink">
                      {active ? '켜짐 · 다시 누르면 꺼져요' : '이 지갑으로 판정하기'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Wallet Card */}
        <aside className="space-y-5 lg:col-span-4">
          <section
            aria-labelledby="wallet-living-title"
            className="card-tactile rounded-3xl bg-lavender p-6"
          >
            <h2 id="wallet-living-title" className="t-section">
              나의 생활권
            </h2>
            <p className="mt-3 text-[16px] font-bold text-ink">
              {profile.residence || '미입력'} ↔ {profile.schoolRegion || '미입력'}
            </p>
            <p className="mt-0.5 text-[14px] font-semibold text-ink-2 tabular-nums">
              만 {profile.age}세 · {profile.status}
            </p>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-edge/20 pt-4">
              <span className="text-[13px] font-medium text-ink-2">
                서류 안내에 쓰는 정보예요.
              </span>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="btn-primary-brand shrink-0 cursor-pointer rounded-xl px-3.5 py-2 text-[13px]"
              >
                수정
              </button>
            </div>
          </section>
        </aside>

        {/* Right Document Workspace */}
        <div className="space-y-6 lg:col-span-8">
          {/* Summary Bar */}
          <div className="card-soft grid grid-cols-1 divide-y divide-line-soft rounded-3xl bg-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="p-5">
              <span className="text-[13px] font-semibold text-ink-3">
                파일명 기록 문서
              </span>
              <strong className="mt-1 block text-2xl font-extrabold tabular-nums text-ink">
                {uploadedCount}개
              </strong>
              <span className="mt-1 block text-[13px] text-ink-2">
                현재 브라우저에 파일명 기록
              </span>
            </div>
            <div className="p-5">
              <span className="text-[13px] font-semibold text-ink-3">
                확인할 필요 서류
              </span>
              <strong className="mt-1 block text-2xl font-extrabold tabular-nums text-ink">
                {documents.length}개
              </strong>
              <span className="mt-1 block text-[13px] text-ink-2">
                발급처 및 기준 안내
              </span>
            </div>
            <div className="p-5">
              <span className="text-[13px] font-semibold text-ink-3">
                준비 중인 정책
              </span>
              <strong className="mt-1 block text-2xl font-extrabold tabular-nums text-ink">
                {prepPolicyCount}건
              </strong>
              <span className="mt-1 block truncate text-[13px] text-ink-2">
                {activePolicyTitle || '아직 선택한 정책 없음'}
              </span>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="card-soft rounded-3xl bg-surface p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="field flex flex-1 items-center gap-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
                <Search className="h-4 w-4 text-ink-2" aria-hidden="true" />
                <input
                  type="search"
                  aria-label="전자지갑 서류 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="서류 이름으로 찾아보세요"
                  className="w-full bg-transparent text-[15px] text-ink placeholder:text-ink-4 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(['전체', '학적', '거주', '소득'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    aria-pressed={categoryFilter === cat}
                    className="chip chip-sm"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-12">
              {/* Document List */}
              <div className="space-y-3 md:col-span-6">
                {filteredDocs.map((doc) => {
                  const selected = selectedDoc?.id === doc.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedDocId(doc.id)}
                      aria-pressed={selected}
                      className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl p-4 text-left transition-colors ${
                        selected ? 'bg-sage' : 'bg-surface-2 hover:bg-surface-3'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-ink">
                          <FileText className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                          <strong className="block text-[15px] font-extrabold text-ink">
                            {doc.name}
                          </strong>
                          <span className="text-[13px] font-medium text-ink-2">
                            {doc.issuer}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 ${
                          doc.uploadedFileName ? 'badge badge-ok' : 'badge bg-surface'
                        }`}
                      >
                        {doc.uploadedFileName ? '파일명 기록' : doc.status}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Document Detail */}
              {selectedDoc && (
                <div className="inset p-5 md:col-span-6">
                  <h2 className="t-card">{selectedDoc.name}</h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
                    {selectedDoc.previewNote}
                  </p>

                  <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-[14px]">
                    <div className="flex items-start justify-between gap-4">
                      <dt className="shrink-0 whitespace-nowrap font-semibold text-ink-3">
                        종류
                      </dt>
                      <dd className="min-w-0 text-right font-bold text-ink break-words">
                        {selectedDoc.category} 증빙서류
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="shrink-0 whitespace-nowrap font-semibold text-ink-3">
                        발급처
                      </dt>
                      <dd className="min-w-0 text-right font-bold text-ink break-words">
                        {selectedDoc.issuer}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="shrink-0 whitespace-nowrap font-semibold text-ink-3">
                        연결 정책
                      </dt>
                      <dd className="min-w-0 text-right font-bold text-ink break-words">
                        {selectedDoc.linkedPolicyTitle}
                      </dd>
                    </div>
                    {selectedDoc.uploadedFileName && (
                      <div className="flex items-start justify-between gap-4">
                        <dt className="shrink-0 whitespace-nowrap font-semibold text-ink-3">
                          기록한 파일 이름
                        </dt>
                        <dd className="min-w-0 text-right font-bold text-ink break-all">
                          {selectedDoc.uploadedFileName}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.docx"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onUploadDocFile(selectedDoc.id, file.name);
                      }
                    }}
                  />

                  <p className="mt-4 text-[13px] leading-relaxed text-ink-3">
                    파일 내용은 저장하거나 전송하지 않고, 선택한 파일의 이름만 이
                    브라우저에 기록해요. 실제 서류는 기기에 따로 보관해 주세요.
                  </p>

                  <div className="mt-4 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-primary-brand flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px]"
                    >
                      <Upload className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {selectedDoc.uploadedFileName
                          ? '다른 파일 이름으로 바꾸기'
                          : '파일 이름 기록하기'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate('apply')}
                      className="btn-secondary-outline flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-surface px-4 py-2.5 text-[14px]"
                    >
                      <span>준비 목록에서 확인</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <WalletExternalDocsSection />
    </div>
  );
};
