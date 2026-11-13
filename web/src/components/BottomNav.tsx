import React from 'react';
import {
  ArrowLeftRight,
  ClipboardCheck,
  House,
  LucideIcon,
  Search,
  User,
  Wallet,
} from 'lucide-react';
import { RouteId } from '../types/policy';

interface BottomNavProps {
  currentRoute: RouteId;
  onNavigate: (route: RouteId) => void;
  activePrepCount: number;
}

const BOTTOM_NAV_ITEMS: { id: RouteId; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: '홈', icon: House },
  { id: 'policies', label: '정책 찾기', icon: Search },
  { id: 'switch', label: '생활변화', icon: ArrowLeftRight },
  { id: 'apply', label: '신청 준비', icon: ClipboardCheck },
  { id: 'profile', label: '내 정보', icon: User },
  { id: 'wallet', label: '전자지갑', icon: Wallet },
];

/** 모바일(md 미만) 전용 하단 고정 메뉴. 데스크톱은 TopNav의 주 메뉴를 쓴다. */
export const BottomNav: React.FC<BottomNavProps> = ({
  currentRoute,
  onNavigate,
  activePrepCount,
}) => {
  return (
    <nav
      aria-label="하단 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-[#262A27] bg-[#FDFCF5] px-1.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] md:hidden"
    >
      <ul className="grid grid-cols-6">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const active =
            item.id === 'policies'
              ? currentRoute === 'policies' || currentRoute === 'detail'
              : currentRoute === item.id;
          const badge = item.id === 'apply' && activePrepCount > 0 ? activePrepCount : null;
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-h-12 w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 text-[11px] leading-tight tracking-tight ${
                  active ? 'font-extrabold text-[#1F2421]' : 'font-semibold text-[#4A4D49]'
                }`}
              >
                <span
                  className={`flex h-7 w-10 items-center justify-center rounded-lg border ${
                    active ? 'border-[#262A27] bg-[#D8F279]' : 'border-transparent'
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
                {badge !== null && (
                  <span className="font-mono-num absolute right-1 top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-[#262A27] bg-[#D8F279] px-1 text-[10px] font-bold text-[#1F2421]">
                    {badge}
                    <span className="sr-only">건 준비 중</span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
