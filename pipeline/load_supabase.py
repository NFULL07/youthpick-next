# -*- coding: utf-8 -*-
"""
청년픽 NEXT - Supabase 적재 스크립트 (v0.1, 2026-11-17)

무엇을 넣나 (supabase/migrations/20261117000000_init_policy_schema.sql 기준)
  personal_field    docs/data/personal_fields_v0_3.csv        개인화 항목 69개 "정의"(값 아님)
  document_catalog  docs/data/doc_requirements_docs_v1.csv    확인 서류 39종
  policy            docs/data/policy_candidates_v0_1.csv      정책 후보 41건(1차안 28, 예비 10, 제외 3)
  api_policy_raw    data_raw/policies_all.json (--raw)        온통청년 API 원본 레코드
  policy_notice     docs/data/api_match_v0_1.csv + 원본       1차안 28건의 공고(API 26건 + API에 없음 7건)
  source_document   docs/data/policy_candidates_v0_1.csv      출처 URL

  eligibility_rule      docs/data/eligibility_rules_v0_1.csv      판정 규칙(초안·검수 완료)
  policy_relationship   docs/data/policy_relationships_v0_1.csv   정책 관계
  document_requirement  docs/data/document_requirements_v0_1.csv  공고별 제출서류

판정 규칙·관계·제출서류는 CSV가 원본이다. 검수 상태가 '검수 완료'인 행만 화면에 보인다.
초안을 검수 완료로 바꾸려면 근거 URL, 근거 원문 인용, 검수자, 검수일을 채워야 한다(없으면 적재를 멈춘다).

실행 (저장소 맨 위 폴더에서)
  미리보기(네트워크 안 씀):  python pipeline/load_supabase.py --raw data_raw/policies_all.json --dry-run
  SQL 파일로 만들기:         python pipeline/load_supabase.py --sql-out data_raw/load.sql --skip-raw
  Supabase에 넣기:           python pipeline/load_supabase.py --raw data_raw/policies_all.json
  API 값으로 규칙 초안 만들기: python pipeline/load_supabase.py --write-rule-drafts docs/data/eligibility_rules_v0_1.csv
    필요한 값: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (환경변수 또는 저장소 맨 위 .env)
    service_role 키는 이 스크립트에서만 쓴다. 화면 코드·커밋·출력에 넣지 않는다.

다시 실행해도 같은 행이 두 번 생기지 않는다(키 기준 upsert).
표준 라이브러리만 사용한다(Python 3.9+).
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import urllib.error
import urllib.request
from collections import Counter
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import rule_tables as rt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "data"
RULES_CSV = DATA / "eligibility_rules_v0_1.csv"
RELATIONS_CSV = DATA / "policy_relationships_v0_1.csv"
DOCUMENTS_CSV = DATA / "document_requirements_v0_1.csv"

# 매칭표 기준 후보 수 (docs/handoff/supabase_setup.md 3장)
EXPECTED_MATCH = {"개별 매칭": 18, "묶음 레코드": 3, "API에 없음": 7}
INCOME_CODE_ANY = "0043001"  # earnCndSeCd 무관 (공개 코드 기준, 공식 코드표 아님)
INCOME_WORDS = re.compile(r"중위\s*소득|소득\s*(기준|구간|분위|인정액|[0-9])|[0-9]\s*분위|[0-9]\s*구간")
BATCH = 500

# 화면 분야(온통청년 5대 분야). API 대분류(lclsfNm)가 있으면 그것을 쓰고, 없으면 목적묶음으로 잠정 분류한다.
# 잠정 분류는 사람이 정한 값이 아니다. policy.category_basis에 근거를 남기고 확인 후 고친다.
API_CATEGORY_WORDS = [
    ("일자리", "일자리"), ("주거", "주거"), ("교육", "교육·직업훈련"),
    ("복지", "금융·복지·문화"), ("금융", "금융·복지·문화"), ("문화", "금융·복지·문화"), ("참여", "참여·기반"),
]
PROVISIONAL_CATEGORY = {
    "A": "교육·직업훈련", "B": "교육·직업훈련", "C": "주거", "D": "일자리",
    "E": "일자리", "F": "금융·복지·문화", "G": "금융·복지·문화", "H": "일자리",
}
BASIS_API = "온통청년 API 대분류"
BASIS_PROVISIONAL = "목적묶음 기준 잠정"


# ---------------------------------------------------------------------------
# 읽기
# ---------------------------------------------------------------------------
def read_csv(path: Path) -> list[dict]:
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def read_raw(path: Path) -> list[dict]:
    """policies_all.json(레코드 배열) 또는 raw/page_*.json 폴더를 읽는다."""
    if path.is_dir():
        records: list[dict] = []
        for p in sorted(path.glob("page_*.json")):
            records.extend(find_list(json.loads(p.read_text(encoding="utf-8"))) or [])
        return records
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, list) else (find_list(data) or [])


def find_list(obj):
    if isinstance(obj, list) and obj and isinstance(obj[0], dict) and "plcyNo" in obj[0]:
        return obj
    if isinstance(obj, dict):
        for v in obj.values():
            found = find_list(v)
            if found is not None:
                return found
    return None


def collected_on_from(path: Path | None, override: str | None) -> str:
    """수집일: --collected-on > 폴더 이름 ythapi_YYYYMMDD > 파일 수정일."""
    if override:
        return date.fromisoformat(override).isoformat()
    if path is not None:
        for part in [path.name, *[p.name for p in path.parents]]:
            m = re.search(r"ythapi_(\d{8})", part)
            if m:
                return datetime.strptime(m.group(1), "%Y%m%d").date().isoformat()
        if path.exists():
            return date.fromtimestamp(path.stat().st_mtime).isoformat()
    return date.today().isoformat()


# ---------------------------------------------------------------------------
# 작은 변환 함수
# ---------------------------------------------------------------------------
def text(v) -> str | None:
    s = "" if v is None else str(v).strip()
    return s or None


def split_codes(v) -> list[str]:
    return [c.strip() for c in str(v or "").split(",") if c.strip()]


def to_int(v) -> int | None:
    s = str(v if v is not None else "").strip()
    return int(s) if re.fullmatch(r"-?\d+", s) else None


def parse_period(v) -> tuple[str | None, str | None]:
    """'20260701 ~ 20261117' -> ('2026-07-01', '2026-11-17'). 여러 기간이면 처음 시작~마지막 끝."""
    days = re.findall(r"(20\d{2})(\d{2})(\d{2})", str(v or ""))
    if not days:
        return None, None
    valid = []
    for y, m, d in days:
        try:
            valid.append(date(int(y), int(m), int(d)).isoformat())
        except ValueError:
            continue
    if not valid:
        return None, None
    return min(valid), max(valid)


def income_conflict(rec: dict) -> bool:
    """소득 코드는 '무관'인데 문구에 소득 기준이 보이는지(품질 문제 3). 단순 문자열 기준이라 사람이 다시 본다."""
    if str(rec.get("earnCndSeCd", "")).strip() != INCOME_CODE_ANY:
        return False
    texts = [rec.get("earnEtcCn"), rec.get("addAplyQlfcCndCn"), rec.get("ptcpPrpTrgtCn")]
    return any(INCOME_WORDS.search(str(t or "")) for t in texts)


# ---------------------------------------------------------------------------
# 행 만들기
# ---------------------------------------------------------------------------
def build_personal_fields(rows: list[dict], item_rows: list[dict] | None = None) -> list[dict]:
    """item_rows: 항목별 확인서류표(doc_requirements_items). 항목을 어떤 서류로 확인하는지 붙인다."""
    guide = {r["원문 영문 ID"].strip(): r for r in (item_rows or [])}
    out = []
    for r in rows:
        g = guide.get(r["항목ID"].strip(), {})
        out.append({
            "id": r["항목ID"].strip(),
            "name": r["항목명"].strip(),
            "category": text(r["대분류"]) if r["대분류"].strip() != "-" else None,
            "storage_class": r["구분"].strip(),
            "input_method": text(r["정의·입력 방식"]),
            "note": text(r["주의·미정사항"]),
            "check_documents": text(g.get("확인할 서류·자료")),
            "check_content": text(g.get("서류에서 확인하는 내용")),
            "caution": text(g.get("한계·주의사항")),
            "document_ids": split_codes(g.get("서류ID")),
        })
    return out


def build_document_catalog(rows: list[dict]) -> list[dict]:
    return [
        {
            "id": r["서류ID"].strip(),
            "name": r["서류·자료명"].strip(),
            "issuer": text(r["발급기관"]),
            "issue_path": text(r["발급·확인 경로"]),
            "checkable_content": text(r["확인 가능한 내용"]),
            "e_cert_support": text(r["전자증명서 지원"]),
            "kakao_list": text(r["카카오 공개목록"]),
            "naver_list": text(r["네이버 공개목록"]),
            # pipeline/build_doc_requirements.py와 같은 기준
            "wallet_external": "미확인" in r["카카오 공개목록"] and "미확인" in r["네이버 공개목록"],
            "limits": text(r["한계·확인할 점"]),
        }
        for r in rows
    ]


def category_from_api(value) -> str | None:
    """API 대분류(lclsfNm)를 화면 분야로. '일자리,교육'처럼 여러 개면 앞에 적힌 것을 쓴다.
    실측 값: 일자리, 주거, 교육･직업훈련, 금융･복지･문화, 참여･기반, (이전 표기) 교육, 복지문화, 참여권리."""
    for token in str(value or "").split(","):
        for word, category in API_CATEGORY_WORDS:
            if word in token:
                return category
    return None


def build_policies(rows: list[dict], api_categories: dict[str, str] | None = None) -> list[dict]:
    """api_categories: 정책ID -> 그 정책 공고의 API 대분류(lclsfNm)."""
    out = []
    for r in rows:
        group = r["목적묶음"].strip()
        from_api = category_from_api((api_categories or {}).get(r["후보ID"].strip()))
        provisional = PROVISIONAL_CATEGORY.get(group[:1])
        category = from_api or provisional
        basis = BASIS_API if from_api else (BASIS_PROVISIONAL if provisional else None)
        out.append(
            {
                "id": r["후보ID"].strip(),
                "name": r["정책명"].strip(),
                "agency": text(r["운영기관"]),
                "selection": r["선정구분"].strip(),
                "purpose_group": None if group in ("", "-") else group,
                "region_level": text(r["지역단계"]),
                "category": category,
                "category_basis": basis,
                "target_summary": text(r["대상 요약"]),
                "residence_requirement": text(r["거주·소속 요건"]),
                "benefit_type": text(r["혜택 형태"]),
                "benefit_text": text(r["혜택 내용"]),
                "verification_level": text(r["확인수준 분류"]),
                "review_status": text(r["원문 검수 상태"]) or "검수 전",
                "recheck_note": text(r["재확인 필요사항"]),
            }
        )
    return out


def build_raw(records: list[dict], collected_on: str) -> list[dict]:
    seen: dict[str, dict] = {}
    for rec in records:
        no = str(rec.get("plcyNo", "")).strip()
        if not re.fullmatch(r"\d{20}", no):
            continue
        clean = {k: v for k, v in rec.items() if not str(k).startswith("_")}  # 수집 스크립트가 붙인 _region 등 제외
        seen[no] = {
            "plcy_no": no,
            "plcy_nm": text(rec.get("plcyNm")),
            "zip_codes": split_codes(rec.get("zipCd")),
            "payload": clean,
            "last_modified": text(rec.get("lastMdfcnDt")),
            "collected_on": collected_on,
        }
    return list(seen.values())


def build_notices(match_rows: list[dict], cand_rows: list[dict], raw_index: dict[str, dict],
                  collected_on: str | None) -> list[dict]:
    cand = {r["후보ID"].strip(): r for r in cand_rows}
    notices = []
    for m in match_rows:
        cid = m["후보ID"].strip()
        c = cand.get(cid, {})
        status = m["매칭 상태"].strip()
        no = m["API plcyNo"].strip()
        common = {
            "policy_id": cid,
            "match_status": status,
            "apply_period_original": text(c.get("2026 접수기간")),
            "apply_status_original": text(c.get("접수상태 분류")),
            "review_note": text(m.get("새로 확인된 점")),
        }
        if not no:  # API에 없음 -> 원문 기준 수기 공고
            notices.append(empty_notice() | common | {
                "notice_key": f"{cid}:manual",
                "plcy_no": None,
                "source_kind": "manual",
                "title": c.get("정책명", m["정책명(v0.1)"]).strip(),
                "operator_label": text(c.get("운영기관")),
                "region_label": text(c.get("지역단계")),
            })
            continue

        rec = raw_index.get(no)
        start, end = parse_period(rec.get("aplyYmd") if rec else m.get("API 신청기간"))
        year = int(start[:4]) if start else int(no[:4])
        if rec:
            api = {
                "title": text(rec.get("plcyNm")) or m["API 정책명"].strip(),
                "operator_label": text(rec.get("operInstCdNm")) or text(rec.get("sprvsnInstCdNm")),
                "zip_codes": split_codes(rec.get("zipCd")),
                # 원본은 코드(0057001 등)라서 매칭표에 적어 둔 이름(특정기간·상시·마감)을 먼저 쓴다
                "apply_period_type": text(m.get("API 신청기간 구분")) or text(rec.get("aplyPrdSeCd")),
                "api_min_age": to_int(rec.get("sprtTrgtMinAge")),
                "api_max_age": to_int(rec.get("sprtTrgtMaxAge")),
                "api_income_code": text(rec.get("earnCndSeCd")),
                "api_income_text": text(rec.get("earnEtcCn")),
                "income_text_conflict": income_conflict(rec),
                "api_school_codes": split_codes(rec.get("schoolCd")) or None,
                "api_job_codes": split_codes(rec.get("jobCd")) or None,
                "api_special_codes": split_codes(rec.get("sbizCd")) or None,
                "api_marriage_code": text(rec.get("mrgSttsCd")),
                "api_major_codes": split_codes(rec.get("plcyMajorCd")) or None,
                "api_extra_qualification": text(rec.get("addAplyQlfcCndCn")),
                "api_restriction_text": text(rec.get("ptcpPrpTrgtCn")),
                "api_documents_text": text(rec.get("sbmsnDcmntCn")),
                "api_category": text(rec.get("lclsfNm")),
                "api_subcategory": text(rec.get("mclsfNm")),
                "api_support_text": text(rec.get("plcySprtCn")),
                "api_summary": text(rec.get("plcyExplnCn")),
                "apply_url": text(rec.get("aplyUrlAddr")),
                "ref_url": text(rec.get("refUrlAddr1")),
                "api_last_modified": text(rec.get("lastMdfcnDt")),
                "collected_on": collected_on,
            }
        else:  # 원본이 없으면 매칭표에 적힌 값만 쓴다(코드값은 비움)
            ages = re.findall(r"\d+", m.get("연령(API)", ""))
            api = {
                "title": m["API 정책명"].strip() or c.get("정책명", "").strip(),
                "apply_period_type": text(m.get("API 신청기간 구분")),
                "api_min_age": int(ages[0]) if len(ages) >= 1 else None,
                "api_max_age": int(ages[1]) if len(ages) >= 2 else None,
                "api_extra_qualification": text(m.get("추가 신청 자격(API 원문)")),
                "api_restriction_text": text(m.get("참여 제한 대상(API 원문)")),
                "api_income_text": text(m.get("소득 기타(API 원문)")),
                "api_documents_text": text(m.get("제출 서류(API 원문)")),
                "api_last_modified": text(m.get("최종 수정일(API)")),
            }
        notices.append(empty_notice() | common | api | {
            "notice_key": f"{cid}:{no}",
            "plcy_no": no,
            "source_kind": "api",
            "region_label": text(m.get("API 지역 분류")),
            "notice_year": year,
            "apply_start": start,
            "apply_end": end,
            "is_bundle_record": status == "묶음 레코드",
        })

    # 품질 문제 7: 한 정책의 API 공고가 모두 2026년 이전이면 2026 운영 여부 미확인
    years: dict[str, list[int]] = {}
    for n in notices:
        if n["source_kind"] == "api":
            years.setdefault(n["policy_id"], []).append(n["notice_year"])
    for n in notices:
        ys = years.get(n["policy_id"])
        n["current_year_unconfirmed"] = bool(ys) and max(ys) < 2026
    return notices


NOTICE_COLUMNS = [
    "notice_key", "policy_id", "plcy_no", "source_kind", "match_status", "title", "operator_label",
    "region_label", "zip_codes", "notice_year", "apply_period_type", "apply_start", "apply_end",
    "apply_period_original", "apply_status_original", "api_min_age", "api_max_age", "api_income_code",
    "api_income_text", "income_text_conflict", "api_school_codes", "api_job_codes", "api_special_codes",
    "api_marriage_code", "api_major_codes", "api_extra_qualification", "api_restriction_text",
    "api_documents_text", "api_category", "api_subcategory", "api_support_text", "api_summary",
    "apply_url", "ref_url", "is_bundle_record", "current_year_unconfirmed",
    "api_last_modified", "review_note", "collected_on",
]


def empty_notice() -> dict:
    row = {c: None for c in NOTICE_COLUMNS}
    row.update(zip_codes=[], income_text_conflict=False, is_bundle_record=False, current_year_unconfirmed=False)
    return row


def build_sources(cand_rows: list[dict]) -> list[dict]:
    out = []
    for r in cand_rows:
        for col, title_col in (("출처 URL 1", "문구 출처·연도"), ("출처 URL 2", None)):
            url = r.get(col, "").strip()
            if not url.startswith(("http://", "https://")):
                continue
            out.append({
                "policy_id": r["후보ID"].strip(),
                "url": url,
                "title": text(r.get(title_col)) if title_col else None,
                "verification_level": text(r.get("확인수준 분류")),
                "note": text(r.get("확인수준")),
            })
    # 같은 정책에 같은 URL이 두 번 있으면 하나만
    uniq = {(s["policy_id"], s["url"]): s for s in out}
    return list(uniq.values())


# ---------------------------------------------------------------------------
# 검증
# ---------------------------------------------------------------------------
def check_match_counts(match_rows: list[dict]) -> Counter:
    """후보 단위로 개별 매칭 / 묶음 레코드 / API에 없음을 센다."""
    per_cand: dict[str, set[str]] = {}
    for m in match_rows:
        per_cand.setdefault(m["후보ID"].strip(), set()).add(m["매칭 상태"].strip())
    counts = Counter()
    for statuses in per_cand.values():
        if "API에 없음" in statuses:
            counts["API에 없음"] += 1
        elif "묶음 레코드" in statuses:
            counts["묶음 레코드"] += 1
        else:
            counts["개별 매칭"] += 1
    return counts


def report(tables: dict[str, list[dict]], match_counts: Counter, raw_loaded: bool) -> list[str]:
    lines = [f"{name}: {len(rows)}행" for name, rows in tables.items()]
    lines.append("후보별 매칭: " + ", ".join(f"{k} {match_counts.get(k, 0)}" for k in EXPECTED_MATCH))
    notices = tables.get("policy_notice", [])
    if notices:
        no_raw = [n["notice_key"] for n in notices if n["source_kind"] == "api" and n.get("collected_on") is None]
        lines.append(f"원본 레코드를 못 찾은 API 공고: {len(no_raw)}건" + (f" {no_raw}" if no_raw else ""))
        lines.append("2026 운영 미확인 공고: " + ", ".join(sorted({n['policy_id'] for n in notices if n['current_year_unconfirmed']})))
        lines.append("묶음 레코드 공고: " + ", ".join(sorted({n['policy_id'] for n in notices if n['is_bundle_record']})))
        if raw_loaded:
            lines.append("소득 코드 무관 + 소득 문구(공고): " + ", ".join(sorted({n['notice_key'] for n in notices if n['income_text_conflict']})))
    raw = tables.get("api_policy_raw", [])
    if raw:
        lines.append(f"원본 중 소득 코드 무관 + 소득 문구: {sum(income_conflict(r['payload']) for r in raw)}건 "
                     "(문자열 기준. supabase_setup.md의 51건과는 세는 기준이 달라 수가 다르다)")
    return lines


def validate(tables: dict[str, list[dict]], match_counts: Counter) -> list[str]:
    errors = []
    for k, v in EXPECTED_MATCH.items():
        if match_counts.get(k, 0) != v:
            errors.append(f"후보별 매칭 {k}: {match_counts.get(k, 0)}건 (기대 {v}건)")
    policy_ids = {p["id"] for p in tables["policy"]}
    for n in tables.get("policy_notice", []):
        if n["policy_id"] not in policy_ids:
            errors.append(f"공고 {n['notice_key']}의 정책 {n['policy_id']}가 정책 목록에 없음")
    keys = [n["notice_key"] for n in tables.get("policy_notice", [])]
    dup = [k for k, c in Counter(keys).items() if c > 1]
    if dup:
        errors.append(f"공고 키 중복: {dup}")
    ext = sum(d["wallet_external"] for d in tables.get("document_catalog", []))
    if tables.get("document_catalog") and ext != 14:
        errors.append(f"지갑 밖 서류 {ext}종 (기대 14종)")
    return errors


# ---------------------------------------------------------------------------
# 내보내기: Supabase REST / SQL 파일
# ---------------------------------------------------------------------------
ON_CONFLICT = {
    "personal_field": "id",
    "document_catalog": "id",
    "policy": "id",
    "api_policy_raw": "plcy_no",
    "policy_notice": "notice_key",
    "source_document": "policy_id,url",
    "eligibility_rule": "notice_id,rule_key",
    "policy_relationship": "notice_a_id,notice_b_id,relation",
    "document_requirement": "notice_id,name",
}
JSONB_COLUMNS = {"value", "choices", "payload"}
RULE_COLUMNS = ["rule_key", "field_id", "operator", "value", "any_of_group", "label", "fail_reason", "question",
                "choices", "unit", "sort_order", "source_quote", "source_locator", "origin", "review_status",
                "reviewed_by", "reviewed_at"]
RELATION_COLUMNS = ["relation", "condition_text", "source_quote", "source_locator", "origin", "review_status",
                    "reviewed_by", "reviewed_at"]
DOCUMENT_COLUMNS = ["document_id", "name", "required", "note", "review_status"]


def load_env() -> tuple[str, str]:
    env: dict[str, str] = {}
    env_file = ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    url = os.environ.get("SUPABASE_URL") or env.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        sys.exit("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY가 없습니다. 환경변수나 저장소 맨 위 .env에 넣어 주세요.")
    return url.rstrip("/"), key


def _request(base_url: str, key: str, method: str, path: str, body=None, prefer: str | None = None):
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    if prefer:
        headers["Prefer"] = prefer
    req = urllib.request.Request(f"{base_url}/rest/v1/{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:  # 응답 본문만 보여 준다(키는 출력하지 않음)
        detail = e.read().decode("utf-8", "replace")[:800]
        sys.exit(f"{method} {path.split('?')[0]} 실패: HTTP {e.code} {detail}")


def post_rows(base_url: str, key: str, table: str, rows: list[dict], conflict: str) -> None:
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        _request(base_url, key, "POST", f"{table}?on_conflict={conflict}", chunk,
                 "resolution=merge-duplicates,return=minimal")
        print(f"  {table}: {i + len(chunk)}/{len(rows)}")


def get_rows(base_url: str, key: str, table: str, select: str) -> list[dict]:
    rows, start = [], 0
    while True:
        page = _request(base_url, key, "GET", f"{table}?select={select}&order=id&limit=1000&offset={start}") or []
        rows.extend(page)
        if len(page) < 1000:
            return rows
        start += 1000


def delete_ids(base_url: str, key: str, table: str, ids: list[int]) -> None:
    for i in range(0, len(ids), 200):
        chunk = ",".join(str(x) for x in ids[i:i + 200])
        _request(base_url, key, "DELETE", f"{table}?id=in.({chunk})", prefer="return=minimal")


def ordered_pair(relation: str, a: int, b: int) -> tuple[int, int]:
    """방향이 없는 관계는 작은 id를 a에 둔다(DB 제약과 같음). 선행조건은 a가 b를 먼저 필요로 한다."""
    return (a, b) if relation == "선행조건" else (min(a, b), max(a, b))


def load_rule_tables(base_url: str, key: str, rules: list[dict], relations: list[dict], documents: list[dict],
                     prune: bool) -> None:
    notice_id = {r["notice_key"]: r["id"] for r in get_rows(base_url, key, "policy_notice", "id,notice_key")}
    source_id = {(r["policy_id"], r["url"]): r["id"]
                 for r in get_rows(base_url, key, "source_document", "id,policy_id,url")}

    def src(row: dict):
        return source_id.get((row["policy_id"], row["source_url"])) if row.get("source_url") else None

    rule_rows = [{"notice_id": notice_id[r["notice_key"]], "source_document_id": src(r),
                  **{c: r[c] for c in RULE_COLUMNS}} for r in rules]
    relation_rows = []
    for r in relations:
        a, b = ordered_pair(r["relation"], notice_id[r["notice_key_a"]], notice_id[r["notice_key_b"]])
        relation_rows.append({"notice_a_id": a, "notice_b_id": b, "source_document_id": src(r),
                              **{c: r[c] for c in RELATION_COLUMNS}})
    document_rows = [{"notice_id": notice_id[r["notice_key"]], "source_document_id": src(r),
                      **{c: r[c] for c in DOCUMENT_COLUMNS}} for r in documents]

    plan = [
        ("eligibility_rule", rule_rows, "id,notice_id,rule_key", lambda r: (r["notice_id"], r["rule_key"])),
        ("policy_relationship", relation_rows, "id,notice_a_id,notice_b_id,relation",
         lambda r: (r["notice_a_id"], r["notice_b_id"], r["relation"])),
        ("document_requirement", document_rows, "id,notice_id,name", lambda r: (r["notice_id"], r["name"])),
    ]
    for table, rows, select, keyfn in plan:
        if rows:
            post_rows(base_url, key, table, rows, ON_CONFLICT[table])
        wanted = {keyfn(r) for r in rows}
        stale = [r["id"] for r in get_rows(base_url, key, table, select) if keyfn(r) not in wanted]
        if stale and prune:
            delete_ids(base_url, key, table, stale)
            print(f"  {table}: CSV에 없는 행 {len(stale)}건 삭제")
        elif stale:
            print(f"  {table}: DB에만 있고 CSV에 없는 행 {len(stale)}건 (지우려면 --prune)")


class Sql(str):
    """sql_literal이 따옴표 없이 그대로 쓰는 SQL 식."""


def sql_literal(v) -> str:
    if isinstance(v, Sql):
        return str(v)
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        return "array[" + ",".join(sql_literal(x) for x in v) + "]::text[]" if v else "'{}'::text[]"
    if isinstance(v, dict):
        return sql_literal(json.dumps(v, ensure_ascii=False)) + "::jsonb"
    return "'" + str(v).replace("'", "''") + "'"


def sql_value(column: str, v) -> str:
    if column in JSONB_COLUMNS and v is not None and not isinstance(v, Sql):
        return sql_literal(json.dumps(v, ensure_ascii=False)) + "::jsonb"
    return sql_literal(v)


def to_sql(table: str, rows: list[dict], conflict: str) -> str:
    if not rows:
        return ""
    cols = list(rows[0].keys())
    keys = [c.strip() for c in conflict.split(",")]
    updates = ", ".join(f"{c} = excluded.{c}" for c in cols if c not in keys)
    values = ",\n".join("  (" + ", ".join(sql_value(c, r[c]) for c in cols) + ")" for r in rows)
    return (f"insert into public.{table} ({', '.join(cols)}) values\n{values}\n"
            f"on conflict ({conflict}) do update set {updates};\n\n")


def _notice_ref(notice_key: str) -> str:
    return f"(select id from public.policy_notice where notice_key = {sql_literal(notice_key)})"


def _source_ref(row: dict) -> Sql:
    if not row.get("source_url"):
        return Sql("null")
    return Sql(f"(select id from public.source_document where policy_id = {sql_literal(row['policy_id'])} "
               f"and url = {sql_literal(row['source_url'])})")


def rule_tables_sql(rules: list[dict], relations: list[dict], documents: list[dict], prune: bool) -> str:
    rule_rows = [{"notice_id": Sql(_notice_ref(r["notice_key"])), "source_document_id": _source_ref(r),
                  **{c: r[c] for c in RULE_COLUMNS}} for r in rules]
    relation_rows = []
    for r in relations:
        a, b = _notice_ref(r["notice_key_a"]), _notice_ref(r["notice_key_b"])
        if r["relation"] != "선행조건":
            a, b = f"least({a}, {b})", f"greatest({a}, {b})"
        relation_rows.append({"notice_a_id": Sql(a), "notice_b_id": Sql(b), "source_document_id": _source_ref(r),
                              **{c: r[c] for c in RELATION_COLUMNS}})
    document_rows = [{"notice_id": Sql(_notice_ref(r["notice_key"])), "source_document_id": _source_ref(r),
                      **{c: r[c] for c in DOCUMENT_COLUMNS}} for r in documents]
    parts = [
        to_sql("eligibility_rule", rule_rows, ON_CONFLICT["eligibility_rule"]),
        to_sql("policy_relationship", relation_rows, ON_CONFLICT["policy_relationship"]),
        to_sql("document_requirement", document_rows, ON_CONFLICT["document_requirement"]),
    ]
    if prune:
        def keep(pairs: list[str]) -> str:
            return "(values " + ", ".join(pairs) + ")" if pairs else "(select null::text, null::text where false)"
        rule_keep = keep([f"({sql_literal(r['notice_key'])}, {sql_literal(r['rule_key'])})" for r in rules])
        doc_keep = keep([f"({sql_literal(r['notice_key'])}, {sql_literal(r['name'])})" for r in documents])
        parts.append(
            "-- CSV에 없는 행 삭제(--prune)\n"
            "delete from public.eligibility_rule r using public.policy_notice n\n"
            f"  where r.notice_id = n.id and (n.notice_key, r.rule_key) not in {rule_keep};\n"
            "delete from public.document_requirement d using public.policy_notice n\n"
            f"  where d.notice_id = n.id and (n.notice_key, d.name) not in {doc_keep};\n")
        if relation_rows:
            triples = ", ".join(f"({r['notice_a_id']}, {r['notice_b_id']}, {sql_literal(r['relation'])})"
                                for r in relation_rows)
            parts.append("delete from public.policy_relationship\n"
                         f"  where (notice_a_id, notice_b_id, relation) not in (values {triples});\n\n")
        else:
            parts.append("delete from public.policy_relationship;\n\n")
    return "".join(parts)


# ---------------------------------------------------------------------------
def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="청년픽 NEXT Supabase 적재")
    ap.add_argument("--raw", type=Path, help="policies_all.json 또는 raw 폴더 (data_raw/ 아래, Git 제외)")
    ap.add_argument("--skip-raw", action="store_true", help="API 원본 없이 CSV만 적재(공고는 매칭표 값으로)")
    ap.add_argument("--collected-on", help="수집일 YYYY-MM-DD (없으면 폴더 이름 ythapi_YYYYMMDD에서 읽음)")
    ap.add_argument("--dry-run", action="store_true", help="네트워크를 쓰지 않고 행 수와 검증 결과만 출력")
    ap.add_argument("--preview-dir", type=Path, help="--dry-run 때 테이블별 행을 JSON으로 저장할 폴더")
    ap.add_argument("--sql-out", type=Path, help="Supabase 대신 SQL 파일로 저장(SQL 편집기에 붙여 넣기용)")
    ap.add_argument("--prune", action="store_true", help="판정 규칙·관계·제출서류에서 CSV에 없는 행을 DB에서 지움")
    ap.add_argument("--rules-csv", type=Path, default=RULES_CSV, help="판정 규칙 CSV (기본: docs/data)")
    ap.add_argument("--relations-csv", type=Path, default=RELATIONS_CSV, help="정책 관계 CSV (기본: docs/data)")
    ap.add_argument("--documents-csv", type=Path, default=DOCUMENTS_CSV, help="제출서류 CSV (기본: docs/data)")
    ap.add_argument("--write-rule-drafts", type=Path, metavar="CSV",
                    help="매칭표의 API 값으로 판정 규칙 초안 CSV를 만들고 끝냄(이미 있는 파일은 덮어쓰지 않음)")
    args = ap.parse_args(argv)

    cand_rows = read_csv(DATA / "policy_candidates_v0_1.csv")
    match_rows = read_csv(DATA / "api_match_v0_1.csv")

    if args.write_rule_drafts:
        if args.write_rule_drafts.exists():
            sys.exit(f"이미 있는 파일은 덮어쓰지 않습니다: {args.write_rule_drafts}")
        drafts = rt.draft_rules_from_match(match_rows)
        rt.write_csv(args.write_rule_drafts, rt.RULE_HEADERS, drafts)
        print(f"규칙 초안 {len(drafts)}행 저장: {args.write_rule_drafts} (모두 '초안'. 원문 대조 후 '검수 완료'로 바꾸세요)")
        return 0

    if not args.raw and not args.skip_raw:
        ap.error("--raw 경로를 주거나, 원본 없이 하려면 --skip-raw를 붙이세요.")

    raw_rows: list[dict] = []
    collected_on = None
    if args.raw:
        if not args.raw.exists():
            sys.exit(f"원본 파일이 없습니다: {args.raw}")
        collected_on = collected_on_from(args.raw, args.collected_on)
        raw_rows = build_raw(read_raw(args.raw), collected_on)

    raw_index = {r["plcy_no"]: r["payload"] for r in raw_rows}
    notices = build_notices(match_rows, cand_rows, raw_index, collected_on)
    api_categories: dict[str, str] = {}
    for n in notices:
        if n.get("api_category"):
            api_categories.setdefault(n["policy_id"], n["api_category"])
    field_rows = read_csv(DATA / "personal_fields_v0_3.csv")
    tables = {
        "personal_field": build_personal_fields(field_rows, read_csv(DATA / "doc_requirements_items_v1.csv")),
        "document_catalog": build_document_catalog(read_csv(DATA / "doc_requirements_docs_v1.csv")),
        "policy": build_policies(cand_rows, api_categories),
        "api_policy_raw": raw_rows,
        "policy_notice": notices,
    }
    sources = build_sources(cand_rows)
    match_counts = check_match_counts(match_rows)

    notice_policy = {n["notice_key"]: n["policy_id"] for n in notices}
    fields = {f["id"]: f["storage_class"] for f in tables["personal_field"]}
    rules, rule_errors = rt.build_rules(rt.read_rows(args.rules_csv), notice_policy, fields)
    relations, relation_errors = rt.build_relationships(rt.read_rows(args.relations_csv), notice_policy)
    documents, document_errors = rt.build_document_requirements(
        rt.read_rows(args.documents_csv), notice_policy, {d["id"] for d in tables["document_catalog"]})
    sources += rt.extra_sources(rules, relations, documents, {(s["policy_id"], s["url"]) for s in sources})

    for line in report({**tables, "source_document": sources}, match_counts, bool(raw_rows)):
        print(line)
    provisional = sorted(p["id"] for p in tables["policy"] if p["category_basis"] == BASIS_PROVISIONAL and p["selection"] == "1차안")
    print(f"분야가 잠정(목적묶음 기준)인 1차안 정책 {len(provisional)}건: {', '.join(provisional) or '없음'}")
    for name, rows in (("eligibility_rule", rules), ("policy_relationship", relations), ("document_requirement", documents)):
        by_status = Counter(r["review_status"] for r in rows)
        print(f"{name}: {len(rows)}행 (검수 완료 {by_status.get('reviewed', 0)}, 초안 {by_status.get('draft', 0)}, 반려 {by_status.get('rejected', 0)})")

    errors = validate(tables, match_counts) + rule_errors + relation_errors + document_errors
    if errors:
        print("\n검증 실패:")
        for e in errors:
            print(" -", e)
        return 1
    print("검증 통과")

    if args.dry_run:
        if args.preview_dir:
            args.preview_dir.mkdir(parents=True, exist_ok=True)
            preview = {**tables, "source_document": sources, "eligibility_rule": rules,
                       "policy_relationship": relations, "document_requirement": documents}
            for name, rows in preview.items():
                sample = rows if name != "api_policy_raw" else rows[:20]
                (args.preview_dir / f"{name}.json").write_text(
                    json.dumps(sample, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"미리보기 저장: {args.preview_dir}")
        return 0

    if args.sql_out:
        parts = ["-- load_supabase.py가 만든 파일. 다시 실행해도 같은 행이 두 번 생기지 않는다.\nbegin;\n\n"]
        for name, rows in tables.items():
            parts.append(to_sql(name, rows, ON_CONFLICT[name]))
        parts.append(to_sql("source_document", sources, ON_CONFLICT["source_document"]))
        parts.append(rule_tables_sql(rules, relations, documents, args.prune))
        parts.append("commit;\n")
        args.sql_out.parent.mkdir(parents=True, exist_ok=True)
        args.sql_out.write_text("".join(parts), encoding="utf-8")
        print(f"SQL 저장: {args.sql_out}")
        return 0

    base_url, key = load_env()
    for name, rows in tables.items():
        if rows:
            post_rows(base_url, key, name, rows, ON_CONFLICT[name])
    post_rows(base_url, key, "source_document", sources, ON_CONFLICT["source_document"])
    load_rule_tables(base_url, key, rules, relations, documents, args.prune)
    print("적재 완료")
    return 0


if __name__ == "__main__":
    sys.exit(main())
