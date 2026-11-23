import React, { useState } from 'react';
import { FileText, Info } from 'lucide-react';
import type { DirectInputItem } from '../data/docRequirementTypes';
import { CRITERIA_RESULT_STYLE, type PolicyItem } from '../types/policy';
import {
  DIRECT_INPUT_NOTICE,
  getDirectInputItemsForPolicy,
  getDirectInputResult,
  getDocsForItem,
  getInputSpec,
  inputKeyOfItem,
} from '../utils/directInput';

interface DirectInputSectionProps {
  policy: PolicyItem;
  /** 가상 지갑을 켰을 때 미리 채울 값(메모리에서만). 바꾸려면 컴포넌트 key를 바꾼다 */
  presetValues?: Record<string, string>;
}

/**
 * 지갑 밖 서류로만 확인되는 항목의 직접 입력 영역.
 * 개인정보 규칙: 입력값은 이 컴포넌트 상태(메모리)에만 둔다.
 * 브라우저 저장소·URL·토스트·콘솔에 값을 남기지 않는다.
 */
export const DirectInputSection: React.FC<DirectInputSectionProps> = ({ policy, presetValues }) => {
  const items = getDirectInputItemsForPolicy(policy);
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...(presetValues ?? {}) }));
  const fromWallet = presetValues !== undefined && Object.keys(presetValues).length > 0;

  if (items.length === 0) {
    return null;
  }

  const setValue = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <section
      aria-labelledby={`direct-input-title-${policy.id}`}
      className="mt-8 border-t border-dashed border-[#262A27]/30 pt-7"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3
          id={`direct-input-title-${policy.id}`}
          className="text-xl font-extrabold text-[#1F2421]"
        >
          직접 입력이 필요한 조건
        </h3>
        <span className="rounded-lg border border-[#B8860B] bg-[#FFF0CC] px-3 py-1 text-[13px] font-bold text-[#1F2421]">
          직접 입력 기준
        </span>
      </div>
      <p className="text-[15px] leading-relaxed text-[#333333]">
        아래 서류는 전자지갑으로 아직 받을 수 없어요. 서류를 보고 직접 입력해 주세요.
      </p>
      <p
        role="note"
        className="mt-3 flex items-start gap-2 rounded-xl bg-[#F7F5EE] px-4 py-3 text-[14px] font-semibold text-[#333333]"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{DIRECT_INPUT_NOTICE}</span>
      </p>
      {fromWallet && (
        <p role="note" className="mt-2 rounded-xl bg-[#EEF1E3] px-4 py-2.5 text-[14px] font-semibold text-[#1F2421]">
          가상 지갑의 가상 인물 정보로 미리 채웠어요. 고쳐서 다시 확인할 수 있어요.
        </p>
      )}

      <ul className="mt-5 space-y-4">
        {items.map((item, index) => (
          <DirectInputRow
            key={inputKeyOfItem(item)}
            policyId={policy.id}
            index={index}
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
  /** 같은 항목ID가 두 칸 이상일 수 있어(특화 대상 질문별) 화면 id에 순번을 붙인다 */
  index: number;
  item: DirectInputItem;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

const DirectInputRow: React.FC<DirectInputRowProps> = ({
  policyId,
  index,
  item,
  values,
  onChange,
}) => {
  const spec = getInputSpec(item);
  const key = inputKeyOfItem(item);
  const inputId = `direct-${policyId}-${item.fieldId}-${index}`;
  const docs = getDocsForItem(item);

  const combinedValue =
    spec?.kind === 'monthRange'
      ? [values[`${key}.start`], values[`${key}.end`]]
          .filter(Boolean)
          .join(' ~ ')
      : values[key];
  const { result, label } = getDirectInputResult(combinedValue, item);

  return (
    <li className="rounded-2xl border border-[#DCD7C9] bg-[#FDFCF8] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <label htmlFor={inputId} className="text-[16px] font-extrabold text-[#1F2421]">
          {item.label}
        </label>
        <span
          data-result={result}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] font-bold ${CRITERIA_RESULT_STYLE[result]}`}
        >
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
            value={values[key] ?? ''}
            onChange={(e) => onChange(key, e.target.value)}
            className="w-full rounded-xl border-[1.5px] border-[#262A27] bg-white px-3 py-2.5 text-[15px] text-[#1F2421] sm:max-w-sm"
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
          <div className="flex w-full items-center gap-2 rounded-xl border-[1.5px] border-[#262A27] bg-white px-3 py-2.5 sm:max-w-sm">
            <input
              id={inputId}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={values[key] ?? ''}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, '');
                onChange(key, raw);
              }}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-[#1F2421] tabular-nums focus:outline-none"
            />
            <span className="shrink-0 text-[14px] font-semibold text-[#4A4D49]">
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
              value={values[`${key}.start`] ?? ''}
              onChange={(e) => onChange(`${key}.start`, e.target.value)}
              className="rounded-xl border-[1.5px] border-[#262A27] bg-white px-3 py-2 text-[15px]"
            />
            <span aria-hidden="true">~</span>
            <input
              type="month"
              aria-label={`${item.label} 종료 연월`}
              value={values[`${key}.end`] ?? ''}
              onChange={(e) => onChange(`${key}.end`, e.target.value)}
              className="rounded-xl border-[1.5px] border-[#262A27] bg-white px-3 py-2 text-[15px]"
            />
          </div>
        )}

        {spec?.hint && (
          <p className="mt-2 text-[13px] leading-relaxed text-[#4A4D49]">{spec.hint}</p>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2 text-[14px] leading-relaxed sm:grid-cols-[7.5rem_1fr]">
        <dt className="font-bold text-[#1F2421]">확인할 서류</dt>
        <dd className="text-[#333333]">{item.docsLabel}</dd>
        <dt className="font-bold text-[#1F2421]">서류에서 볼 내용</dt>
        <dd className="text-[#333333]">{item.checkContent}</dd>
      </dl>

      <details className="mt-3 text-[14px] leading-relaxed">
        <summary className="cursor-pointer font-bold text-[#1F2421]">
          발급 경로와 주의사항
        </summary>
        <ul className="mt-2 space-y-2">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-start gap-2 text-[#333333]">
              <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <strong className="font-bold text-[#1F2421]">{doc.name}</strong>
                {doc.walletExternal ? '' : ' (공고 기준 자료)'}
                <span className="block">발급처: {doc.issuer}</span>
                <span className="block">경로: {doc.issuePath}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[#A33A1E]">
          <span aria-hidden="true">! </span>
          {item.caution}
        </p>
      </details>
    </li>
  );
};
