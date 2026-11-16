import React, { useEffect, useState } from 'react';
import { Check, ChevronRight, MapPin, X } from 'lucide-react';
import {
  KOREA_REGIONS,
  findRegionPair,
  formatSelectedRegion,
} from '../data/regions';

interface RegionPickerModalProps {
  isOpen: boolean;
  title: string;
  currentValue: string;
  allowEmpty?: boolean;
  onSelect: (regionValue: string) => void;
  onClose: () => void;
}

export const RegionPickerModal: React.FC<RegionPickerModalProps> = ({
  isOpen,
  title,
  currentValue,
  allowEmpty = false,
  onSelect,
  onClose,
}) => {
  const initialPair = findRegionPair(currentValue);
  const [selectedSido, setSelectedSido] = useState<string>(initialPair.sido);
  const [selectedSigungu, setSelectedSigungu] = useState<string>(
    initialPair.sigungu
  );

  useEffect(() => {
    if (isOpen) {
      const pair = findRegionPair(currentValue);
      setSelectedSido(pair.sido);
      setSelectedSigungu(pair.sigungu);
    }
  }, [isOpen, currentValue]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeGroup =
    KOREA_REGIONS.find((g) => g.sido === selectedSido) ?? KOREA_REGIONS[0];
  const formattedPreview = formatSelectedRegion(selectedSido, selectedSigungu);

  const handleSidoClick = (sido: string) => {
    const group = KOREA_REGIONS.find((g) => g.sido === sido);
    setSelectedSido(sido);
    if (group && group.sigunguList.length > 0) {
      setSelectedSigungu(group.sigunguList[0]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-3 backdrop-blur-[2px] sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="region-modal-title"
        className="flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-[1.5px] border-edge bg-surface-2 shadow-2xl break-keep"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Pinned) */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-lavender px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <MapPin className="h-5 w-5 shrink-0 text-ink" aria-hidden="true" />
            <div className="min-w-0">
              <h2
                id="region-modal-title"
                className="text-base font-bold text-ink sm:text-lg"
              >
                {title}
              </h2>
              <p className="text-[12px] font-medium text-ink-2 sm:text-[13px]">
                시·도를 먼저 선택한 뒤 시·군·구를 클릭해 주세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="지역 선택 창 닫기"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-edge/30 bg-surface text-ink hover:bg-canvas"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Hierarchical 2-column selector (Scrollable Middle Body) */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {/* Column 1: 시/도 */}
            <div className="p-3.5 sm:p-4">
              <p className="mb-2 px-1.5 text-xs font-bold tracking-wide text-ink-2 sm:mb-2.5 sm:px-2">
                1단계 · 시 / 도 선택
              </p>
              <div
                role="listbox"
                aria-label="시 도 목록"
                className="grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:max-h-72 sm:grid-cols-1"
              >
                {KOREA_REGIONS.map((group) => {
                  const isSelected = group.sido === selectedSido;
                  return (
                    <button
                      key={group.sido}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSidoClick(group.sido)}
                      className={`flex w-full min-w-0 cursor-pointer items-center justify-between gap-1 rounded-xl px-2.5 py-2 text-left text-[12px] font-semibold leading-snug transition-colors break-keep sm:px-3.5 sm:py-2.5 sm:text-[14px] ${
                        isSelected
                          ? 'border-[1.5px] border-edge bg-accent font-bold text-ink'
                          : 'border border-transparent bg-surface text-ink-2 hover:border-line-mid hover:bg-surface-3'
                      }`}
                    >
                      <span className="min-w-0 whitespace-nowrap">{group.sido}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70 sm:h-4 sm:w-4" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 2: 시/군/구 */}
            <div className="p-3.5 sm:p-4">
              <p className="mb-2 px-1.5 text-xs font-bold tracking-wide text-ink-2 sm:mb-2.5 sm:px-2">
                2단계 · {activeGroup.sido} 시 / 군 / 구 선택
              </p>
              <div
                role="listbox"
                aria-label="시 군 구 목록"
                className="grid max-h-52 grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:max-h-72"
              >
                {activeGroup.sigunguList.map((sigungu) => {
                  const isSelected = sigungu === selectedSigungu;
                  const isAllOption = sigungu.endsWith('전체');
                  return (
                    <button
                      key={sigungu}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => setSelectedSigungu(sigungu)}
                      className={`flex min-w-0 cursor-pointer items-center justify-between gap-1 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold leading-snug transition-colors break-keep sm:px-3 sm:py-2.5 sm:text-[14px] ${
                        isAllOption ? 'col-span-2' : ''
                      } ${
                        isSelected
                          ? 'border-[1.5px] border-edge bg-ink font-bold text-white'
                          : 'border border-line-soft bg-surface text-ink-2 hover:border-edge/40 hover:bg-surface-3'
                      }`}
                    >
                      <span className="min-w-0 truncate">{sigungu}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Preview & CTAs (Pinned) */}
        <div className="flex shrink-0 flex-col gap-2.5 border-t border-line bg-surface px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2 sm:text-[14px]">
            <span className="shrink-0">선택된 지역:</span>
            <strong className="rounded-lg border border-edge bg-sage px-2.5 py-1 font-bold text-ink break-keep sm:px-3">
              {formattedPreview}
            </strong>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
            {allowEmpty && (
              <button
                type="button"
                onClick={() => {
                  onSelect('');
                  onClose();
                }}
                className="btn-secondary-outline cursor-pointer whitespace-nowrap break-keep rounded-xl px-3.5 py-2 text-[13px] sm:px-4 sm:py-2.5 sm:text-sm"
              >
                선택 안 함
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary-outline cursor-pointer whitespace-nowrap break-keep rounded-xl px-3.5 py-2 text-[13px] sm:px-4 sm:py-2.5 sm:text-sm"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                onSelect(formattedPreview);
                onClose();
              }}
              className="btn-primary-brand cursor-pointer whitespace-nowrap break-keep rounded-xl px-4 py-2 text-[13px] sm:px-5 sm:py-2.5 sm:text-sm"
            >
              선택 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
