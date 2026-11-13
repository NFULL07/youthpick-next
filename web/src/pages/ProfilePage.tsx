import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, MapPin, Wallet } from 'lucide-react';
import { RegionPickerModal } from '../components/RegionPickerModal';
import {
  AcademicWorkStatus,
  POLICY_CATEGORIES,
  PolicyCategory,
  RouteId,
  UserProfile,
} from '../types/policy';

interface ProfilePageProps {
  profile: UserProfile;
  walletDocCount: number;
  guideCount: number;
  onSaveProfile: (next: UserProfile) => void;
  onNavigate: (route: RouteId) => void;
}

const STATUS_OPTIONS: AcademicWorkStatus[] = [
  '대학 재학',
  '휴학',
  '졸업',
  '구직 중',
  '재직 중',
  '창업',
];

type AddressFieldKey = 'residence' | 'schoolRegion' | 'workRegion';

export const ProfilePage: React.FC<ProfilePageProps> = ({
  profile,
  walletDocCount,
  guideCount,
  onSaveProfile,
  onNavigate,
}) => {
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [modalField, setModalField] = useState<AddressFieldKey | null>(null);

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const toggleInterest = (category: PolicyCategory) => {
    setDraft((prev) => {
      const exists = prev.interests.includes(category);
      return {
        ...prev,
        interests: exists
          ? prev.interests.filter((c) => c !== category)
          : [...prev.interests, category],
      };
    });
  };

  const selectAllInterests = () => {
    setDraft((prev) => ({ ...prev, interests: [...POLICY_CATEGORIES] }));
  };

  const clearAllInterests = () => {
    setDraft((prev) => ({ ...prev, interests: [] }));
  };

  const modalTitle =
    modalField === 'residence'
      ? '주민등록상 주소지 선택'
      : modalField === 'schoolRegion'
        ? '학교 소재지 선택'
        : '근무 지역 선택';

  const modalCurrentValue =
    modalField === 'residence'
      ? draft.residence
      : modalField === 'schoolRegion'
        ? draft.schoolRegion
        : draft.workRegion;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] font-semibold text-[#333333]">
        <div>
          <span>나의 다음</span>
          <span className="mx-2 text-[#6B6E68]">/</span>
          <strong className="font-bold text-[#1F2421]">내 정보</strong>
        </div>
        <span className="font-mono-num tracking-wider text-[#4A4D49]">
          YOUR NEXT, ONE PICK AT A TIME.
        </span>
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <p className="font-mono-num text-xs font-bold tracking-wider text-[#333333]">
          MY POLICY PASS / 내 정보
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1F2421] sm:text-4xl">
          나를 알아야, 더 잘 고르니까.
        </h1>
        <p className="text-[16px] text-[#333333]">
          추천에 사용할 내 조건과 관심 분야, 준비 문서를 함께 관리해요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Form Column */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSaveProfile(draft);
          }}
          className="space-y-6 lg:col-span-8"
        >
          {/* Basic Info Card */}
          <section className="card-tactile rounded-3xl bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-2xl font-extrabold text-[#1F2421]">
                기본 정보
              </h2>
              <span className="rounded-lg border border-[#DCD7C9] bg-[#F7F5EE] px-3 py-1 text-[13px] font-bold text-[#333333]">
                시·도 / 시·군·구 모달 선택
              </span>
            </div>
            <p className="mt-1.5 text-[15px] text-[#333333]">
              거주지와 재학·근무 지역을 나누어 선택하면 생활권 특례 정책을 놓치지 않아요.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Age */}
              <div>
                <label
                  htmlFor="profile-age"
                  className="mb-1.5 block text-[14px] font-bold text-[#1F2421]"
                >
                  연령
                </label>
                <div className="flex items-center rounded-2xl border-[1.5px] border-[#C9C4B6] bg-[#FAF8F2] px-4 py-3 focus-within:border-[#262A27]">
                  <input
                    id="profile-age"
                    type="number"
                    min={15}
                    max={49}
                    value={draft.age}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        age: Math.max(15, Math.min(49, Number(e.target.value) || 23)),
                      }))
                    }
                    className="w-full bg-transparent text-[16px] font-bold text-[#1F2421] tabular-nums focus:outline-none"
                  />
                  <span className="shrink-0 text-[14px] font-semibold text-[#4A4D49]">
                    만 나이
                  </span>
                </div>
              </div>

              {/* Current Status */}
              <div>
                <label
                  htmlFor="profile-status"
                  className="mb-1.5 block text-[14px] font-bold text-[#1F2421]"
                >
                  현재 상태
                </label>
                <select
                  id="profile-status"
                  value={draft.status}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      status: e.target.value as AcademicWorkStatus,
                    }))
                  }
                  className="w-full cursor-pointer rounded-2xl border-[1.5px] border-[#C9C4B6] bg-[#FAF8F2] px-4 py-3 text-[16px] font-bold text-[#1F2421] focus:border-[#262A27]"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hierarchical Modal Trigger: 주민등록상 주소지 (NO direct typing text input) */}
              <div>
                <span className="mb-1.5 block text-[14px] font-bold text-[#1F2421]">
                  주민등록상 주소지
                </span>
                <button
                  type="button"
                  data-testid="select-residence-btn"
                  aria-label={`주민등록상 주소지 선택: 현재 ${draft.residence || '미선택'}`}
                  onClick={() => setModalField('residence')}
                  className="flex w-full cursor-pointer items-center justify-between rounded-2xl border-[1.5px] border-[#C9C4B6] bg-[#FAF8F2] px-4 py-3 text-left transition-colors hover:border-[#262A27] hover:bg-white"
                >
                  <span className="text-[16px] font-bold text-[#1F2421]">
                    {draft.residence || '시·도 / 시·군·구 선택하기'}
                  </span>
                  <MapPin className="h-4.5 w-4.5 shrink-0 text-[#333333]" aria-hidden="true" />
                </button>
                <p className="mt-1.5 text-[13px] font-medium text-[#4A4D49]">
                  클릭하여 시·도 → 시·군·구를 계층적으로 선택해 주세요.
                </p>
              </div>

              {/* Hierarchical Modal Trigger: 학교 소재지 (NO direct typing text input) */}
              <div>
                <span className="mb-1.5 block text-[14px] font-bold text-[#1F2421]">
                  학교 소재지
                </span>
                <button
                  type="button"
                  data-testid="select-school-btn"
                  aria-label={`학교 소재지 선택: 현재 ${draft.schoolRegion || '미선택'}`}
                  onClick={() => setModalField('schoolRegion')}
                  className="flex w-full cursor-pointer items-center justify-between rounded-2xl border-[1.5px] border-[#C9C4B6] bg-[#FAF8F2] px-4 py-3 text-left transition-colors hover:border-[#262A27] hover:bg-white"
                >
                  <span
                    className={`text-[16px] font-bold ${
                      draft.schoolRegion ? 'text-[#1F2421]' : 'text-[#5C5F5B]'
                    }`}
                  >
                    {draft.schoolRegion || '해당 시·군·구 선택 (선택)'}
                  </span>
                  <MapPin className="h-4.5 w-4.5 shrink-0 text-[#333333]" aria-hidden="true" />
                </button>
                <p className="mt-1.5 text-[13px] font-medium text-[#4A4D49]">
                  학교에 다니고 있다면 소재지 시·군·구를 선택해 주세요.
                </p>
              </div>

              {/* Hierarchical Modal Trigger: 근무 지역 (선택) (NO direct typing text input) */}
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-[14px] font-bold text-[#1F2421]">
                  근무 지역 (선택)
                </span>
                <button
                  type="button"
                  data-testid="select-work-btn"
                  aria-label={`근무 지역 선택: 현재 ${draft.workRegion || '선택 안 함'}`}
                  onClick={() => setModalField('workRegion')}
                  className="flex w-full cursor-pointer items-center justify-between rounded-2xl border-[1.5px] border-[#C9C4B6] bg-[#FAF8F2] px-4 py-3 text-left transition-colors hover:border-[#262A27] hover:bg-white sm:max-w-md"
                >
                  <span
                    className={`text-[16px] font-bold ${
                      draft.workRegion ? 'text-[#1F2421]' : 'text-[#5C5F5B]'
                    }`}
                  >
                    {draft.workRegion || '클릭해서 근무 지역 선택 (예: 충청남도 천안시)'}
                  </span>
                  <MapPin className="h-4.5 w-4.5 shrink-0 text-[#333333]" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>

          {/* Interests Card: 5 Categories + [전체 선택] / [전체 해제] Buttons */}
          <section className="card-soft rounded-3xl bg-white p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-extrabold text-[#1F2421]">
                  관심 분야
                </h2>
                <p className="mt-1 text-[15px] text-[#333333]">
                  온통청년 기준 5대 분야 중 관심 있는 지원을 여러 개 선택할 수 있어요.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono-num mr-1 text-[13px] font-bold text-[#333333] tabular-nums">
                  {draft.interests.length}/{POLICY_CATEGORIES.length} 선택됨
                </span>
                <button
                  type="button"
                  onClick={selectAllInterests}
                  className="cursor-pointer whitespace-nowrap rounded-xl border border-[#262A27]/30 bg-[#EEF1E3] px-3.5 py-2 text-[13px] font-bold text-[#1F2421] transition-colors hover:border-[#262A27] hover:bg-[#D8F279]"
                >
                  전체 선택
                </button>
                <button
                  type="button"
                  onClick={clearAllInterests}
                  className="btn-secondary-outline cursor-pointer whitespace-nowrap rounded-xl px-3.5 py-2 text-[13px]"
                >
                  전체 해제
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {POLICY_CATEGORIES.map((category) => {
                const checked = draft.interests.includes(category);
                return (
                  <label
                    key={category}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border-[1.5px] px-4 py-3 text-[15px] font-bold transition-colors ${
                      checked
                        ? 'border-[#262A27] bg-[#D8F279] text-[#1F2421]'
                        : 'border-[#C9C4B6] bg-[#FAF8F2] text-[#333333] hover:border-[#262A27]/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleInterest(category)}
                      className="sr-only"
                    />
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md border-[1.5px] ${
                        checked
                          ? 'border-[#1F2421] bg-[#1F2421] text-white'
                          : 'border-[#7D796E] bg-white'
                      }`}
                    >
                      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <span>{category}</span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Form Action Hierarchy: Cancel (Outline) vs Save (Primary Brand) */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setDraft(profile)}
              className="btn-secondary-outline cursor-pointer rounded-2xl px-6 py-3 text-[15px]"
            >
              취소
            </button>
            <button
              type="submit"
              className="btn-primary-brand cursor-pointer rounded-2xl px-7 py-3 text-[15px]"
            >
              내 정보 저장
            </button>
          </div>
        </form>

        {/* Right Info Sidebar */}
        <aside className="space-y-6 lg:col-span-4">
          <section className="card-tactile rounded-3xl bg-white p-6">
            <div className="flex items-center justify-between text-xs font-bold tracking-wider text-[#333333]">
              <span className="font-mono-num">MY NEXT WALLET</span>
              <Wallet className="h-4.5 w-4.5 text-[#1F2421]" aria-hidden="true" />
            </div>

            <h2 className="mt-3 text-2xl font-extrabold text-[#1F2421]">
              내 서류도, 한 곳에.
            </h2>
            <p className="mt-1.5 text-[15px] text-[#333333]">
              정책에 필요한 서류와 준비 안내를 함께 살펴봐요.
            </p>

            <div className="mt-5 flex items-center justify-between rounded-2xl border-[1.5px] border-[#262A27] bg-[#D8F279] p-4">
              <span className="font-mono-num text-sm font-extrabold text-[#1F2421]">
                N↗ NEXT WALLET
              </span>
              <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-[#1F2421]">
                연결 준비
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 divide-x divide-[#DCD7C9] border-t border-dashed border-[#C7C2B4] pt-4 text-center">
              <div>
                <span className="block text-[13px] font-semibold text-[#4A4D49]">
                  파일명 기록 문서
                </span>
                <strong className="font-mono-num mt-0.5 block text-2xl font-extrabold text-[#1F2421]">
                  {walletDocCount}
                </strong>
              </div>
              <div>
                <span className="block text-[13px] font-semibold text-[#4A4D49]">
                  보관한 안내
                </span>
                <strong className="font-mono-num mt-0.5 block text-2xl font-extrabold text-[#1F2421]">
                  {guideCount}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('wallet')}
              className="btn-primary-brand mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[15px]"
            >
              <span>내 전자지갑 열기</span>
              <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </section>

          <section className="card-soft rounded-3xl bg-[#EFECE3] p-6">
            <h2 className="text-lg font-extrabold text-[#1F2421]">
              정보를 입력하기 전에
            </h2>
            <ul className="mt-4 space-y-4 text-[14px] leading-relaxed text-[#333333]">
              <li className="border-b border-[#DCD7C9] pb-3">
                <strong className="block font-bold text-[#1F2421]">
                  주소지는 서로 달라도 돼요
                </strong>
                <span>
                  실제 주민등록지와 학교·근무 지역을 구분하면 확인할 조건을 놓치지 않아요.
                </span>
              </li>
              <li className="border-b border-[#DCD7C9] pb-3">
                <strong className="block font-bold text-[#1F2421]">
                  민감한 정보는 입력하지 않아요
                </strong>
                <span>
                  주민등록번호, 상세 주소, 소득·재산 정보는 이 화면에서 받지 않아요.
                </span>
              </li>
              <li>
                <strong className="block font-bold text-[#1F2421]">
                  내 브라우저에만 저장해요
                </strong>
                <span>
                  입력 정보는 현재 기기 브라우저에 안전하게 보관됩니다.
                </span>
              </li>
            </ul>
          </section>
        </aside>
      </div>

      {/* Hierarchical Region Picker Modal */}
      <RegionPickerModal
        isOpen={modalField !== null}
        title={modalTitle}
        currentValue={modalCurrentValue}
        allowEmpty={modalField !== 'residence'}
        onSelect={(regionValue) => {
          if (!modalField) return;
          setDraft((prev) => ({ ...prev, [modalField]: regionValue }));
        }}
        onClose={() => setModalField(null)}
      />
    </div>
  );
};
