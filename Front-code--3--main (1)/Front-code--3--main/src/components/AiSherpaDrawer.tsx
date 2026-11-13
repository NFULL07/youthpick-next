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
      {/* Widened AI Sherpa / Navigator Drawer (560px desktop width: >30% wider than 380px) */}
      {isOpen && (
        <aside
          role="dialog"
          aria-label="AI 내비게이터 (AI 셰르파)"
          data-testid="ai-navigator-drawer"
          className="fixed bottom-20 right-4 z-40 flex h-[min(680px,calc(100vh-7rem))] w-[min(560px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border-[1.5px] border-[#262A27] bg-[#FAF8F2] shadow-2xl md:right-6"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-[#262A27] bg-[#E8E0FC] px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border-[1.5px] border-[#262A27] bg-[#D8F279] text-[#1F2421]">
                <Compass className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[17px] font-extrabold text-[#1F2421]">
                  AI 내비게이터 (AI 셰르파)
                </h2>
                <p className="text-[13px] font-semibold text-[#333333]">
                  내 조건·화면 맥락 기반 규칙형 안내
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggle}
              aria-label="AI 내비게이터 닫기"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[#262A27]/30 bg-white text-[#1F2421] hover:bg-[#F7F5EE]"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Context Bar */}
          <div className="flex items-center justify-between border-b border-[#E3DFD3] bg-white px-6 py-2.5 text-[13px] font-semibold text-[#333333]">
            <span>
              현재 화면 · <strong className="text-[#1F2421]">{ROUTE_LABELS[route]}</strong>
              {selectedPolicy ? ` (${selectedPolicy.title})` : ''}
            </span>
            <button
              type="button"
              onClick={() => setMessages([])}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-semibold text-[#333333] hover:bg-[#EFECE3] hover:text-[#1F2421]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>새로 시작</span>
            </button>
          </div>

          {/* Scrollable Conversation Area */}
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {messages.length === 0 ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#DCD7C9] bg-white p-5">
                  <p className="font-mono-num text-xs font-bold tracking-wider text-[#4A4D49]">
                    MY NEXT NAVIGATOR
                  </p>
                  <h3 className="mt-1.5 text-xl font-extrabold leading-snug text-[#1F2421]">
                    다음 한 칸,{' '}
                    <span className="bg-[#D8F279] px-1">같이 찾아볼까요?</span>
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#333333]">
                    어려운 정책 용어 대신 지금 내 조건(만 {profile.age}세 ·{' '}
                    {profile.status} · 거주 {profile.residence || '미입력'})부터
                    차근차근 풀어드려요.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <p className="text-[13px] font-bold text-[#333333]">
                    자주 묻는 질문 바로 보기
                  </p>
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleAsk(prompt)}
                      className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-[#CFCAC0] bg-white px-4 py-3.5 text-left text-[15px] font-semibold text-[#1F2421] transition-colors hover:border-[#262A27] hover:bg-[#EEF1E3]"
                    >
                      <span>{prompt}</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-[#333333]" aria-hidden="true" />
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigate('wallet')}
                    className="btn-secondary-outline inline-flex cursor-pointer items-center gap-1 rounded-xl px-3.5 py-2 text-[13px]"
                  >
                    <span>전자지갑 연결</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('apply')}
                    className="btn-secondary-outline inline-flex cursor-pointer items-center gap-1 rounded-xl px-3.5 py-2 text-[13px]"
                  >
                    <span>신청 준비 노트</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-4.5 py-3.5 text-[15px] leading-relaxed whitespace-pre-line ${
                        msg.sender === 'user'
                          ? 'bg-[#1F2421] font-semibold text-white'
                          : 'border border-[#D5D0C3] bg-white text-[#1F2421]'
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
                        className="btn-primary-lime mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-[13px]"
                      >
                        <span>{msg.actionLabel}</span>
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
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
            className="border-t border-[#DCD7C9] bg-white px-5 py-3.5"
          >
            <label htmlFor="sherpa-question-input" className="sr-only">
              내비게이터에게 질문하기
            </label>
            <div className="flex items-center gap-2.5 rounded-2xl border-[1.5px] border-[#262A27] bg-[#FAF8F2] px-3.5 py-2">
              <input
                id="sherpa-question-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="주거, 서류, 졸업·이사 비교 등 궁금한 점을 입력하세요"
                className="flex-1 bg-transparent text-[15px] text-[#1F2421] placeholder:text-[#5C5F5B] focus:outline-none"
              />
              <button
                type="submit"
                aria-label="질문 보내기"
                className="btn-primary-brand flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-[12px] font-medium text-[#4A4D49]">
              내 입력 조건 기반 규칙형 안내 · 외부 AI API를 호출하지 않습니다
            </p>
          </form>
        </aside>
      )}

      {/* Floating Toggle Pill */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'AI 내비게이터 접기' : 'AI 내비게이터 열기'}
        className="fixed bottom-4 right-4 z-40 flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] border-[#262A27] bg-[#1F2421] px-4 py-2.5 text-white shadow-xl transition-transform duration-150 hover:-translate-y-0.5 md:right-6"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D8F279] text-[#1F2421]">
          <Compass className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-[11px] font-semibold text-[#D8F279]">
            나의 다음 한 걸음
          </span>
          <strong className="block text-[14px] font-extrabold">AI 내비게이터</strong>
        </span>
      </button>
    </>
  );
};
