import React, { useState } from 'react';
import { FileText, Info } from 'lucide-react';
import { DIRECT_INPUT_SPECS } from '../data/directInputSpec';
import type { DirectInputItem } from '../data/docRequirementTypes';
import type { PolicyItem } from '../types/policy';
import {
  DIRECT_INPUT_NOTICE,
  getDirectInputItemsForPolicy,
  getDirectInputResult,
  getDocsForItem,
} from '../utils/directInput';

interface DirectInputSectionProps {
  policy: PolicyItem;
}

/**
 * 지갑 밖 서류로만 확인되는 항목의 직접 입력 영역.
 * 개인정보 규칙: 입력값은 이 컴포넌트 상태(메모리)에만 둔다.
 * 브라우저 저장소·URL·토스트·콘솔에 값을 남기지 않는다.
 */
export const DirectInputSection: React.FC<DirectInputSectionProps> = ({ policy }) => {
  const items = getDirectInputItemsForPolicy(policy);
  const [values, setValues] = useState<Record<string, string>>({});

  if (items.length === 0) {
    return null;
  }

  const setValue = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <section
      aria-labelledby={`direct-input-title-${policy.id}`}
      className="mt-8 border-t border-dashed border-edge/30 pt-7"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3
          id={`direct-input-title-${policy.id}`}
          className="text-xl font-extrabold text-ink"
        >
          직접 입력이 필요한 조건
        </h3>
        <span className="rounded-lg border border-warn bg-warn-bg px-3 py-1 text-[13px] font-bold text-ink">
          직접 입력 기준
        </span>
      </div>
      <p className="text-[15px] leading-relaxed text-ink-2">
        아래 서류는 전자지갑으로 아직 받을 수 없어요. 서류를 보고 직접 입력해 주세요.
      </p>
      <p
        role="note"
        className="mt-3 flex items-start gap-2 rounded-xl bg-canvas px-4 py-3 text-[14px] font-semibold text-ink-2"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{DIRECT_INPUT_NOTICE}</span>
      </p>

      <ul className="mt-5 space-y-4">
        {items.map((item) => (
          <DirectInputRow
            key={item.fieldId}
            policyId={policy.id}
            item={item}
            values={values}
            onChange={setValue}
          />
        ))}
      </ul>
    </section>
  );
};

interface DirectInputRowProps {
  policyId: string;
  item: DirectInputItem;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

const DirectInputRow: React.FC<DirectInputRowProps> = ({
  policyId,
  item,
  values,
  onChange,
}) => {
  const spec = DIRECT_INPUT_SPECS[item.fieldId];
  const inputId = `direct-${policyId}-${item.fieldId}`;
  const docs = getDocsForItem(item);

  const combinedValue =
    spec?.kind === 'monthRange'
      ? [values[`${item.fieldId}.start`], values[`${item.fieldId}.end`]]
          .filter(Boolean)
          .join(' ~ ')
      : values[item.fieldId];
  const { result, label } = getDirectInputResult(combinedValue);

  return (
    <li className="rounded-2xl border border-line bg-surface-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <label htmlFor={inputId} className="text-[16px] font-extrabold text-ink">
          {item.label}
        </label>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-warn bg-warn-bg px-2.5 py-1 text-[13px] font-bold text-ink">
          <span aria-hidden="true" className="font-mono-num">
            {result}
          </span>
          <span>{label}</span>
        </span>
      </div>

      <div className="mt-3">
        {spec?.kind === 'select' && (
          <select
            id={inputId}
            value={values[item.fieldId] ?? ''}
            onChange={(e) => onChange(item.fieldId, e.target.value)}
            className="w-full rounded-xl border-[1.5px] border-edge bg-surface px-3 py-2.5 text-[15px] text-ink sm:max-w-sm"
          >
            <option value="">선택하세요</option>
            {spec.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}

        {spec?.kind === 'number' && (
          <div className="flex w-full items-center gap-2 rounded-xl border-[1.5px] border-edge bg-surface px-3 py-2.5 sm:max-w-sm">
            <input
              id={inputId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={values[item.fieldId] ?? ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, '');
                onChange(item.fieldId, raw);
              }}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-ink tabular-nums focus:outline-none"
            />
            <span className="shrink-0 text-[14px] font-semibold text-ink-3">
              {spec.unit}
            </span>
          </div>
        )}

        {spec?.kind === 'monthRange' && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={inputId}
              type="month"
              aria-label={`${item.label} 시작 연월`}
              value={values[`${item.fieldId}.start`] ?? ''}
              onChange={(e) => onChange(`${item.fieldId}.start`, e.target.value)}
              className="rounded-xl border-[1.5px] border-edge bg-surface px-3 py-2 text-[15px]"
            />
            <span aria-hidden="true">~</span>
            <input
              type="month"
              aria-label={`${item.label} 종료 연월`}
              value={values[`${item.fieldId}.end`] ?? ''}
              onChange={(e) => onChange(`${item.fieldId}.end`, e.target.value)}
              className="rounded-xl border-[1.5px] border-edge bg-surface px-3 py-2 text-[15px]"
            />
          </div>
        )}

        {spec?.hint && (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{spec.hint}</p>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2 text-[14px] leading-relaxed sm:grid-cols-[7.5rem_1fr]">
        <dt className="font-bold text-ink">확인할 서류</dt>
        <dd className="text-ink-2">{item.docsLabel}</dd>
        <dt className="font-bold text-ink">서류에서 볼 내용</dt>
        <dd className="text-ink-2">{item.checkContent}</dd>
      </dl>

      <details className="mt-3 text-[14px] leading-relaxed">
        <summary className="cursor-pointer font-bold text-ink">
          발급 경로와 주의사항
        </summary>
        <ul className="mt-2 space-y-2">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-start gap-2 text-ink-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <strong className="font-bold text-ink">{doc.name}</strong>
                {doc.walletExternal ? '' : ' (공고 기준 자료)'}
                <span className="block">발급처: {doc.issuer}</span>
                <span className="block">경로: {doc.issuePath}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-bad">
          <span aria-hidden="true">! </span>
          {item.caution}
        </p>
      </details>
    </li>
  );
};
