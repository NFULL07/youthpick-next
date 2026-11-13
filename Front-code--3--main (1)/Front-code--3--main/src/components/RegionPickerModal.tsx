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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2421]/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="region-modal-title"
        className="w-full max-w-2xl overflow-hidden rounded-3xl border-[1.5px] border-[#262A27] bg-[#FAF8F2] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DCD7C9] bg-[#E8E0FC] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <MapPin className="h-5 w-5 text-[#1F2421]" aria-hidden="true" />
            <div>
              <h2
                id="region-modal-title"
                className="text-lg font-bold text-[#1F2421]"
              >
                {title}
              </h2>
              <p className="text-[13px] font-medium text-[#333333]">
                시·도를 먼저 선택한 뒤 시·군·구를 클릭해 주세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="지역 선택 창 닫기"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[#262A27]/30 bg-white text-[#1F2421] hover:bg-[#F7F5EE]"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Hierarchical 2-column selector */}
        <div className="grid grid-cols-1 divide-y divide-[#DCD7C9] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {/* Column 1: 시/도 */}
          <div className="p-4">
            <p className="mb-2.5 px-2 text-xs font-bold tracking-wide text-[#333333]">
              1단계 · 시 / 도 선택
            </p>
            <div
              role="listbox"
              aria-label="시 도 목록"
              className="grid max-h-72 grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-1"
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
                    className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-[14px] font-semibold transition-colors ${
                      isSelected
                        ? 'border-[1.5px] border-[#262A27] bg-[#D8F279] text-[#1F2421] font-bold'
                        : 'border border-transparent bg-white text-[#333333] hover:border-[#C9C4B6] hover:bg-[#F2EFE6]'
                    }`}
                  >
                    <span>{group.sido}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 2: 시/군/구 */}
          <div className="p-4">
            <p className="mb-2.5 px-2 text-xs font-bold tracking-wide text-[#333333]">
              2단계 · {activeGroup.sido} 시 / 군 / 구 선택
            </p>
            <div
              role="listbox"
              aria-label="시 군 구 목록"
              className="grid max-h-72 grid-cols-2 gap-1.5 overflow-y-auto pr-1"
            >
              {activeGroup.sigunguList.map((sigungu) => {
                const isSelected = sigungu === selectedSigungu;
                return (
                  <button
                    key={sigungu}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => setSelectedSigungu(sigungu)}
                    className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] font-semibold transition-colors ${
                      isSelected
                        ? 'border-[1.5px] border-[#262A27] bg-[#1F2421] text-white font-bold'
                        : 'border border-[#E5E1D5] bg-white text-[#333333] hover:border-[#262A27]/40 hover:bg-[#F2EFE6]'
                    }`}
                  >
                    <span className="truncate">{sigungu}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Preview & CTAs */}
        <div className="flex flex-col gap-3 border-t border-[#DCD7C9] bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[14px] text-[#333333]">
            <span>선택된 지역:</span>
            <strong className="rounded-lg border border-[#262A27] bg-[#EEF1E3] px-3 py-1 font-bold text-[#1F2421]">
              {formattedPreview}
            </strong>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            {allowEmpty && (
              <button
                type="button"
                onClick={() => {
                  onSelect('');
                  onClose();
                }}
                className="btn-secondary-outline cursor-pointer whitespace-nowrap rounded-xl px-4 py-2.5 text-sm"
              >
                선택 안 함
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary-outline cursor-pointer whitespace-nowrap rounded-xl px-4 py-2.5 text-sm"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                onSelect(formattedPreview);
                onClose();
              }}
              className="btn-primary-brand cursor-pointer whitespace-nowrap rounded-xl px-5 py-2.5 text-sm"
            >
              선택 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
