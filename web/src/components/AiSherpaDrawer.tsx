import React, { useState } from 'react';
import { ArrowUpRight, Compass, RotateCcw, Send, X } from 'lucide-react';
import { PolicyItem, RouteId, UserProfile } from '../types/policy';
import {
  SherpaMessage,
  generateDeterministicSherpaReply,
  getSuggestedPrompts,
} from '../utils/sherpaEngine';

interface AiSherpaDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  route: RouteId;
  profile: UserProfile;
  selectedPolicy?: PolicyItem;
  policies: PolicyItem[];
  onNavigate: (route: RouteId, policyId?: string) => void;
  hasCompareBar?: boolean;
}

const ROUTE_LABELS: Record<RouteId, string> = {
  home: '나의 보드',
  policies: '정책 찾기',
  switch: '생활변화 비교',
  apply: '신청 준비',
  profile: '내 정보',
  wallet: '전자지갑',
  detail: '정책 상세',
};

export const AiSherpaDrawer: React.FC<AiSherpaDrawerProps> = ({
  isOpen,
  onToggle,
  route,
  profile,
  selectedPolicy,
  policies,
  onNavigate,
  hasCompareBar = false,
}) => {
  const [messages, setMessages] = useState<SherpaMessage[]>([]);
  const [inputValue, setInputValue] = useState('');

  const suggestedPrompts = getSuggestedPrompts(route);

  const handleAsk = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: SherpaMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: trimmed,
    };
    const reply = generateDeterministicSherpaReply(trimmed, {
      route,
      profile,
      selectedPolicy,
      policies,
    });
    setMessages((prev) => [...prev, userMsg, reply]);
    setInputValue('');
  };

  return (
    <>
      {/* Dimmed Backdrop Overlay when AI Sherpa Drawer is open */}
      {isOpen && (
        <div
          aria-hidden="true"
          data-testid="ai-navigator-backdrop"
          onClick={onToggle}
          className="fixed inset-0 z-[45] bg-black/40"
        />
      )}

      {/* Widened AI Sherpa / Navigator Drawer (560px desktop width: >30% wider than 380px) */}
      {isOpen && (
        <aside
          role="dialog"
          aria-label="AI 내비게이터 (AI 셰르파)"
          data-testid="ai-navigator-drawer"
          className={`fixed left-2 right-2 top-2 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-[0_16px_48px_rgb(31_36_33/0.22)] md:left-auto md:right-6 md:top-auto md:w-[min(560px,calc(100vw-2rem))] md:rounded-3xl ${
            hasCompareBar
              ? 'md:bottom-[calc(13.75rem+env(safe-area-inset-bottom))] md:h-[min(600px,calc(100vh-16rem))] lg:bottom-[10.75rem] lg:h-[min(600px,calc(100vh-12rem))]'
              : 'md:bottom-[calc(9rem+env(safe-area-inset-bottom))] md:h-[min(680px,calc(100vh-14rem))] lg:bottom-20 lg:h-[min(680px,calc(100vh-7rem))]'
          }`}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between bg-lavender px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-ink">
                <Compass className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[15px] font-extrabold leading-tight text-ink">
                  AI 내비게이터 (AI 셰르파)
                </h2>
                <p className="text-[12px] font-medium text-ink-2">
                  내 조건·화면 맥락 기반 규칙형 안내
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggle}
              aria-label="AI 내비게이터 닫기"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-ink hover:bg-surface/60"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Context Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-line-soft bg-surface px-4 py-1.5 text-[12px] font-semibold text-ink-2">
            <span className="min-w-0 truncate">
              현재 화면 · <strong className="text-ink">{ROUTE_LABELS[route]}</strong>
              {selectedPolicy ? ` (${selectedPolicy.title})` : ''}
            </span>
            <button
              type="button"
              onClick={() => setMessages([])}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-ink-2 hover:bg-surface-3 hover:text-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>새로 시작</span>
            </button>
          </div>

          {/* Scrollable Conversation Area */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-surface p-3.5">
                  <h3 className="text-[16px] font-extrabold leading-snug text-ink">
                    다음 한 칸,{' '}
                    <span className="bg-accent px-1">같이 찾아볼까요?</span>
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                    어려운 정책 용어 대신 지금 내 조건(만 {profile.age}세 ·{' '}
                    {profile.status} · 거주 {profile.residence || '미입력'})부터
                    차근차근 풀어드려요.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[12px] font-bold text-ink-2">
                    자주 묻는 질문 바로 보기
                  </p>
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleAsk(prompt)}
                      className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 text-left text-[13px] font-semibold text-ink transition-colors hover:bg-sage"
                    >
                      <span>{prompt}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-2" aria-hidden="true" />
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onNavigate('wallet')}
                    className="btn-secondary-outline inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 text-[12px]"
                  >
                    <span>전자지갑 연결</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('apply')}
                    className="btn-secondary-outline inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 text-[12px]"
                  >
                    <span>신청 준비 노트</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[92%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${
                        msg.sender === 'user'
                          ? 'bg-ink font-semibold text-white'
                          : 'border border-line bg-surface text-ink'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.sender === 'assistant' && msg.actionLabel && msg.targetRoute && (
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate(msg.targetRoute!, msg.targetPolicyId);
                        }}
                        className="btn-primary-lime mt-1.5 inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 text-[12px]"
                      >
                        <span>{msg.actionLabel}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(inputValue);
            }}
            className="border-t border-line bg-surface px-3 py-2.5"
          >
            <label htmlFor="sherpa-question-input" className="sr-only">
              내비게이터에게 질문하기
            </label>
            <div className="field flex items-center gap-2 py-1.5 pr-1.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
              <input
                id="sherpa-question-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="주거, 서류, 졸업·이사 비교 등 궁금한 점을 입력하세요"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-4 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="질문 보내기"
                className="btn-primary-brand flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[12px] font-medium text-ink-3">
              내 입력 조건 기반 규칙형 안내 · 외부 AI API를 호출하지 않습니다
            </p>
          </form>
        </aside>
      )}

      {/* Floating Toggle Pill: 비교 바가 떠 있을 때는 위쪽으로 올려 겹침 방지 */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'AI 내비게이터 접기' : 'AI 내비게이터 열기'}
        className={`fixed right-4 md:right-6 ${
          isOpen ? 'z-50 hidden md:flex' : 'z-40 flex'
        } ${
          hasCompareBar
            ? 'bottom-[calc(11.75rem+env(safe-area-inset-bottom))] sm:bottom-[calc(9.5rem+env(safe-area-inset-bottom))] lg:bottom-[6.25rem]'
            : 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-4'
        } cursor-pointer items-center gap-2.5 rounded-2xl bg-ink py-2 pl-2 pr-4 text-white shadow-[0_16px_48px_rgb(31_36_33/0.22)] transition-[bottom,transform] duration-150 hover:-translate-y-0.5`}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-ink">
          <Compass className="h-5 w-5" aria-hidden="true" />
        </span>
        <strong className="text-[14px] font-extrabold">AI 내비게이터</strong>
      </button>
    </>
  );
};
