import React from 'react';
import { ArrowRight, Calendar, Check } from 'lucide-react';
import { PolicyItem, RouteId } from '../types/policy';

interface ApplyReadyPageProps {
  policies: PolicyItem[];
  activePolicy: PolicyItem;
  completedChecklistIds: string[];
  targetDate: string;
  onSelectActivePolicy: (id: string) => void;
  onToggleChecklistItem: (itemId: string) => void;
  onSaveTargetDate: (date: string) => void;
  onNavigate: (route: RouteId, policyId?: string) => void;
}

export const ApplyReadyPage: React.FC<ApplyReadyPageProps> = ({
  policies,
  activePolicy,
  completedChecklistIds,
  targetDate,
  onSelectActivePolicy,
  onToggleChecklistItem,
  onSaveTargetDate,
  onNavigate,
}) => {
  const [dateInput, setDateInput] = React.useState(targetDate);

  React.useEffect(() => {
    setDateInput(targetDate);
  }, [targetDate]);

  const totalCount = activePolicy.checklist.length;
  const doneCount = activePolicy.checklist.filter((c) =>
    completedChecklistIds.includes(c.id)
  ).length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] font-semibold text-[#333333]">
        <div>
          <span>나의 다음</span>
          <span className="mx-2 text-[#6B6E68]">/</span>
          <strong className="font-bold text-[#1F2421]">신청 준비</strong>
        </div>
        <span className="font-mono-num tracking-wider text-[#4A4D49]">
          YOUR NEXT, ONE PICK AT A TIME.
        </span>
      </div>

      {/* Heading & Policy Switcher */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <p className="font-mono-num text-xs font-bold tracking-wider text-[#333333]">
            ONE STEP CLOSER
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1F2421] sm:text-4xl">
            다음 한 칸씩, 준비해요.
          </h1>
          <p className="text-[16px] text-[#333333]">
            진행 중인 준비와 필요한 문서, 나의 목표일을 함께 살펴봐요.
          </p>
        </div>

        <div>
          <label
            htmlFor="prep-policy-select"
            className="mb-1 block text-[13px] font-bold text-[#333333]"
          >
            준비할 정책 전환
          </label>
          <select
            id="prep-policy-select"
            value={activePolicy.id}
            onChange={(e) => onSelectActivePolicy(e.target.value)}
            className="cursor-pointer rounded-xl border-[1.5px] border-[#262A27] bg-white px-4 py-2.5 text-[14px] font-bold text-[#1F2421]"
          >
            {policies.slice(0, 5).map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ongoing Pick Progress Banner */}
      <section className="card-tactile flex flex-col justify-between gap-6 rounded-3xl bg-white p-6 sm:flex-row sm:items-center">
        <div className="space-y-1.5">
          <span className="font-mono-num text-xs font-bold tracking-wider text-[#4A4D49]">
            MY ONGOING PICK
          </span>
          <h2 className="text-2xl font-extrabold text-[#1F2421]">
            {activePolicy.title}
          </h2>
          <p className="text-[14px] font-semibold text-[#333333]">
            {activePolicy.category} · {activePolicy.recruitmentStatus}
          </p>
        </div>

        <div className="w-full space-y-2 sm:w-72">
          <div className="flex items-baseline justify-between">
            <span className="text-[14px] font-bold text-[#333333] tabular-nums">
              준비 점검 {doneCount}/{totalCount}
            </span>
            <strong className="font-mono-num text-3xl font-extrabold text-[#1F2421]">
              {pct}%
            </strong>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full border border-[#262A27]/30 bg-[#EFECE3]">
            <div
              className="h-full bg-[#D8F279] transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[13px] font-medium text-[#4A4D49]">
            준비 완료와 공식 제출은 시행기관 사이트에서 별도로 진행해요.
          </p>
        </div>
      </section>

      {/* Main Split: Checklist + Target Date */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="card-soft rounded-3xl bg-white p-6 sm:p-8 lg:col-span-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-[#1F2421]">
              나의 준비 노트
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('detail', activePolicy.id)}
              className="btn-secondary-outline inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px]"
            >
              <span>조건 표 보기</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#ECE8DC]">
            {activePolicy.checklist.map((item) => {
              const checked = completedChecklistIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <label className="flex flex-1 cursor-pointer items-start gap-3.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleChecklistItem(item.id)}
                      className="sr-only"
                    />
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-[1.5px] transition-colors ${
                        checked
                          ? 'border-[#1F2421] bg-[#1F2421] text-[#D8F279]'
                          : 'border-[#7D796E] bg-white'
                      }`}
                    >
                      {checked && <Check className="h-4 w-4" strokeWidth={3} />}
                    </span>
                    <div>
                      <strong
                        className={`block text-[16px] font-bold ${
                          checked
                            ? 'text-[#5C5F5B] line-through'
                            : 'text-[#1F2421]'
                        }`}
                      >
                        {item.title}
                      </strong>
                      <p className="mt-1 text-[14px] leading-relaxed text-[#333333]">
                        {item.detail}
                      </p>
                    </div>
                  </label>

                  <span
                    className={`inline-flex shrink-0 self-start rounded-lg border px-2.5 py-1 text-[13px] font-bold ${
                      checked
                        ? 'border-[#262A27]/30 bg-[#D8F279] text-[#1F2421]'
                        : 'border-[#C9C4B6] bg-[#F7F5EE] text-[#333333]'
                    }`}
                  >
                    {checked ? '완료' : item.tag}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Target Date */}
        <aside className="space-y-5 lg:col-span-4">
          <section className="card-tactile rounded-3xl bg-[#FBE1D6] p-6">
            <span className="font-mono-num text-xs font-bold tracking-wider text-[#333333]">
              MY TARGET DATE
            </span>
            <h3 className="mt-2 text-2xl font-extrabold text-[#1F2421]">
              나의 준비 목표일
            </h3>
            <p className="mt-1.5 text-[14px] text-[#333333]">
              공식 마감일과 구분되는, 내가 정한 서류 준비 목표 일정이에요.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSaveTargetDate(dateInput);
              }}
              className="mt-5 flex items-center gap-2"
            >
              <div className="flex flex-1 items-center gap-2 rounded-xl border-[1.5px] border-[#262A27]/40 bg-white px-3 py-2.5">
                <Calendar className="h-4 w-4 text-[#333333]" aria-hidden="true" />
                <input
                  type="date"
                  aria-label="준비 목표일"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="w-full bg-transparent text-[14px] font-bold text-[#1F2421] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="btn-primary-brand cursor-pointer whitespace-nowrap rounded-xl px-4 py-2.5 text-[14px]"
              >
                저장
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between border-t border-dashed border-[#262A27]/30 pt-3 text-[14px]">
              <span className="font-semibold text-[#333333]">설정된 목표일</span>
              <strong className="font-mono-num font-extrabold text-[#1F2421]">
                {targetDate || '미설정'}
              </strong>
            </div>
          </section>

          <section className="card-soft rounded-3xl bg-white p-6">
            <h3 className="text-lg font-extrabold text-[#1F2421]">
              필요한 서류가 있다면
            </h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#333333]">
              전자지갑에서 발급처와 준비 상태를 한눈에 확인하고 파일을 보관할 수 있어요.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('wallet')}
              className="btn-secondary-outline mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-[14px]"
            >
              <span>전자지갑으로 이동</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
};
