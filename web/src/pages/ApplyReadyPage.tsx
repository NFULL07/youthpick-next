import React from 'react';
import { ArrowRight, Calendar, Check, RotateCcw, Trash2 } from 'lucide-react';
import type { RemovedPrepPolicySnapshot } from '../App';
import { PolicyItem, RouteId } from '../types/policy';

interface ApplyReadyPageProps {
  prepPolicies: PolicyItem[];
  activePolicy?: PolicyItem;
  completedChecklistIds: string[];
  targetDates: Record<string, string>;
  lastRemovedPolicy: RemovedPrepPolicySnapshot | null;
  onSelectActivePolicy: (id: string) => void;
  onRemovePrepPolicy: (id: string) => void;
  onUndoRemovePrepPolicy: () => void;
  onToggleChecklistItem: (itemId: string) => void;
  onSaveTargetDate: (policyId: string, date: string) => void;
  onNavigate: (route: RouteId, policyId?: string) => void;
}

export const ApplyReadyPage: React.FC<ApplyReadyPageProps> = ({
  prepPolicies,
  activePolicy,
  completedChecklistIds,
  targetDates,
  lastRemovedPolicy,
  onSelectActivePolicy,
  onRemovePrepPolicy,
  onUndoRemovePrepPolicy,
  onToggleChecklistItem,
  onSaveTargetDate,
  onNavigate,
}) => {
  const activePolicyId = activePolicy?.id ?? '';
  const savedTargetDate = activePolicyId ? (targetDates[activePolicyId] ?? '') : '';
  const [dateInput, setDateInput] = React.useState(savedTargetDate);

  React.useEffect(() => {
    setDateInput(savedTargetDate);
  }, [activePolicyId, savedTargetDate]);

  const totalCount = activePolicy ? activePolicy.checklist.length : 0;
  const doneCount = activePolicy
    ? activePolicy.checklist.filter((c) => completedChecklistIds.includes(c.id))
        .length
    : 0;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* 제목과 준비할 정책 고르기 */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="t-page">다음 한 칸씩, 준비해요.</h1>
          <p className="t-lead mt-2">
            진행 중인 준비와 필요한 문서, 나의 목표일을 함께 살펴봐요.
          </p>
        </div>

        {activePolicy && prepPolicies.length > 0 && (
          <div className="flex w-full min-w-0 flex-col items-end gap-2 sm:w-auto">
            <label
              htmlFor="prep-policy-select"
              className="block w-full text-right text-[13px] font-semibold text-ink-3"
            >
              준비할 정책 전환 ({prepPolicies.length}개)
            </label>
            <div className="flex w-full flex-col items-end gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <select
                id="prep-policy-select"
                value={activePolicy.id}
                onChange={(e) => onSelectActivePolicy(e.target.value)}
                className="field max-w-full cursor-pointer text-[14px] font-bold sm:max-w-[260px] lg:max-w-[340px]"
              >
                {prepPolicies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => onRemovePrepPolicy(activePolicy.id)}
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-[13px] font-bold text-bad hover:bg-bad-bg"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>준비 목록에서 빼기</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {lastRemovedPolicy && (
        <div
          role="status"
          data-testid="undo-remove-banner"
          className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-accent-soft px-5 py-3.5 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-2.5 text-[14px] font-semibold text-ink">
            <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>방금 준비 목록에서 뺀 정책을 다시 되돌릴 수 있어요.</span>
          </div>

          <button
            type="button"
            onClick={onUndoRemovePrepPolicy}
            className="btn-primary-brand inline-flex max-w-full shrink-0 cursor-pointer items-center gap-1.5 self-end rounded-xl px-4 py-2 text-left text-[13px] sm:self-auto"
          >
            <span>
              방금 뺀 &apos;{lastRemovedPolicy.policyTitle}&apos; 다시 되돌리기 ↩
            </span>
          </button>
        </div>
      )}

      {!activePolicy || prepPolicies.length === 0 ? (
        <section
          data-testid="apply-empty-state"
          className="card-soft rounded-3xl bg-surface px-6 py-12 text-center sm:px-10 sm:py-14"
        >
          <h2 className="t-section">
            아직 신청 준비 목록에 담은 정책이 없어요.
          </h2>
          <p className="mx-auto mt-2.5 max-w-lg text-[15px] leading-relaxed text-ink-2">
            &lt;정책 찾기&gt;나 공고 상세 화면에서{' '}
            <strong className="font-bold text-ink">준비 이어가기</strong>{' '}
            버튼을 누르면, 선택한 정책의 체크리스트와 목표일을 이곳에서 관리할 수 있어요.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('policies')}
            className="btn-primary-lime mt-6 inline-flex cursor-pointer items-center gap-2 rounded-2xl px-6 py-3.5 text-[15px]"
          >
            <span>정책 찾기로 이동</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>
      ) : (
        <>

      {/* Ongoing Pick Progress Banner */}
      <section className="card-tactile flex flex-col justify-between gap-6 rounded-3xl bg-surface p-6 sm:flex-row sm:items-center sm:p-7">
        <div>
          <p className="t-meta">
            {activePolicy.category} · {activePolicy.recruitmentStatus}
          </p>
          <h2 className="t-section mt-1">{activePolicy.title}</h2>
        </div>

        <div className="w-full space-y-2 sm:w-72">
          <div className="flex items-baseline justify-between">
            <span className="text-[14px] font-bold text-ink-2 tabular-nums">
              준비 점검 {doneCount}/{totalCount}
            </span>
            <strong className="text-3xl font-extrabold tabular-nums text-ink">
              {pct}%
            </strong>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-ink transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[13px] font-medium text-ink-3">
            준비 완료와 공식 제출은 시행기관 사이트에서 별도로 진행해요.
          </p>
        </div>
      </section>

      {/* Main Split: Checklist + Target Date */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="card-soft rounded-3xl bg-surface p-6 sm:p-8 lg:col-span-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="t-section">나의 준비 노트</h2>
            <button
              type="button"
              onClick={() => onNavigate('detail', activePolicy.id)}
              className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-lg text-[14px] font-bold text-ink-2 hover:text-ink"
            >
              <span>조건 표 보기</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="divide-y divide-line-soft">
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
                      className="peer sr-only"
                    />
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-[1.5px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ${
                        checked
                          ? 'border-ink bg-ink text-accent'
                          : 'border-ink-4 bg-surface'
                      }`}
                    >
                      {checked && <Check className="h-4 w-4" strokeWidth={3} />}
                    </span>
                    <div>
                      <strong
                        className={`block text-[16px] font-bold ${
                          checked
                            ? 'text-ink-4 line-through'
                            : 'text-ink'
                        }`}
                      >
                        {item.title}
                      </strong>
                      <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
                        {item.detail}
                      </p>
                    </div>
                  </label>

                  <span
                    className={`ml-9 shrink-0 self-start sm:ml-0 ${
                      checked ? 'badge badge-ok' : 'badge'
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
          <section className="rounded-3xl bg-peach p-6">
            <h2 className="t-section">나의 준비 목표일</h2>
            <p className="mt-1.5 text-[14px] text-ink-2">
              공식 마감일과 구분되는, 내가 정한 서류 준비 목표 일정이에요.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSaveTargetDate(activePolicy.id, dateInput);
              }}
              className="mt-5 flex items-center gap-2"
            >
              <div className="field flex flex-1 items-center gap-2 border-transparent focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
                <Calendar className="h-4 w-4 text-ink-2" aria-hidden="true" />
                <input
                  type="date"
                  aria-label="준비 목표일"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="w-full bg-transparent text-[14px] font-bold text-ink focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="btn-primary-brand cursor-pointer whitespace-nowrap rounded-xl px-4 py-2.5 text-[14px]"
              >
                저장
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between border-t border-dashed border-edge/30 pt-3 text-[14px]">
              <span className="font-semibold text-ink-2">설정된 목표일</span>
              <strong className="font-extrabold tabular-nums text-ink">
                {savedTargetDate || '미설정'}
              </strong>
            </div>
          </section>

          <section className="card-soft rounded-3xl bg-surface p-6">
            <h2 className="t-card">필요한 서류가 있다면</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
              전자지갑에서 발급처와 준비 상태를 한눈에 확인하고, 준비한 파일의 이름을 기록해 둘 수 있어요.
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
        </>
      )}
    </div>
  );
};
