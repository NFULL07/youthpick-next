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

넣지 않는 것
  판정 규칙(eligibility_rule), 정책 관계, 공고별 제출서류: 사람이 검수해서 따로 넣는다.

실행 (저장소 맨 위 폴더에서)
  미리보기(네트워크 안 씀):  python pipeline/load_supabase.py --raw data_raw/policies_all.json --dry-run
  SQL 파일로 만들기:         python pipeline/load_supabase.py --sql-out data_raw/load.sql --skip-raw
  Supabase에 넣기:           python pipeline/load_supabase.py --raw data_raw/policies_all.json
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

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "docs" / "data"

# 매칭표 기준 후보 수 (docs/handoff/supabase_setup.md 3장)
EXPECTED_MATCH = {"개별 매칭": 18, "묶음 레코드": 3, "API에 없음": 7}
INCOME_CODE_ANY = "0043001"  # earnCndSeCd 무관 (공개 코드 기준, 공식 코드표 아님)
INCOME_WORDS = re.compile(r"중위\s*소득|소득\s*(기준|구간|분위|인정액|[0-9])|[0-9]\s*분위|[0-9]\s*구간")
BATCH = 500


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
def build_personal_fields(rows: list[dict]) -> list[dict]:
    return [
        {
            "id": r["항목ID"].strip(),
            "name": r["항목명"].strip(),
            "category": text(r["대분류"]) if r["대분류"].strip() != "-" else None,
            "storage_class": r["구분"].strip(),
            "input_method": text(r["정의·입력 방식"]),
            "note": text(r["주의·미정사항"]),
        }
        for r in rows
    ]


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


def build_policies(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        group = r["목적묶음"].strip()
        out.append(
            {
                "id": r["후보ID"].strip(),
                "name": r["정책명"].strip(),
                "agency": text(r["운영기관"]),
                "selection": r["선정구분"].strip(),
                "purpose_group": None if group in ("", "-") else group,
                "region_level": text(r["지역단계"]),
                "category": None,  # 온통청년 5대 분야는 확인 후 채운다(임의로 정하지 않음)
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
                "apply_period_type": text(rec.get("aplyPrdSeCd")),
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
    "api_documents_text", "apply_url", "ref_url", "is_bundle_record", "current_year_unconfirmed",
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
        lines.append(f"원본 중 소득 코드 무관 + 소득 문구: {sum(income_conflict(r['payload']) for r in raw)}건 (handoff 기록 51건과 대조)")
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
}


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


def post_rows(base_url: str, key: str, table: str, rows: list[dict], conflict: str) -> None:
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        req = urllib.request.Request(
            f"{base_url}/rest/v1/{table}?on_conflict={conflict}",
            data=json.dumps(chunk, ensure_ascii=False).encode("utf-8"),
            method="POST",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                r.read()
        except urllib.error.HTTPError as e:  # 응답 본문만 보여 준다(키는 출력하지 않음)
            body = e.read().decode("utf-8", "replace")[:800]
            sys.exit(f"{table} 적재 실패 ({i + 1}~{i + len(chunk)}행): HTTP {e.code} {body}")
        print(f"  {table}: {i + len(chunk)}/{len(rows)}")


def post_sources(base_url: str, key: str, sources: list[dict]) -> None:
    post_rows(base_url, key, "source_document", sources, "policy_id,url")


def sql_literal(v) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, int):
        return str(v)
    if isinstance(v, list):
        return "array[" + ",".join(sql_literal(x) for x in v) + "]::text[]" if v else "'{}'::text[]"
    if isinstance(v, dict):
        return sql_literal(json.dumps(v, ensure_ascii=False)) + "::jsonb"
    return "'" + str(v).replace("'", "''") + "'"


def to_sql(table: str, rows: list[dict], conflict: str) -> str:
    if not rows:
        return ""
    cols = list(rows[0].keys())
    keys = [c.strip() for c in conflict.split(",")]
    updates = ", ".join(f"{c} = excluded.{c}" for c in cols if c not in keys)
    values = ",\n".join("  (" + ", ".join(sql_literal(r[c]) for c in cols) + ")" for r in rows)
    return (f"insert into public.{table} ({', '.join(cols)}) values\n{values}\n"
            f"on conflict ({conflict}) do update set {updates};\n\n")


# ---------------------------------------------------------------------------
def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="청년픽 NEXT Supabase 적재")
    ap.add_argument("--raw", type=Path, help="policies_all.json 또는 raw 폴더 (data_raw/ 아래, Git 제외)")
    ap.add_argument("--skip-raw", action="store_true", help="API 원본 없이 CSV만 적재(공고는 매칭표 값으로)")
    ap.add_argument("--collected-on", help="수집일 YYYY-MM-DD (없으면 폴더 이름 ythapi_YYYYMMDD에서 읽음)")
    ap.add_argument("--dry-run", action="store_true", help="네트워크를 쓰지 않고 행 수와 검증 결과만 출력")
    ap.add_argument("--preview-dir", type=Path, help="--dry-run 때 테이블별 행을 JSON으로 저장할 폴더")
    ap.add_argument("--sql-out", type=Path, help="Supabase 대신 SQL 파일로 저장(SQL 편집기에 붙여 넣기용)")
    args = ap.parse_args(argv)

    if not args.raw and not args.skip_raw:
        ap.error("--raw 경로를 주거나, 원본 없이 하려면 --skip-raw를 붙이세요.")

    cand_rows = read_csv(DATA / "policy_candidates_v0_1.csv")
    match_rows = read_csv(DATA / "api_match_v0_1.csv")

    raw_rows: list[dict] = []
    collected_on = None
    if args.raw:
        if not args.raw.exists():
            sys.exit(f"원본 파일이 없습니다: {args.raw}")
        collected_on = collected_on_from(args.raw, args.collected_on)
        raw_rows = build_raw(read_raw(args.raw), collected_on)

    raw_index = {r["plcy_no"]: r["payload"] for r in raw_rows}
    tables = {
        "personal_field": build_personal_fields(read_csv(DATA / "personal_fields_v0_3.csv")),
        "document_catalog": build_document_catalog(read_csv(DATA / "doc_requirements_docs_v1.csv")),
        "policy": build_policies(cand_rows),
        "api_policy_raw": raw_rows,
        "policy_notice": build_notices(match_rows, cand_rows, raw_index, collected_on),
    }
    sources = build_sources(cand_rows)
    match_counts = check_match_counts(match_rows)

    for line in report({**tables, "source_document": sources}, match_counts, bool(raw_rows)):
        print(line)
    errors = validate(tables, match_counts)
    if errors:
        print("\n검증 실패:")
        for e in errors:
            print(" -", e)
        return 1
    print("검증 통과")

    if args.dry_run:
        if args.preview_dir:
            args.preview_dir.mkdir(parents=True, exist_ok=True)
            for name, rows in {**tables, "source_document": sources}.items():
                sample = rows if name != "api_policy_raw" else rows[:20]
                (args.preview_dir / f"{name}.json").write_text(
                    json.dumps(sample, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"미리보기 저장: {args.preview_dir}")
        return 0

    if args.sql_out:
        parts = ["-- load_supabase.py가 만든 파일. 다시 실행해도 같은 행이 두 번 생기지 않는다.\nbegin;\n\n"]
        for name, rows in tables.items():
            parts.append(to_sql(name, rows, ON_CONFLICT[name]))
        parts.append(to_sql("source_document", sources, "policy_id,url"))
        parts.append("commit;\n")
        args.sql_out.parent.mkdir(parents=True, exist_ok=True)
        args.sql_out.write_text("".join(parts), encoding="utf-8")
        print(f"SQL 저장: {args.sql_out}")
        return 0

    base_url, key = load_env()
    for name, rows in tables.items():
        if rows:
            post_rows(base_url, key, name, rows, ON_CONFLICT[name])
    post_sources(base_url, key, sources)
    print("적재 완료")
    return 0


if __name__ == "__main__":
    sys.exit(main())
