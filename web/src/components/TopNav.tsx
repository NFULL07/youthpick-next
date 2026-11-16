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
    { id: 'wallet', label: '전자지갑', icon: true },
  ];

  const isPoliciesActive = currentRoute === 'policies' || currentRoute === 'detail';

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-5 sm:py-3.5 md:px-8">
        {/* Zone 1: Brand wordmark */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('home');
          }}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-ink no-underline sm:gap-2.5"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-edge bg-accent text-sm font-extrabold text-ink">
            N
          </span>
          <span className="text-base font-extrabold tracking-tight sm:text-lg">청년픽</span>
          <span className="rounded-md border border-edge bg-surface px-1.5 py-0.5 text-[11px] font-bold tracking-wider text-ink">
            NEXT
          </span>
        </a>

        {/* Zone 2: Navigation links (lg 이상. 그보다 좁으면 6개 메뉴가 한 줄에 들어가지 않아 BottomNav 사용) */}
        <nav
          aria-label="주 메뉴"
          className="hidden items-center gap-2 lg:flex"
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
                    ? 'bg-ink text-white'
                    : 'text-ink-2 hover:bg-surface-3 hover:text-ink'
                }`}
              >
                {item.icon && <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />}
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold tabular-nums text-ink"
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Quick Actions */}
        <div className="relative flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <button
            type="button"
            onClick={() => setShowAlerts((prev) => !prev)}
            aria-label="모집 일정 및 안내 알림 확인"
            aria-expanded={showAlerts}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface-3"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('profile')}
            aria-label="내 정보 열기"
            aria-current={currentRoute === 'profile' ? 'page' : undefined}
            className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl bg-lavender px-3.5 text-[14px] font-bold text-ink transition-colors hover:bg-lavender-hover aria-[current=page]:bg-ink aria-[current=page]:text-white"
          >
            <span>내 정보</span>
          </button>

          {showAlerts && (
            <div
              role="dialog"
              aria-label="최근 안내 알림"
              className="absolute right-0 top-13 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-surface p-4 shadow-[0_12px_32px_rgb(31_36_33/0.14)]"
            >
              <div className="flex items-center justify-between">
                <strong className="text-[15px] font-extrabold text-ink">
                  {livingZoneLabel} 확인 안내
                </strong>
                <button
                  type="button"
                  onClick={() => setShowAlerts(false)}
                  className="cursor-pointer rounded-lg px-2 py-1 text-[13px] font-semibold text-ink-2 hover:bg-surface-3 hover:text-ink"
                >
                  닫기
                </button>
              </div>
              <ul className="mt-2 divide-y divide-line-soft text-[13px] leading-relaxed text-ink-2">
                <li className="py-2.5">
                  <strong className="block font-bold text-ink">
                    모집 중 정책 5건 확인 가능
                  </strong>
                  <span>정책 찾기 우측 필터에서 모집 중 정책만 바로 모아볼 수 있어요.</span>
                </li>
                <li className="pt-2.5">
                  <strong className="block font-bold text-ink">
                    생활권 정보 분리 관리
                  </strong>
                  <span>내 정보에서 주민등록지와 학교·근무 지역을 모달로 선택해 보세요.</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
      {/* 모바일 메뉴는 화면 하단 고정 BottomNav가 맡는다 */}
    </header>
  );
};
