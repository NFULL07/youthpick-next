import React from 'react';
import { Info } from 'lucide-react';

export const DEMO_DATA_NOTICE = '시연용 예시 데이터입니다. 실제 공고는 연결 후 표시됩니다.';

/** 모든 화면 맨 위에 표시하는 시연 데이터 안내 배너 */
export const DemoDataBanner: React.FC = () => (
  <div
    role="note"
    aria-label="시연 데이터 안내"
    className="border-b border-[#B8860B]/50 bg-[#FFF0CC] px-5 py-2 text-[13px] font-bold text-[#1F2421] md:px-8"
  >
    <p className="mx-auto flex max-w-[1280px] items-center justify-center gap-2 text-center">
      <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{DEMO_DATA_NOTICE}</span>
    </p>
  </div>
);
