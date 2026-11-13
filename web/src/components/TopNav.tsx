import React, { useState } from 'react';
import { Bell, Wallet } from 'lucide-react';
import { RouteId } from '../types/policy';

interface TopNavProps {
  currentRoute: RouteId;
  onNavigate: (route: RouteId) => void;
  activePrepCount: number;
  livingZoneLabel: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentRoute,
  onNavigate,
  activePrepCount,
  livingZoneLabel,
}) => {
  const [showAlerts, setShowAlerts] = useState(false);

  const navItems: { id: RouteId; label: string; badge?: number; icon?: boolean }[] = [
    { id: 'home', label: '나의 보드' },
    { id: 'policies', label: '정책 찾기' },
    { id: 'switch', label: '생활변화 비교' },
    { id: 'apply', label: '신청 준비', badge: activePrepCount },
    { id: 'profile', label: '내 정보' },
    { id: 'wallet', label: '전자지갑', icon: true },
  ];

  const isPoliciesActive = currentRoute === 'policies' || currentRoute === 'detail';

  return (
    <header className="sticky top-0 z-30 border-b border-[#DCD7C9] bg-[#F7F5EE]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-3.5 md:px-8">
        {/* Zone 1: Brand wordmark */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('home');
          }}
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-[#1F2421] no-underline"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border-[1.5px] border-[#262A27] bg-[#D8F279] text-sm font-extrabold text-[#1F2421]">
            N
          </span>
          <span className="text-lg font-extrabold tracking-tight">청년픽</span>
          <span className="rounded-md border border-[#262A27] bg-white px-1.5 py-0.5 text-[11px] font-bold tracking-wider text-[#1F2421]">
            NEXT
          </span>
        </a>

        {/* Zone 2: Navigation links */}
        <nav
          aria-label="주 메뉴"
          className="hidden items-center gap-1.5 md:flex lg:gap-2"
        >
          {navItems.map((item) => {
            const active =
              item.id === 'policies'
                ? isPoliciesActive
                : currentRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-[14px] font-semibold transition-colors ${
                  active
                    ? 'bg-[#1F2421] text-white'
                    : 'text-[#333333] hover:bg-[#EAE6DA] hover:text-[#1F2421]'
                }`}
              >
                {item.icon && <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />}
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className={`font-mono-num inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                      active
                        ? 'bg-[#D8F279] text-[#1F2421]'
                        : 'bg-[#D8F279] text-[#1F2421] border border-[#262A27]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Quick Actions */}
        <div className="relative flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAlerts((prev) => !prev)}
            aria-label="모집 일정 및 안내 알림 확인"
            aria-expanded={showAlerts}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[#C9C4B6] bg-white text-[#222623] transition-colors hover:bg-[#EFECE3]"
          >
            <Bell className="h-4.5 w-4.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('profile')}
            aria-label="내 정보 열기"
            className="flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl border-[1.5px] border-[#262A27] bg-[#E8E0FC] px-3.5 text-sm font-bold text-[#1F2421] transition-colors hover:bg-[#DDD1FA]"
          >
            <span>내 정보</span>
          </button>

          {showAlerts && (
            <div
              role="dialog"
              aria-label="최근 안내 알림"
              className="absolute right-0 top-13 z-50 w-80 rounded-2xl border-[1.5px] border-[#262A27] bg-white p-4 shadow-lg"
            >
              <div className="mb-2 flex items-center justify-between border-b border-[#E5E1D5] pb-2">
                <strong className="text-sm font-bold text-[#1F2421]">
                  {livingZoneLabel} 확인 안내
                </strong>
                <button
                  type="button"
                  onClick={() => setShowAlerts(false)}
                  className="cursor-pointer text-xs font-semibold text-[#333333] hover:text-[#1F2421]"
                >
                  닫기
                </button>
              </div>
              <ul className="space-y-2.5 text-[13px] leading-relaxed text-[#333333]">
                <li className="rounded-xl bg-[#F7F5EE] p-2.5">
                  <strong className="block font-bold text-[#1F2421]">
                    모집 중 정책 5건 확인 가능
                  </strong>
                  <span>정책 찾기 우측 필터에서 모집 중 정책만 바로 모아볼 수 있어요.</span>
                </li>
                <li className="rounded-xl bg-[#F7F5EE] p-2.5">
                  <strong className="block font-bold text-[#1F2421]">
                    생활권 정보 분리 관리
                  </strong>
                  <span>내 정보에서 주민등록지와 학교·근무 지역을 모달로 선택해 보세요.</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav Strip */}
      <div className="flex gap-1 overflow-x-auto border-t border-[#E6E2D6] px-4 py-2 md:hidden">
        {navItems.map((item) => {
          const active =
            item.id === 'policies' ? isPoliciesActive : currentRoute === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold ${
                active
                  ? 'bg-[#1F2421] text-white'
                  : 'bg-white text-[#333333] border border-[#D7D2C5]'
              }`}
            >
              {item.label}
              {typeof item.badge === 'number' && item.badge > 0
                ? ` (${item.badge})`
                : ''}
            </button>
          );
        })}
      </div>
    </header>
  );
};
