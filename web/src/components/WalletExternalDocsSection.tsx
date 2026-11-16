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
      className="rounded-3xl bg-surface p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="wallet-external-docs-title" className="t-section">
          지갑 밖 서류 (직접 준비)
        </h2>
        <span className="badge badge-warn">
          {externalDocs.length}종 · 직접 입력 기준
        </span>
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
        카카오·네이버 지갑 공개 목록에서 연계가 확인되지 않은 서류예요. 발급처에서 직접
        받아 두고, 정책 상세 화면에서 필요한 값만 직접 입력해 주세요.
      </p>

      {/* items-start: 한 칸을 펼쳐도 같은 줄의 옆 칸은 늘어나지 않게 함 */}
      <ul className="mt-5 grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        {externalDocs.map((doc) => (
          <li
            key={doc.id}
            className="inset p-4"
          >
            <details>
              <summary className="flex cursor-pointer items-start gap-2">
                <FileText
                  className="mt-0.5 h-4 w-4 shrink-0 text-ink-2"
                  aria-hidden="true"
                />
                <span>
                  <strong className="block text-[15px] font-extrabold text-ink">
                    {doc.name}
                  </strong>
                  <span className="block text-[13px] text-ink-3">{doc.issuer}</span>
                </span>
              </summary>
              <dl className="mt-3 space-y-2 text-[14px] leading-relaxed text-ink-2">
                <div>
                  <dt className="font-bold text-ink">발급·확인 경로</dt>
                  <dd>{doc.issuePath}</dd>
                </div>
                <div>
                  <dt className="font-bold text-ink">확인할 수 있는 내용</dt>
                  <dd>{doc.checkableContent}</dd>
                </div>
                <div>
                  <dt className="font-bold text-ink">쓰이는 항목</dt>
                  <dd>
                    {doc.relatedItemNumbers
                      .map((n) => ITEM_LABELS_BY_NUMBER[n])
                      .filter(Boolean)
                      .join(', ')}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-ink">주의</dt>
                  <dd className="text-bad">{doc.limits}</dd>
                </div>
              </dl>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
};
