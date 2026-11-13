import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  MapPin,
  Tag,
} from 'lucide-react';
import { RegionPickerModal } from '../components/RegionPickerModal';
import {
  AcademicWorkStatus,
  LifeChangeScenario,
  PolicyItem,
  RouteId,
  UserProfile,
} from '../types/policy';
import {
  analyzeLifeChangeImpacts,
  buildComparisonRows,
} from '../utils/policyEngine';

interface LifeSwitchPageProps {
  profile: UserProfile;
  policies: PolicyItem[];
  onNavigate: (route: RouteId, policyId?: string) => void;
}

const ACADEMIC_STATUSES: AcademicWorkStatus[] = [
  '대학 재학',
  '휴학',
  '졸업',
  '구직 중',
  '재직 중',
  '창업',
];

export const LifeSwitchPage: React.FC<LifeSwitchPageProps> = ({
  profile,
  policies,
  onNavigate,
}) => {
  const [scenario, setScenario] = useState<LifeChangeScenario>({
    residence: '충청남도 천안시',
    schoolRegion: profile.schoolRegion || '충청남도 천안시',
    academicStatus: '졸업',
    employmentStatus: '구직 중',
  });
  const [hasCompared, setHasCompared] = useState(true);
  const [activeRegionField, setActiveRegionField] = useState<
    'residence' | 'schoolRegion' | null
  >(null);

  const comparisonRows = useMemo(
    () => buildComparisonRows(profile, scenario),
    [profile, scenario]
  );

  const impactedPolicies = useMemo(
    () => analyzeLifeChangeImpacts(profile, scenario, policies),
    [profile, scenario, policies]
  );

  const applyPreset = (preset: 'grad-job' | 'move-cheonan' | 'grad-cheonan') => {
    if (preset === 'grad-job') {
      setScenario({
        residence: profile.residence || '경기도',
        schoolRegion: profile.schoolRegion || '충청남도 천안시',
        academicStatus: '졸업',
        employmentStatus: '구직 중',
      });
    } else if (preset === 'move-cheonan') {
      setScenario({
        residence: '충청남도 천안시',
        schoolRegion: profile.schoolRegion || '충청남도 천안시',
        academicStatus: profile.status,
        employmentStatus: '확인 전',
      });
    } else {
      setScenario({
        residence: '충청남도 천안시',
        schoolRegion: '충청남도 천안시',
        academicStatus: '졸업',
        employmentStatus: '구직 중',
      });
    }
    setHasCompared(true);
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] font-semibold text-[#333333]">
        <div>
          <span>나의 다음</span>
          <span className="mx-2 text-[#6B6E68]">/</span>
          <strong className="font-bold text-[#1F2421]">생활변화 비교</strong>
        </div>
        <span className="font-mono-num tracking-wider text-[#4A4D49]">
          YOUR NEXT, ONE PICK AT A TIME.
        </span>
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <p className="font-mono-num text-xs font-bold tracking-wider text-[#333333]">
          A LITTLE CHANGE, A NEW POSSIBILITY
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1F2421] sm:text-4xl">
          내일의 나에게, 어떤 다음이?
        </h1>
        <p className="text-[16px] text-[#333333]">
          지역·학적·취업 상태를 가정해 바꾸고, 변화에 따라 다시 살펴봐야 할 정책을 비교해 봐요.
        </p>
      </div>

      {/* Notice Banner */}
      <div className="flex items-start gap-3.5 rounded-2xl border border-[#C5B7EE] bg-[#EDE8FC] px-5 py-4">
        <ArrowRightLeft
          className="mt-0.5 h-5 w-5 shrink-0 text-[#1F2421]"
          aria-hidden="true"
        />
        <div>
          <strong className="block text-[15px] font-extrabold text-[#1F2421]">
            가정한 상황만 비교해요.
          </strong>
          <p className="text-[14px] text-[#333333]">
            이곳의 선택은 실제 내 정보에 저장되지 않아요. 최종 자격 여부는 각 정책의 공식 공고를 확인해 주세요.
          </p>
        </div>
      </div>

      {/* Preset Scenario Buttons */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => applyPreset('grad-job')}
          className="btn-secondary-outline inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[14px]"
        >
          <span>졸업 후 구직</span>
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => applyPreset('move-cheonan')}
          className="btn-secondary-outline inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[14px]"
        >
          <span>천안으로 전입</span>
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => applyPreset('grad-cheonan')}
          className="btn-secondary-outline inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[14px]"
        >
          <span>졸업 + 천안 전입</span>
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* BEFORE vs AFTER Cards */}
      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-11">
        {/* BEFORE */}
        <section className="card-soft rounded-3xl bg-white p-6 sm:p-7 lg:col-span-5">
          <p className="font-mono-num text-xs font-bold tracking-wider text-[#4A4D49]">
            BEFORE / 현재 내 정보
          </p>
          <h2 className="mt-1.5 text-2xl font-extrabold text-[#1F2421]">
            지금의 나
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="border-b border-[#E5E1D5] pb-3">
              <span className="block text-[13px] font-semibold text-[#4A4D49]">
                주민등록지
              </span>
              <strong className="mt-1 block text-[17px] font-bold text-[#1F2421]">
                {profile.residence || '미입력'}
              </strong>
            </div>
            <div className="border-b border-[#E5E1D5] pb-3">
              <span className="block text-[13px] font-semibold text-[#4A4D49]">
                학교 소재지
              </span>
              <strong className="mt-1 block text-[17px] font-bold text-[#1F2421]">
                {profile.schoolRegion || '해당 없음'}
              </strong>
            </div>
            <div className="border-b border-[#E5E1D5] pb-3">
              <span className="block text-[13px] font-semibold text-[#4A4D49]">
                학적·현재 상태
              </span>
              <strong className="mt-1 block text-[17px] font-bold text-[#1F2421]">
                {profile.status}
              </strong>
            </div>
            <div className="border-b border-[#E5E1D5] pb-3">
              <span className="block text-[13px] font-semibold text-[#4A4D49]">
                근무 지역
              </span>
              <strong className="mt-1 block text-[17px] font-bold text-[#1F2421]">
                {profile.workRegion || '해당 없음'}
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="mt-6 inline-flex cursor-pointer items-center gap-1.5 text-[14px] font-bold text-[#1F2421] hover:underline"
          >
            <span>현재 내 정보 수정</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>

        {/* Arrow Divider */}
        <div className="flex items-center justify-center lg:col-span-1">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-[#262A27] bg-[#D8F279] text-[#1F2421]">
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        {/* AFTER */}
        <section className="card-tactile rounded-3xl bg-[#EDE8FC] p-6 sm:p-7 lg:col-span-5">
          <p className="font-mono-num text-xs font-bold tracking-wider text-[#333333]">
            AFTER / 가정한 상황
          </p>
          <h2 className="mt-1.5 text-2xl font-extrabold text-[#1F2421]">
            변화 후의 나
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-[13px] font-bold text-[#1F2421]">
                주민등록지
              </span>
              <button
                type="button"
                onClick={() => setActiveRegionField('residence')}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border-[1.5px] border-[#262A27]/30 bg-white px-3.5 py-2.5 text-left text-[15px] font-semibold text-[#1F2421] hover:border-[#262A27]"
              >
                <span className="truncate">{scenario.residence}</span>
                <MapPin className="h-4 w-4 shrink-0 text-[#333333]" />
              </button>
            </div>

            <div>
              <span className="mb-1.5 block text-[13px] font-bold text-[#1F2421]">
                학교 소재지
              </span>
              <button
                type="button"
                onClick={() => setActiveRegionField('schoolRegion')}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl border-[1.5px] border-[#262A27]/30 bg-white px-3.5 py-2.5 text-left text-[15px] font-semibold text-[#1F2421] hover:border-[#262A27]"
              >
                <span className="truncate">
                  {scenario.schoolRegion || '해당 없음'}
                </span>
                <MapPin className="h-4 w-4 shrink-0 text-[#333333]" />
              </button>
            </div>

            <div>
              <label
                htmlFor="after-academic-status"
                className="mb-1.5 block text-[13px] font-bold text-[#1F2421]"
              >
                학적 상태
              </label>
              <select
                id="after-academic-status"
                value={scenario.academicStatus}
                onChange={(e) =>
                  setScenario((prev) => ({
                    ...prev,
                    academicStatus: e.target.value as AcademicWorkStatus,
                  }))
                }
                className="w-full cursor-pointer rounded-xl border-[1.5px] border-[#262A27]/30 bg-white px-3.5 py-2.5 text-[15px] font-semibold text-[#1F2421]"
              >
                {ACADEMIC_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="after-employment-status"
                className="mb-1.5 block text-[13px] font-bold text-[#1F2421]"
              >
                취업 상태
              </label>
              <select
                id="after-employment-status"
                value={scenario.employmentStatus}
                onChange={(e) =>
                  setScenario((prev) => ({
                    ...prev,
                    employmentStatus: e.target
                      .value as LifeChangeScenario['employmentStatus'],
                  }))
                }
                className="w-full cursor-pointer rounded-xl border-[1.5px] border-[#262A27]/30 bg-white px-3.5 py-2.5 text-[15px] font-semibold text-[#1F2421]"
              >
                <option value="확인 전">확인 전</option>
                <option value="구직 중">구직 중</option>
                <option value="재직 중">재직 중</option>
                <option value="프리랜서·창업">프리랜서·창업</option>
              </select>
            </div>
          </div>
        </section>
      </div>

      {/* Run Comparison CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-[14px] font-medium text-[#333333]">
          가정한 상황이에요. 실제 자격 변화·예상 지원금은 공식 기준 확인 전까지 판정하지 않아요.
        </p>
        <button
          type="button"
          onClick={() => setHasCompared(true)}
          className="btn-primary-lime inline-flex cursor-pointer items-center gap-2 rounded-2xl px-6 py-3.5 text-[15px]"
        >
          <span>이 조건으로 비교하기</span>
          <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
      </div>

      {/* Comparison Results: Generously Padded Table + Elevated Card List for [다시 살펴볼 정책] */}
      {hasCompared && (
        <div className="space-y-8 pt-2">
          {/* Diff Table with Generous Padding (px-6 py-5) */}
          <section className="card-soft overflow-hidden rounded-3xl bg-white">
            <div className="border-b border-[#DCD7C9] bg-[#FAF8F2] px-6 py-4">
              <h2 className="text-lg font-extrabold text-[#1F2421]">
                조건 변화 비교표
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#DCD7C9] bg-[#F7F5EE] text-[14px] font-extrabold text-[#1F2421]">
                    <th className="px-6 py-4">비교 항목</th>
                    <th className="px-6 py-4">현재 (BEFORE)</th>
                    <th className="px-6 py-4">변화 후 (AFTER)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECE8DC] text-[15px]">
                  {comparisonRows.map((row) => (
                    <tr key={row.fieldLabel}>
                      <td className="px-6 py-5 font-bold text-[#1F2421]">
                        {row.fieldLabel}
                      </td>
                      <td className="px-6 py-5 text-[#333333]">
                        {row.beforeValue}
                      </td>
                      <td
                        className={`px-6 py-5 ${
                          row.changed ? 'bg-[#EEF6CE]' : ''
                        }`}
                      >
                        <strong className="block font-bold text-[#1F2421]">
                          {row.afterValue}
                        </strong>
                        {row.changed && (
                          <span className="mt-1 inline-block text-[13px] font-bold text-[#2F4F1C]">
                            변경됨
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Requirement #5: Redesigned [다시 살펴볼 정책] Elevated Card List */}
          <section aria-label="다시 살펴볼 정책" className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-2xl font-extrabold text-[#1F2421]">
                다시 살펴볼 정책
              </h2>
              <span className="text-[14px] font-semibold text-[#333333]">
                변화된 조건 태그를 기준으로 우선 확인이 필요한 {impactedPolicies.length}개 정책
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {impactedPolicies.map((impact) => (
                <article
                  key={impact.policy.id}
                  data-testid="recheck-policy-card"
                  className="card-tactile flex flex-col justify-between gap-5 rounded-3xl bg-white p-6 transition-transform duration-150 hover:-translate-y-0.5 md:flex-row md:items-center"
                >
                  <div className="space-y-3">
                    {/* Category & Recruitment Status Meta */}
                    <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold">
                      <span className="rounded-lg border border-[#262A27]/30 bg-[#F7F5EE] px-2.5 py-1 text-[#1F2421]">
                        {impact.policy.category}
                      </span>
                      <span
                        className={`rounded-lg border px-2.5 py-1 ${
                          impact.policy.recruitmentStatus === '모집 중'
                            ? 'border-[#262A27] bg-[#D8F279] text-[#1F2421]'
                            : impact.policy.recruitmentStatus === '마감'
                              ? 'border-[#9E998B] bg-[#EAE6DA] text-[#333333]'
                              : 'border-[#B8860B] bg-[#FFF0CC] text-[#1F2421]'
                        }`}
                      >
                        {impact.policy.recruitmentStatus}
                      </span>
                      <span className="text-[#4A4D49]">
                        {impact.policy.agencyLabel}
                      </span>
                    </div>

                    {/* Emphasized Policy Name */}
                    <h3 className="text-xl font-extrabold text-[#1F2421]">
                      {impact.policy.title}
                    </h3>

                    {/* Impact Summary */}
                    <p className="text-[15px] font-medium leading-relaxed text-[#333333]">
                      {impact.impactSummary}
                    </p>

                    {/* Changed Condition Tags */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {impact.changedTags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#262A27]/25 bg-[#EDE8FC] px-3 py-1.5 text-[13px] font-bold text-[#1F2421]"
                        >
                          <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Clear Primary CTA Button */}
                  <div className="flex shrink-0 items-center md:pl-4">
                    <button
                      type="button"
                      onClick={() => onNavigate('detail', impact.policy.id)}
                      className="btn-primary-brand inline-flex w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-6 py-3.5 text-[15px] md:w-auto"
                    >
                      <span>자세히 보기</span>
                      <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Region Picker Modal for AFTER inputs */}
      <RegionPickerModal
        isOpen={activeRegionField !== null}
        title={
          activeRegionField === 'residence'
            ? '가정 주민등록지 선택'
            : '가정 학교 소재지 선택'
        }
        currentValue={
          activeRegionField === 'residence'
            ? scenario.residence
            : scenario.schoolRegion
        }
        allowEmpty={activeRegionField === 'schoolRegion'}
        onSelect={(val) => {
          if (activeRegionField === 'residence') {
            setScenario((prev) => ({ ...prev, residence: val }));
          } else if (activeRegionField === 'schoolRegion') {
            setScenario((prev) => ({ ...prev, schoolRegion: val }));
          }
        }}
        onClose={() => setActiveRegionField(null)}
      />
    </div>
  );
};
