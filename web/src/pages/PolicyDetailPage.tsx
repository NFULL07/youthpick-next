import React from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, MessageCircle } from 'lucide-react';
import { CRITERIA_RESULT_STYLE, OfficialLink, PolicyItem, RouteId, UserProfile } from '../types/policy';
import { evaluatePolicyCriteria } from '../utils/policyEngine';
import { DirectInputSection } from '../components/DirectInputSection';
import { useVirtualWallet } from '../utils/virtualWalletContext';
import { walletPresetValues } from '../utils/walletAnswers';

interface PolicyDetailPageProps {
  policy: PolicyItem;
  profile: UserProfile;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onNavigate: (route: RouteId, policyId?: string) => void;
  onStartPreparation: (policyId: string) => void;
  onAskSherpaAboutPolicy: (policy: PolicyItem) => void;
}

/** 판단 근거의 출처 링크(새 창). 표와 휴대폰 카드에서 같이 쓴다. 출처가 기사일 수도 있어 "원문"이라 부르지 않는다 */
const SourceLinks: React.FC<{ links?: OfficialLink[] }> = ({ links }) =>
  links && links.length > 0 ? (
    <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 font-bold text-[#1F2421] underline underline-offset-2"
        >
          출처 열기
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">: {link.label} (새 창)</span>
        </a>
      ))}
    </span>
  ) : null;

export const PolicyDetailPage: React.FC<PolicyDetailPageProps> = ({
  policy,
  profile,
  isSaved,
  onToggleSave,
  onNavigate,
  onStartPreparation,
  onAskSherpaAboutPolicy,
}) => {
  const wallet = useVirtualWallet();
  const criteriaRows = evaluatePolicyCriteria(policy, profile, wallet);

  return (
    <div className="space-y-8">
      {/* Top Back Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate('policies')}
          className="btn-secondary-outline inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-[14px]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>정책 목록으로</span>
        </button>

        <span className="font-mono-num text-xs font-bold tracking-wider text-[#4A4D49]">
          YOUR NEXT, ONE PICK AT A TIME.
        </span>
      </div>

      {/* Pastel Banner Header */}
      <section className="card-tactile rounded-3xl bg-[#FBE1D6] p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2.5 text-[14px] font-bold text-[#1F2421]">
          <span className="rounded-lg border border-[#262A27]/30 bg-white/85 px-3 py-1">
            {policy.category}
          </span>
          <span className="rounded-lg border border-[#262A27] bg-[#D8F279] px-3 py-1">
            {policy.recruitmentStatus}
          </span>
          <span className="text-[#333333]">{policy.agencyLabel}</span>
        </div>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#1F2421] sm:text-4xl">
          {policy.title}
        </h1>
        <p className="mt-2.5 max-w-3xl text-[16px] leading-relaxed text-[#333333]">
          {policy.shortDescription}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-dashed border-[#262A27]/30 pt-5 sm:grid-cols-2">
          <div>
            <span className="block text-[13px] font-bold text-[#4A4D49]">
              모집 일정
            </span>
            <strong className="mt-0.5 block text-[16px] font-extrabold text-[#1F2421]">
              {policy.deadlineLabel}
            </strong>
          </div>
          <div>
            <span className="block text-[13px] font-bold text-[#4A4D49]">
              주요 지원 내용
            </span>
            <strong className="mt-0.5 block text-[16px] font-extrabold text-[#1F2421]">
              {policy.supportSummary}
            </strong>
          </div>
        </div>

        <div className="mt-5 border-t border-dashed border-[#262A27]/30 pt-5">
          <span className="block text-[13px] font-bold text-[#4A4D49]">공식 안내 (새 창)</span>
          {policy.officialLinks && policy.officialLinks.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="공식 안내 링크">
              {policy.officialLinks.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl border-[1.5px] border-[#262A27] bg-white px-3.5 py-2 text-[14px] font-bold text-[#1F2421] hover:bg-[#FAF8F2]"
                  >
                    <span>{link.label}</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[14px] text-[#333333]">
              등록된 공식 링크가 아직 없어요. 운영기관 누리집에서 공고를 확인해 주세요.
            </p>
          )}
        </div>
      </section>

      {/* Main Split: Generously Padded Criteria Table + Action Sidebar */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="card-soft rounded-3xl bg-white p-6 sm:p-8 lg:col-span-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-2xl font-extrabold text-[#1F2421]">
              공고 기준과 나의 조건
            </h2>
            <span className="rounded-lg border border-[#B8860B] bg-[#FFF0CC] px-3 py-1 text-[13px] font-bold text-[#1F2421]">
              세부 조건 확인
            </span>
          </div>
          <p className="mb-6 text-[15px] leading-relaxed text-[#333333]">
            학교가 타 지역에 있더라도 모든 정책이 재학 지역을 동일하게 인정하는 것은
            아니에요. 주민등록상 거주지, 학교·근무지 기준을 표에서 항목별로 대조해 보세요.
          </p>

          {/* 휴대폰(md 미만): 표가 좁은 화면에서 '확인 결과' 열을 밀어내서(11/24 점검) 항목별 카드로 보여 준다 */}
          <ul className="space-y-3 md:hidden" aria-label="공고 기준과 나의 조건">
            {criteriaRows.map((row) => (
              <li key={row.item} className="rounded-2xl border border-[#DCD7C9] p-4 break-keep">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-[15px] font-bold text-[#1F2421]">{row.item}</strong>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] font-bold ${CRITERIA_RESULT_STYLE[row.result]}`}
                  >
                    <span aria-hidden="true" className="font-mono-num">
                      {row.result}
                    </span>
                    <span>{row.status}</span>
                  </span>
                </div>
                <dl className="mt-3 space-y-2 text-[14px] leading-relaxed text-[#333333]">
                  <div>
                    <dt className="text-[12px] font-bold text-[#4A4D49]">공고 기준</dt>
                    <dd>{row.officialRule}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-bold text-[#4A4D49]">내 정보</dt>
                    <dd className="font-semibold text-[#1F2421]">
                      {row.userMatchNote}
                      {row.result === 'X' && row.reason && (
                        <span className="mt-1 block font-bold text-[#A33A1E]">
                          <span aria-hidden="true">! </span>
                          {row.reason}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[12px] font-bold text-[#4A4D49]">판단 근거</dt>
                    <dd className="text-[13px]">
                      {row.basis}
                      <SourceLinks links={row.sources} />
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>

          {/* Table with generous padding (px-5 py-5) and break-keep for clean Korean readability */}
          <div className="hidden overflow-x-auto rounded-2xl border border-[#DCD7C9] md:block">
            <table className="w-full min-w-[680px] border-collapse text-left break-keep">
              <thead>
                <tr className="border-b-[1.5px] border-[#262A27]/25 bg-[#F7F5EE] text-[14px] font-extrabold text-[#1F2421]">
                  <th className="w-[18%] px-5 py-4 whitespace-nowrap">항목</th>
                  <th className="w-[27%] px-5 py-4">공고 기준</th>
                  <th className="w-[22%] px-5 py-4">내 정보</th>
                  <th className="w-[13%] px-5 py-4 whitespace-nowrap">확인 결과</th>
                  <th className="w-[20%] px-5 py-4">판단 근거</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E1D5] text-[15px] leading-relaxed text-[#333333]">
                {criteriaRows.map((row) => (
                  <tr
                    key={row.item}
                    className="transition-colors hover:bg-[#FAF8F2]"
                  >
                    <td className="px-5 py-5 font-bold text-[#1F2421] align-top">
                      {row.item}
                    </td>
                    <td className="px-5 py-5 align-top">{row.officialRule}</td>
                    <td className="px-5 py-5 font-semibold text-[#1F2421] align-top">
                      {row.userMatchNote}
                      {row.result === 'X' && row.reason && (
                        <span className="mt-1.5 block text-[14px] font-bold text-[#A33A1E]">
                          <span aria-hidden="true">! </span>
                          {row.reason}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-5 whitespace-nowrap align-top">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] font-bold ${CRITERIA_RESULT_STYLE[row.result]}`}
                      >
                        <span aria-hidden="true" className="font-mono-num">
                          {row.result}
                        </span>
                        <span>{row.status}</span>
                      </span>
                    </td>
                    <td className="px-5 py-5 text-[14px] text-[#333333] align-top">
                      {row.basis}
                      <SourceLinks links={row.sources} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 정책이 바뀌면 key로 입력값을 비운다 */}
          <DirectInputSection
            key={`${policy.id}:${wallet?.id ?? 'none'}`}
            policy={policy}
            presetValues={
              wallet && policy.ruleSet
                ? walletPresetValues(wallet, policy.ruleSet.inputItems, policy.ruleSet.rules)
                : undefined
            }
          />
        </section>

        {/* Right Action Sidebar: lg 이상에서는 긴 조건표 옆에 따라오도록 sticky (lg 미만 배치는 그대로) */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:col-span-4 lg:self-start">
          <div className="card-tactile rounded-3xl bg-[#EEF1E3] p-6">
            <span className="font-mono-num text-xs font-bold tracking-wider text-[#333333]">
              ONE MORE STEP
            </span>
            <h3 className="mt-2 text-2xl font-extrabold leading-snug text-[#1F2421]">
              알아본 정책,
              <br />내 준비로 이어가요.
            </h3>
            <p className="mt-2.5 text-[15px] leading-relaxed text-[#333333]">
              공고 확인부터 필요 서류 점검까지, 다음 해야 할 일을 신청 준비
              노트에 담아드려요.
            </p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => onStartPreparation(policy.id)}
                className="btn-primary-lime flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[15px]"
              >
                <span>준비 이어가기</span>
                <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onToggleSave(policy.id)}
                className="btn-secondary-outline flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-[14px]"
              >
                <Bookmark
                  className="h-4 w-4"
                  fill={isSaved ? 'currentColor' : 'none'}
                />
                <span>
                  {isSaved ? '저장 목록에서 빼기' : '나중에 볼 정책으로 저장'}
                </span>
              </button>
            </div>
          </div>

          <div className="card-soft rounded-3xl bg-white p-6">
            <h3 className="text-lg font-extrabold text-[#1F2421]">
              이 조건이 헷갈린다면?
            </h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-[#333333]">
              내비게이터에게 내 생활권과 서류 기준을 쉬운 말로 물어보세요.
            </p>
            <button
              type="button"
              onClick={() => onAskSherpaAboutPolicy(policy)}
              className="btn-primary-brand mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-[14px]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span>AI에게 물어보기</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
