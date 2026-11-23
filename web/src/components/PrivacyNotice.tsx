import React, { useState } from 'react';
import { getNavigatorMode, type NavigatorMode } from '../ai/navigatorClient';

/**
 * 개인정보 처리 안내 (바닥글). 지금 배포가 실제로 하는 일만 적는다.
 * 근거와 초안: docs/handoff/privacy_notice_draft.md (법률 검토 전)
 * AI 공고 찾기가 켜져 있으면(VITE_AI_NAVIGATOR=live) 보내는 항목과 받는 곳을, 아니면 보내지 않는다는 것을 보여 준다.
 */

/** 서버 함수(ai-navigator)가 쓰는 AI 회사. Supabase 비밀값 AI_PROVIDER를 바꾸면 이 이름도 바꾼다 */
export const AI_COMPANY = 'Anthropic';

export const NAVIGATOR_FIELDS = '주민등록 시·군, 학교 시·군, 현재 상태, 나이대(5세 단위), 관심 분야, 직접 적은 짧은 질문';

export function privacyItems(mode: NavigatorMode): string[] {
  const common = [
    '내 정보(나이, 현재 상태, 사는 지역, 학교·근무 지역, 관심 분야)와 저장한 정책·준비 목록은 이 기기의 브라우저에만 저장되고 서버로 보내지 않아요. 브라우저 저장소를 지우면 함께 지워져요.',
    '정책 상세에서 직접 입력한 값(성적, 소득 등)과 가상 지갑 정보는 화면을 닫거나 새로고침하면 지워져요. 어디에도 저장하거나 보내지 않아요.',
  ];
  const ai =
    mode === 'live'
      ? `'AI 공고 찾기'를 누를 때만 ${NAVIGATOR_FIELDS}을 보내요. 받는 곳: Supabase(서버 함수 실행), ${AI_COMPANY}(AI 검색과 답변 작성). 목적: 온통청년에 없는 외부 공고 찾기. 청년픽 NEXT는 이 내용을 저장하지 않으며, ${AI_COMPANY}의 보관은 ${AI_COMPANY} 정책을 따라요.`
      : "'AI 공고 찾기'는 지금 예시 응답만 보여 주며, 입력한 정보를 외부로 보내지 않아요.";
  return [
    ...common,
    ai,
    '정책 정보는 공개된 공고를 모은 것이고, 판정 결과는 참고용이에요. 신청 전에 공고 원문을 꼭 확인하세요.',
  ];
}

export const PrivacyNotice: React.FC<{ mode?: NavigatorMode }> = ({ mode = getNavigatorMode() }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="privacy-notice"
        onClick={() => setOpen((v) => !v)}
        className="font-bold text-[#1F2421] underline underline-offset-4"
      >
        개인정보 처리 안내
      </button>
      {open && (
        <ol
          id="privacy-notice"
          className="mt-3 list-decimal space-y-2 rounded-xl bg-[#F7F5EE] py-4 pl-9 pr-5 text-[13px] font-medium leading-relaxed text-[#333333]"
        >
          {privacyItems(mode).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      )}
    </div>
  );
};
