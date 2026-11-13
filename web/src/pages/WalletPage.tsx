import React, { useMemo, useRef, useState } from 'react';
import { ArrowRight, FileText, Search, Upload } from 'lucide-react';
import { RouteId, UserProfile, WalletDocument } from '../types/policy';

interface WalletPageProps {
  profile: UserProfile;
  documents: WalletDocument[];
  activePolicyTitle: string;
  onUploadDocFile: (docId: string, fileName: string) => void;
  onNavigate: (route: RouteId, policyId?: string) => void;
}

export const WalletPage: React.FC<WalletPageProps> = ({
  profile,
  documents,
  activePolicyTitle,
  onUploadDocFile,
  onNavigate,
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
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] font-semibold text-[#333333]">
        <div>
          <span>나의 다음</span>
          <span className="mx-2 text-[#6B6E68]">/</span>
          <strong className="font-bold text-[#1F2421]">전자지갑</strong>
        </div>
        <span className="font-mono-num tracking-wider text-[#4A4D49]">
          YOUR NEXT, ONE PICK AT A TIME.
        </span>
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <p className="font-mono-num text-xs font-bold tracking-wider text-[#333333]">
          04 / MY NEXT WALLET
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1F2421] sm:text-4xl">
          준비는 한곳에. 쓰임은 한눈에.
        </h1>
        <p className="text-[16px] text-[#333333]">
          내 정보와 서류를 잇고, 다음 신청 준비를 가볍게 시작해요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Wallet Card */}
        <aside className="space-y-5 lg:col-span-4">
          <section className="card-tactile rounded-3xl bg-[#E8E0FC] p-6">
            <div className="flex items-center justify-between text-xs font-bold tracking-wider text-[#1F2421]">
              <span className="font-mono-num">MY NEXT WALLET</span>
              <span className="font-mono-num">01 / NEXT</span>
            </div>

            <div className="mt-5 rounded-2xl border-[1.5px] border-[#262A27] bg-[#D8F279] p-5">
              <span className="font-mono-num text-xs font-bold text-[#1F2421]">
                MY NEXT
              </span>
              <p className="mt-2 text-lg font-extrabold text-[#1F2421]">
                나의 다음을 위한 서류
              </p>
              <span className="font-mono-num mt-4 block text-xs font-bold text-[#333333]">
                N↗ NEXT WALLET
              </span>
            </div>

            <div className="mt-5 space-y-1">
              <span className="text-[13px] font-semibold text-[#333333]">
                나의 생활권
              </span>
              <h2 className="text-xl font-extrabold text-[#1F2421]">
                {profile.residence || '미입력'} ↔ {profile.schoolRegion || '미입력'}
              </h2>
              <p className="text-[14px] font-semibold text-[#333333]">
                만 {profile.age}세 · {profile.status}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-[#262A27]/20 pt-4">
              <span className="text-[13px] font-semibold text-[#333333]">
                모달 선택 생활권 정보
              </span>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="btn-primary-brand cursor-pointer rounded-xl px-3.5 py-2 text-[13px]"
              >
                수정
              </button>
            </div>
          </section>
        </aside>

        {/* Right Document Workspace */}
        <div className="space-y-6 lg:col-span-8">
          {/* Summary Bar */}
          <div className="card-soft grid grid-cols-1 divide-y divide-[#DCD7C9] rounded-3xl bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="p-5">
              <span className="text-[13px] font-bold text-[#4A4D49]">
                내 기기 보관 문서
              </span>
              <strong className="font-mono-num mt-1 block text-3xl font-extrabold text-[#1F2421]">
                {String(uploadedCount).padStart(2, '0')}개
              </strong>
              <span className="mt-1 block text-[13px] text-[#333333]">
                현재 브라우저에 파일명 기록
              </span>
            </div>
            <div className="p-5">
              <span className="text-[13px] font-bold text-[#4A4D49]">
                확인할 필요 서류
              </span>
              <strong className="font-mono-num mt-1 block text-3xl font-extrabold text-[#1F2421]">
                {String(documents.length).padStart(2, '0')}개
              </strong>
              <span className="mt-1 block text-[13px] text-[#333333]">
                발급처 및 기준 안내
              </span>
            </div>
            <div className="p-5">
              <span className="text-[13px] font-bold text-[#4A4D49]">
                준비 중인 정책
              </span>
              <strong className="font-mono-num mt-1 block text-3xl font-extrabold text-[#1F2421]">
                01건
              </strong>
              <span className="mt-1 block truncate text-[13px] text-[#333333]">
                {activePolicyTitle}
              </span>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="card-soft rounded-3xl bg-white p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#C9C4B6] bg-[#FAF8F2] px-3.5 py-2.5">
                <Search className="h-4 w-4 text-[#333333]" aria-hidden="true" />
                <input
                  type="search"
                  aria-label="전자지갑 서류 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="서류 이름으로 찾아보세요"
                  className="w-full bg-transparent text-[14px] text-[#1F2421] placeholder:text-[#5C5F5B] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(['전체', '학적', '거주', '소득'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`cursor-pointer rounded-xl px-3.5 py-2 text-[13px] font-bold transition-colors ${
                      categoryFilter === cat
                        ? 'bg-[#1F2421] text-white'
                        : 'border border-[#C9C4B6] bg-[#FAF8F2] text-[#333333] hover:border-[#262A27]'
                    }`}
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
                      className={`flex w-full cursor-pointer items-center justify-between rounded-2xl border-[1.5px] p-4 text-left transition-colors ${
                        selected
                          ? 'border-[#262A27] bg-[#EEF1E3]'
                          : 'border-[#DCD7C9] bg-[#FAF8F2] hover:border-[#262A27]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#262A27]/20 bg-white text-[#1F2421]">
                          <FileText className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                          <strong className="block text-[15px] font-extrabold text-[#1F2421]">
                            {doc.name}
                          </strong>
                          <span className="text-[13px] font-medium text-[#333333]">
                            {doc.issuer}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg border px-2.5 py-1 text-[12px] font-bold ${
                          doc.uploadedFileName
                            ? 'border-[#262A27] bg-[#D8F279] text-[#1F2421]'
                            : 'border-[#C9C4B6] bg-white text-[#333333]'
                        }`}
                      >
                        {doc.uploadedFileName ? '보관 완료' : doc.status}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Document Detail */}
              {selectedDoc && (
                <div className="rounded-2xl border-[1.5px] border-[#262A27] bg-[#FAF8F2] p-5 md:col-span-6">
                  <span className="font-mono-num text-xs font-bold tracking-wider text-[#4A4D49]">
                    DOCUMENT DETAIL
                  </span>
                  <h3 className="mt-1.5 text-xl font-extrabold text-[#1F2421]">
                    {selectedDoc.name}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#333333]">
                    {selectedDoc.previewNote}
                  </p>

                  <dl className="mt-4 space-y-2.5 border-t border-[#DCD7C9] pt-4 text-[14px]">
                    <div className="flex justify-between gap-3">
                      <dt className="font-semibold text-[#4A4D49]">종류</dt>
                      <dd className="font-bold text-[#1F2421]">
                        {selectedDoc.category} 증빙서류
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="font-semibold text-[#4A4D49]">발급처</dt>
                      <dd className="font-bold text-[#1F2421]">
                        {selectedDoc.issuer}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="font-semibold text-[#4A4D49]">연결 정책</dt>
                      <dd className="text-right font-bold text-[#1F2421]">
                        {selectedDoc.linkedPolicyTitle}
                      </dd>
                    </div>
                    {selectedDoc.uploadedFileName && (
                      <div className="flex justify-between gap-3">
                        <dt className="font-semibold text-[#4A4D49]">보관 파일</dt>
                        <dd className="font-bold text-[#1F2421]">
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

                  <div className="mt-5 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-primary-brand flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px]"
                    >
                      <Upload className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {selectedDoc.uploadedFileName
                          ? '다른 파일로 교체'
                          : '내 기기 문서 연결하기'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate('apply')}
                      className="btn-secondary-outline flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-[14px]"
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
    </div>
  );
};
