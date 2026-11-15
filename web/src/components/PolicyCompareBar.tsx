import React, { useState } from 'react';
import { PolicyItem } from '../types/policy';

interface PolicyCompareBarProps {
  comparedPolicies: PolicyItem[];
  onClearCompare: () => void;
}

export const PolicyCompareBar: React.FC<PolicyCompareBarProps> = ({
  comparedPolicies,
  onClearCompare,
}) => {
  const [showCompareModal, setShowCompareModal] = useState(false);

  if (comparedPolicies.length === 0) {
    return null;
  }

  return (
    <>
      {/* Bottom Floating Comparison Bar: lg 미만에서는 BottomNav 위쪽, lg 이상에서는 하단 6 */}
      <div
        data-testid="policy-compare-bar"
        className="fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-2.5 rounded-2xl border-[1.5px] border-[#262A27] bg-[#1F2421] px-4 py-3 text-white shadow-xl sm:px-5 sm:py-3.5 lg:inset-x-auto lg:bottom-6 lg:left-1/2 lg:w-full lg:-translate-x-1/2"
      >
        <div className="text-[14px] font-semibold">
          비교 선택한 정책{' '}
          <strong className="text-[#D8F279] tabular-nums">
            {comparedPolicies.length}개
          </strong>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClearCompare}
            className="cursor-pointer whitespace-nowrap rounded-xl border border-white/30 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-white/10"
          >
            선택 비우기
          </button>
          <button
            type="button"
            onClick={() => setShowCompareModal(true)}
            className="btn-primary-lime cursor-pointer whitespace-nowrap rounded-xl px-4 py-2 text-[13px]"
          >
            한눈에 표로 비교하기
          </button>
        </div>
      </div>

      {/* Side-by-side Policy Comparison Modal with Horizontal Scroll & Sticky Criteria Column */}
      {showCompareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2421]/50 p-4 backdrop-blur-[2px]"
          onClick={() => setShowCompareModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="선택한 정책 비교표"
            className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border-[1.5px] border-[#262A27] bg-white p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex shrink-0 items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold text-[#1F2421]">
                선택한 정책 조건 한눈에 비교하기
              </h2>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                className="btn-secondary-outline shrink-0 cursor-pointer whitespace-nowrap rounded-xl px-3.5 py-1.5 text-sm"
              >
                닫기
              </button>
            </div>

            <div className="overflow-x-auto overflow-y-auto rounded-2xl border border-[#DCD7C9]">
              <table className="w-max min-w-full border-separate border-spacing-0 text-left text-[15px]">
                <thead>
                  <tr className="bg-[#F7F5EE] text-[#1F2421]">
                    <th className="sticky left-0 z-10 min-w-[130px] whitespace-nowrap border-b border-r border-[#DCD7C9] bg-[#F7F5EE] px-5 py-4 align-top font-bold">
                      비교 기준
                    </th>
                    {comparedPolicies.map((p) => (
                      <th
                        key={p.id}
                        className="min-w-[220px] max-w-[260px] border-b border-[#262A27]/20 bg-[#F7F5EE] px-6 py-4 align-top font-extrabold"
                      >
                        {p.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-[#333333] [&_tr:last-child_td]:border-b-0">
                  <tr>
                    <td className="sticky left-0 z-10 min-w-[130px] whitespace-nowrap border-b border-r border-[#DCD7C9] bg-white px-5 py-4 align-top font-bold text-[#1F2421]">
                      분류
                    </td>
                    {comparedPolicies.map((p) => (
                      <td
                        key={p.id}
                        className="min-w-[220px] max-w-[260px] border-b border-[#ECE8DC] px-6 py-4 align-top"
                      >
                        {p.category}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="sticky left-0 z-10 min-w-[130px] whitespace-nowrap border-b border-r border-[#DCD7C9] bg-white px-5 py-4 align-top font-bold text-[#1F2421]">
                      모집 상태
                    </td>
                    {comparedPolicies.map((p) => (
                      <td
                        key={p.id}
                        className="min-w-[220px] max-w-[260px] border-b border-[#ECE8DC] px-6 py-4 align-top font-semibold"
                      >
                        {p.recruitmentStatus} ({p.deadlineLabel})
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="sticky left-0 z-10 min-w-[130px] whitespace-nowrap border-b border-r border-[#DCD7C9] bg-white px-5 py-4 align-top font-bold text-[#1F2421]">
                      지원 내용
                    </td>
                    {comparedPolicies.map((p) => (
                      <td
                        key={p.id}
                        className="min-w-[220px] max-w-[260px] border-b border-[#ECE8DC] px-6 py-4 align-top leading-relaxed"
                      >
                        {p.supportSummary}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="sticky left-0 z-10 min-w-[130px] whitespace-nowrap border-b border-r border-[#DCD7C9] bg-white px-5 py-4 align-top font-bold text-[#1F2421]">
                      필수 확인 서류
                    </td>
                    {comparedPolicies.map((p) => (
                      <td
                        key={p.id}
                        className="min-w-[220px] max-w-[260px] border-b border-[#ECE8DC] px-6 py-4 align-top leading-relaxed"
                      >
                        {p.requiredDocs.join(', ')}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
