# -*- coding: utf-8 -*-
"""
확인서류표 CSV -> 화면용 TypeScript 데이터 변환 (청년픽 NEXT)

입력 (원본, 수정하지 않음)
  docs/data/doc_requirements_items_v1.csv  69개 개인정보 항목별 확인서류
  docs/data/doc_requirements_docs_v1.csv   서류 39종 발급 안내

출력
  web/src/data/docRequirements.generated.ts  (직접 고치지 말고 이 스크립트로 다시 만든다)

규칙
  - 지갑 밖 서류: 카카오·네이버 공개목록 열이 모두 '미확인'인 서류
  - 직접 입력 항목: '수집 제외'가 아니고, 개인 서류(개인 증명서 대상이 아닌 D37·D38 제외)가
    모두 지갑 밖 서류인 항목
  - 문구는 CSV 원문 그대로 옮긴다

실행 (저장소 맨 위에서)
  python pipeline/build_doc_requirements.py
"""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ITEMS_CSV = ROOT / "docs" / "data" / "doc_requirements_items_v1.csv"
DOCS_CSV = ROOT / "docs" / "data" / "doc_requirements_docs_v1.csv"
OUT_TS = ROOT / "web" / "src" / "data" / "docRequirements.generated.ts"

EXPECTED_EXTERNAL_DOCS = 14
EXPECTED_DIRECT_ITEMS = 11


def read_csv(path: Path) -> list[dict]:
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def split_ids(value: str) -> list[str]:
    return [v.strip() for v in (value or "").split(",") if re.fullmatch(r"D\d\d", v.strip())]


def split_numbers(value: str) -> list[int]:
    return [int(v) for v in re.findall(r"\d+", value or "")]


def main() -> None:
    items = read_csv(ITEMS_CSV)
    docs = read_csv(DOCS_CSV)

    non_personal = {d["서류ID"] for d in docs if "해당 없음" in d["카카오 공개목록"]}
    external = [
        d for d in docs
        if "미확인" in d["카카오 공개목록"] and "미확인" in d["네이버 공개목록"]
    ]
    external_ids = {d["서류ID"] for d in external}

    direct_items = []
    for it in items:
        if it["원문 구분"] == "수집 제외":
            continue
        doc_ids = split_ids(it["서류ID"])
        personal = [d for d in doc_ids if d not in non_personal]
        if personal and all(d in external_ids for d in personal):
            direct_items.append(it)

    if len(external) != EXPECTED_EXTERNAL_DOCS:
        raise SystemExit(f"지갑 밖 서류 수가 {len(external)}개입니다(기대 {EXPECTED_EXTERNAL_DOCS}). CSV를 확인하세요.")
    if len(direct_items) != EXPECTED_DIRECT_ITEMS:
        raise SystemExit(f"직접 입력 항목 수가 {len(direct_items)}개입니다(기대 {EXPECTED_DIRECT_ITEMS}). CSV를 확인하세요.")

    used_doc_ids = sorted(external_ids | {d for it in direct_items for d in split_ids(it["서류ID"])})
    doc_by_id = {d["서류ID"]: d for d in docs}

    out_docs = [
        {
            "id": did,
            "name": doc_by_id[did]["서류·자료명"],
            "issuer": doc_by_id[did]["발급기관"],
            "issuePath": doc_by_id[did]["발급·확인 경로"],
            "checkableContent": doc_by_id[did]["확인 가능한 내용"],
            "govCertSupport": doc_by_id[did]["전자증명서 지원"],
            "kakaoList": doc_by_id[did]["카카오 공개목록"],
            "naverList": doc_by_id[did]["네이버 공개목록"],
            "relatedItemNumbers": split_numbers(doc_by_id[did]["관련 항목 번호"]),
            "limits": doc_by_id[did]["한계·확인할 점"],
            "walletExternal": did in external_ids,
        }
        for did in used_doc_ids
    ]
    out_items = [
        {
            "number": int(it["번호"]),
            "label": it["개인정보 세부 항목"],
            "fieldId": it["원문 영문 ID"],
            "storage": it["원문 구분"],
            "docsLabel": it["확인할 서류·자료"],
            "issuer": it["발급기관·확인처"],
            "checkMethod": it["확인 방법"],
            "checkContent": it["서류에서 확인하는 내용"],
            "caution": it["한계·주의사항"],
            "docIds": split_ids(it["서류ID"]),
        }
        for it in direct_items
    ]
    item_labels = {int(it["번호"]): it["개인정보 세부 항목"] for it in items}

    def js(value) -> str:
        return json.dumps(value, ensure_ascii=False, indent=2)

    ts = (
        "// 자동 생성 파일: 직접 고치지 마세요.\n"
        "// 원본: docs/data/doc_requirements_items_v1.csv, docs/data/doc_requirements_docs_v1.csv\n"
        "// 다시 만들기: python pipeline/build_doc_requirements.py\n\n"
        "import type { DirectInputItem, RequirementDoc } from './docRequirementTypes';\n\n"
        f"export const WALLET_EXTERNAL_DOC_IDS: readonly string[] = {js(sorted(external_ids))};\n\n"
        f"export const REQUIREMENT_DOCS: readonly RequirementDoc[] = {js(out_docs)};\n\n"
        f"export const DIRECT_INPUT_ITEMS: readonly DirectInputItem[] = {js(out_items)};\n\n"
        f"export const ITEM_LABELS_BY_NUMBER: Readonly<Record<number, string>> = {js(item_labels)};\n"
    )
    OUT_TS.write_text(ts, encoding="utf-8", newline="\n")
    print(f"지갑 밖 서류 {len(external)}종, 직접 입력 항목 {len(direct_items)}개 -> {OUT_TS.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
