import React, { useId, useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';

export const DEMO_DATA_NOTICE = '시연용 예시 데이터입니다. 실제 공고는 연결 후 표시됩니다.';

interface DemoDataBannerProps {
  /** 늘 보이는 한 줄. 없으면 시연 데이터 안내 */
  notice?: string;
  /** 펼치면 보이는 설명. 없으면 접기 버튼을 두지 않는다 */
  detail?: string;
  /** 처음부터 펼쳐 둘지 (기본: 접힘) */
  defaultOpen?: boolean;
}

/** 모든 화면 맨 위에 표시하는 데이터 안내 배너. 설명(detail)이 있으면 '자세히'로 펼치고 접는다 */
export const DemoDataBanner: React.FC<DemoDataBannerProps> = ({
  notice = DEMO_DATA_NOTICE,
  detail,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const detailId = useId();
  return (
    <div
      role="note"
      aria-label="데이터 안내"
      className="border-b border-[#B8860B]/50 bg-[#FFF0CC] px-5 py-2 text-[13px] font-bold text-[#1F2421] md:px-8"
    >
      <p className="mx-auto flex max-w-[1280px] items-center justify-center gap-2 text-center">
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          {notice}
          {detail && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={detailId}
              onClick={() => setOpen((v) => !v)}
              className="ml-1.5 inline-flex cursor-pointer items-center gap-0.5 whitespace-nowrap rounded-md px-1 align-middle text-[12px] font-bold underline underline-offset-2 hover:bg-[#B8860B]/15"
            >
              {open ? '접기' : '자세히'}
              <ChevronDown className={`h-3.5 w-3.5 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          )}
        </span>
      </p>
      {detail && (
        <p
          id={detailId}
          hidden={!open}
          className="mx-auto mt-1 max-w-[1280px] text-center text-[12px] font-semibold text-[#333333]"
        >
          {detail}
        </p>
      )}
    </div>
  );
};
