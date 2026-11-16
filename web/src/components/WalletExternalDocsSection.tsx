import React from 'react';
import { FileText } from 'lucide-react';
import {
  ITEM_LABELS_BY_NUMBER,
  REQUIREMENT_DOCS,
} from '../data/docRequirements.generated';

/** 전자지갑으로 받을 수 없는 서류(지갑 밖 서류) 14종 안내. 안내만 하고 아무것도 저장하지 않는다. */
export const WalletExternalDocsSection: React.FC = () => {
  const externalDocs = REQUIREMENT_DOCS.filter((doc) => doc.walletExternal);

  return (
    <section
      aria-labelledby="wallet-external-docs-title"
      className="card-soft rounded-3xl bg-white p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="wallet-external-docs-title"
          className="text-2xl font-extrabold text-[#1F2421]"
        >
          지갑 밖 서류 (직접 준비)
        </h2>
        <span className="rounded-lg border border-[#B8860B] bg-[#FFF0CC] px-3 py-1 text-[13px] font-bold text-[#1F2421]">
          {externalDocs.length}종 · 직접 입력 기준
        </span>
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-[#333333]">
        카카오·네이버 지갑 공개 목록에서 연계가 확인되지 않은 서류예요. 발급처에서 직접
        받아 두고, 정책 상세 화면에서 필요한 값만 직접 입력해 주세요.
      </p>

      <ul className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {externalDocs.map((doc) => (
          <li
            key={doc.id}
            className="rounded-2xl border border-[#DCD7C9] bg-[#FDFCF8] p-4"
          >
            <details>
              <summary className="flex cursor-pointer items-start gap-2">
                <FileText
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#333333]"
                  aria-hidden="true"
                />
                <span>
                  <strong className="block text-[15px] font-extrabold text-[#1F2421]">
                    {doc.name}
                  </strong>
                  <span className="block text-[13px] text-[#4A4D49]">{doc.issuer}</span>
                </span>
              </summary>
              <dl className="mt-3 space-y-2 text-[14px] leading-relaxed text-[#333333]">
                <div>
                  <dt className="font-bold text-[#1F2421]">발급·확인 경로</dt>
                  <dd>{doc.issuePath}</dd>
                </div>
                <div>
                  <dt className="font-bold text-[#1F2421]">확인할 수 있는 내용</dt>
                  <dd>{doc.checkableContent}</dd>
                </div>
                <div>
                  <dt className="font-bold text-[#1F2421]">쓰이는 항목</dt>
                  <dd>
                    {doc.relatedItemNumbers
                      .map((n) => ITEM_LABELS_BY_NUMBER[n])
                      .filter(Boolean)
                      .join(', ')}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-[#1F2421]">주의</dt>
                  <dd className="text-[#A33A1E]">{doc.limits}</dd>
                </div>
              </dl>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
};
