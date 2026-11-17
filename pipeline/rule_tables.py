# -*- coding: utf-8 -*-
"""
판정 규칙·정책 관계·제출서류 CSV를 읽고 검사한다 (load_supabase.py가 불러 쓴다).

CSV가 원본이다. 화면에는 '검수 완료' 행만 보인다.
- docs/data/eligibility_rules_v0_1.csv
- docs/data/policy_relationships_v0_1.csv
- docs/data/document_requirements_v0_1.csv

원칙 (CLAUDE.md 4장)
- 초안(AI·API)은 사람이 원문과 대조해 '검수 완료'로 바꾸기 전에는 판정에 쓰지 않는다.
- 검수 완료 행은 근거 URL·근거 원문 인용·검수자·검수일이 있어야 한다.
- 금지 문구가 없다는 이유로 '병행 가능'을 만들지 않는다(근거 인용 필수).
"""
from __future__ import annotations

import csv
import json
import re
from datetime import date
from pathlib import Path

RULE_HEADERS = [
    "공고키", "규칙키", "항목ID", "연산자", "값(JSON)", "OR묶음", "화면 문구", "불일치 이유",
    "질문", "선택지(JSON)", "단위", "순서", "근거 URL", "근거 원문 인용", "근거 위치",
    "작성", "검수 상태", "검수자", "검수일", "메모",
]
RELATION_HEADERS = [
    "공고키 A", "공고키 B", "관계", "조건·확인할 내용", "근거 URL", "근거 원문 인용", "근거 위치",
    "작성", "검수 상태", "검수자", "검수일", "메모",
]
DOCUMENT_HEADERS = ["공고키", "서류ID", "서류명", "구분", "메모", "근거 URL", "검수 상태"]

OPERATORS = {"age_between", "between", "gte", "lte", "eq", "in", "not_in", "region_in", "is_true", "is_false"}
RELATIONS = {"병행 제한", "병행 가능", "조건부 병행", "선행조건", "추가 확인"}
REQUIRED_KINDS = {"필수", "해당자", "선택"}

# CSV에는 한글로 적는다. 영문 값도 받는다.
STATUS = {"초안": "draft", "검수 완료": "reviewed", "반려": "rejected",
          "draft": "draft", "reviewed": "reviewed", "rejected": "rejected"}
ORIGIN = {"직접": "manual", "AI 초안": "ai_draft", "API 초안": "api_draft",
          "manual": "manual", "ai_draft": "ai_draft", "api_draft": "api_draft"}

# 화면의 '내 정보'에서 값을 가져오는 항목은 값 이름이 정해져 있다(다르면 판정이 어긋난다).
FIELD_VOCAB = {
    "enrollment_status": {"재학", "휴학", "졸업예정", "졸업", "수료·졸업유예", "대학원"},
    "employment_status": {"재직", "자영업", "미취업", "프리랜서", "일용근로", "예비창업", "단기근로", "영농", "기타"},
}
# supabase/migrations의 region 표와 같아야 한다.
REGION_CODES = {"44", "44130", "44131", "44133", "44200"}
BLOCKED_STORAGE = {"수집 제외", "공고별 일시 입력(보류)"}


def read_rows(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with open(path, encoding="utf-8-sig", newline="") as f:
        return [r for r in csv.DictReader(f) if any((v or "").strip() for v in r.values())]


def _text(v) -> str | None:
    s = (v or "").strip()
    return s or None


def _json(v, where: str, errors: list[str]):
    s = (v or "").strip()
    if not s:
        return None
    try:
        return json.loads(s)
    except json.JSONDecodeError as e:
        errors.append(f"{where}: JSON을 읽을 수 없음 ({e.msg})")
        return None


def _reviewed_at(v, where: str, errors: list[str]) -> str | None:
    s = (v or "").strip()
    if not s:
        return None
    try:
        return date.fromisoformat(s).isoformat() + "T00:00:00+09:00"
    except ValueError:
        errors.append(f"{where}: 검수일은 YYYY-MM-DD 형식이어야 함 ('{s}')")
        return None


def _value_shape_ok(operator: str, value) -> bool:
    if operator in ("age_between", "between"):
        return isinstance(value, dict) and ("min" in value or "max" in value) and all(
            isinstance(value[k], (int, float)) and not isinstance(value[k], bool) for k in ("min", "max") if k in value)
    if operator in ("gte", "lte"):
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if operator == "eq":
        return isinstance(value, (str, int, float, bool))
    if operator in ("in", "not_in", "region_in"):
        return isinstance(value, list) and len(value) > 0 and all(isinstance(x, str) for x in value)
    return True  # is_true, is_false


def build_rules(rows: list[dict], notice_policy: dict[str, str], fields: dict[str, str]) -> tuple[list[dict], list[str]]:
    """notice_policy: 공고키 -> 정책ID, fields: 항목ID -> 구분."""
    out, errors, seen = [], [], set()
    for i, r in enumerate(rows, start=2):
        key, rule_key = (r.get("공고키") or "").strip(), (r.get("규칙키") or "").strip()
        where = f"판정 규칙 {i}행({key}/{rule_key})"
        if key not in notice_policy:
            errors.append(f"{where}: 공고키가 공고 목록에 없음")
            continue
        if not re.fullmatch(r"[a-z][a-z0-9_]*", rule_key):
            errors.append(f"{where}: 규칙키는 영문 소문자·숫자·밑줄만")
        if (key, rule_key) in seen:
            errors.append(f"{where}: 같은 공고에 같은 규칙키가 두 번 있음")
        seen.add((key, rule_key))

        field_id = (r.get("항목ID") or "").strip()
        if field_id not in fields:
            errors.append(f"{where}: 항목ID '{field_id}'가 개인화 항목 목록에 없음")
        elif fields[field_id] in BLOCKED_STORAGE:
            errors.append(f"{where}: '{field_id}'는 {fields[field_id]} 항목이라 규칙에 쓸 수 없음")

        operator = (r.get("연산자") or "").strip()
        value = _json(r.get("값(JSON)"), where, errors)
        if operator not in OPERATORS:
            errors.append(f"{where}: 연산자 '{operator}'를 알 수 없음")
        elif not _value_shape_ok(operator, value):
            errors.append(f"{where}: 연산자 {operator}에 맞지 않는 값 모양")
        elif operator == "region_in":
            unknown = [c for c in value if c not in REGION_CODES]
            if unknown:
                errors.append(f"{where}: region 표에 없는 지역 코드 {unknown}")
        elif field_id in FIELD_VOCAB and operator in ("eq", "in", "not_in"):
            used = value if isinstance(value, list) else [value]
            bad = [v for v in used if v not in FIELD_VOCAB[field_id]]
            if bad:
                errors.append(f"{where}: {field_id} 값 {bad}는 쓸 수 없음. 가능한 값: {sorted(FIELD_VOCAB[field_id])}")

        choices = _json(r.get("선택지(JSON)"), where, errors)
        if choices is not None and not (isinstance(choices, list) and all(isinstance(c, str) for c in choices)):
            errors.append(f"{where}: 선택지는 문자열 배열이어야 함")
            choices = None

        status = STATUS.get((r.get("검수 상태") or "초안").strip())
        origin = ORIGIN.get((r.get("작성") or "직접").strip())
        if status is None:
            errors.append(f"{where}: 검수 상태는 초안 / 검수 완료 / 반려 중 하나")
        if origin is None:
            errors.append(f"{where}: 작성은 직접 / AI 초안 / API 초안 중 하나")
        label = _text(r.get("화면 문구"))
        if not label:
            errors.append(f"{where}: 화면 문구가 비어 있음")
        url, quote = _text(r.get("근거 URL")), _text(r.get("근거 원문 인용"))
        reviewer, reviewed_at = _text(r.get("검수자")), _reviewed_at(r.get("검수일"), where, errors)
        if url and not url.startswith(("http://", "https://")):
            errors.append(f"{where}: 근거 URL은 http(s)로 시작해야 함")
        if status == "reviewed":
            missing = [n for n, v in (("근거 URL", url), ("근거 원문 인용", quote), ("검수자", reviewer), ("검수일", reviewed_at)) if not v]
            if missing:
                errors.append(f"{where}: 검수 완료인데 {', '.join(missing)}이(가) 비어 있음")
        order = (r.get("순서") or "").strip()
        out.append({
            "notice_key": key, "policy_id": notice_policy[key], "rule_key": rule_key, "field_id": field_id,
            "operator": operator, "value": value, "any_of_group": _text(r.get("OR묶음")), "label": label,
            "fail_reason": _text(r.get("불일치 이유")), "question": _text(r.get("질문")), "choices": choices,
            "unit": _text(r.get("단위")), "sort_order": int(order) if re.fullmatch(r"-?\d+", order) else 0,
            "source_url": url, "source_quote": quote, "source_locator": _text(r.get("근거 위치")),
            "origin": origin, "review_status": status,
            "reviewed_by": reviewer if status == "reviewed" else None,
            "reviewed_at": reviewed_at if status == "reviewed" else None,
        })
    return out, errors


def build_relationships(rows: list[dict], notice_policy: dict[str, str]) -> tuple[list[dict], list[str]]:
    out, errors, seen = [], [], set()
    for i, r in enumerate(rows, start=2):
        a, b = (r.get("공고키 A") or "").strip(), (r.get("공고키 B") or "").strip()
        relation = (r.get("관계") or "").strip()
        where = f"정책 관계 {i}행({a} - {b})"
        if a not in notice_policy or b not in notice_policy:
            errors.append(f"{where}: 공고키가 공고 목록에 없음")
            continue
        if a == b:
            errors.append(f"{where}: 같은 공고끼리는 관계를 둘 수 없음")
        if relation not in RELATIONS:
            errors.append(f"{where}: 관계는 {sorted(RELATIONS)} 중 하나")
        pair = (a, b, relation) if relation == "선행조건" else (*sorted((a, b)), relation)
        if pair in seen:
            errors.append(f"{where}: 같은 관계가 두 번 있음")
        seen.add(pair)
        status = STATUS.get((r.get("검수 상태") or "초안").strip())
        origin = ORIGIN.get((r.get("작성") or "직접").strip())
        if status is None:
            errors.append(f"{where}: 검수 상태는 초안 / 검수 완료 / 반려 중 하나")
        if origin is None:
            errors.append(f"{where}: 작성은 직접 / AI 초안 / API 초안 중 하나")
        condition, quote, url = _text(r.get("조건·확인할 내용")), _text(r.get("근거 원문 인용")), _text(r.get("근거 URL"))
        reviewer, reviewed_at = _text(r.get("검수자")), _reviewed_at(r.get("검수일"), where, errors)
        if url and not url.startswith(("http://", "https://")):
            errors.append(f"{where}: 근거 URL은 http(s)로 시작해야 함")
        if relation == "조건부 병행" and not condition:
            errors.append(f"{where}: 조건부 병행은 조건이 있어야 함")
        if status == "reviewed":
            need = [("검수자", reviewer), ("검수일", reviewed_at)]
            need += [("조건·확인할 내용", condition)] if relation == "추가 확인" else [("근거 URL", url), ("근거 원문 인용", quote)]
            missing = [n for n, v in need if not v]
            if missing:
                errors.append(f"{where}: 검수 완료인데 {', '.join(missing)}이(가) 비어 있음")
        out.append({
            "notice_key_a": a, "notice_key_b": b, "policy_id": notice_policy[a], "relation": relation,
            "condition_text": condition, "source_url": url, "source_quote": quote,
            "source_locator": _text(r.get("근거 위치")), "origin": origin, "review_status": status,
            "reviewed_by": reviewer if status == "reviewed" else None,
            "reviewed_at": reviewed_at if status == "reviewed" else None,
        })
    return out, errors


def build_document_requirements(rows: list[dict], notice_policy: dict[str, str], doc_ids: set[str]) -> tuple[list[dict], list[str]]:
    out, errors, seen = [], [], set()
    for i, r in enumerate(rows, start=2):
        key, name = (r.get("공고키") or "").strip(), (r.get("서류명") or "").strip()
        where = f"제출서류 {i}행({key}/{name})"
        if key not in notice_policy:
            errors.append(f"{where}: 공고키가 공고 목록에 없음")
            continue
        if not name:
            errors.append(f"{where}: 서류명이 비어 있음")
        if (key, name) in seen:
            errors.append(f"{where}: 같은 공고에 같은 서류명이 두 번 있음")
        seen.add((key, name))
        doc_id = _text(r.get("서류ID"))
        if doc_id and doc_id not in doc_ids:
            errors.append(f"{where}: 서류ID '{doc_id}'가 서류 목록에 없음")
        kind = (r.get("구분") or "필수").strip()
        if kind not in REQUIRED_KINDS:
            errors.append(f"{where}: 구분은 필수 / 해당자 / 선택 중 하나")
        status = STATUS.get((r.get("검수 상태") or "초안").strip())
        if status is None:
            errors.append(f"{where}: 검수 상태는 초안 / 검수 완료 / 반려 중 하나")
        url = _text(r.get("근거 URL"))
        if url and not url.startswith(("http://", "https://")):
            errors.append(f"{where}: 근거 URL은 http(s)로 시작해야 함")
        out.append({
            "notice_key": key, "policy_id": notice_policy[key], "document_id": doc_id, "name": name,
            "required": kind, "note": _text(r.get("메모")), "source_url": url, "review_status": status,
        })
    return out, errors


def extra_sources(rule_rows: list[dict], relation_rows: list[dict], document_rows: list[dict],
                  known: set[tuple[str, str]]) -> list[dict]:
    """CSV의 근거 URL 가운데 source_document에 아직 없는 것."""
    out: dict[tuple[str, str], dict] = {}
    for r in [*rule_rows, *relation_rows, *document_rows]:
        url = r.get("source_url")
        key = (r["policy_id"], url)
        if url and key not in known and key not in out:
            out[key] = {"policy_id": r["policy_id"], "url": url, "title": None,
                        "verification_level": None, "note": "판정 규칙·관계 CSV의 근거 URL"}
    return list(out.values())


# ---------------------------------------------------------------------------
# API 값에서 규칙 초안 만들기 (검수 전. 화면에 보이지 않는다)
# ---------------------------------------------------------------------------
SCHOOL_TO_ENROLLMENT = {"대학 재학": "재학", "대졸 예정": "졸업예정", "대학 졸업": "졸업", "석·박사": "대학원"}
JOB_TO_EMPLOYMENT = {"재직자": "재직", "자영업자": "자영업", "미취업자": "미취업", "프리랜서": "프리랜서",
                     "일용근로자": "일용근로", "예비창업자": "예비창업", "단기근로자": "단기근로", "영농종사자": "영농"}


def _mapped_codes(cell: str, mapping: dict[str, str]) -> list[str] | None:
    """'대학 재학, 대졸 예정' -> ['재학','졸업예정']. '기타'·'제한없음'이 섞이면 표현할 수 없어 None."""
    tokens = [t.strip() for t in (cell or "").split(",") if t.strip()]
    if not tokens or any(t not in mapping for t in tokens):
        return None
    return [mapping[t] for t in tokens]


def draft_rules_from_match(match_rows: list[dict]) -> list[dict]:
    """매칭표(api_match)의 API 값으로 초안 행을 만든다. 근거는 API 값이므로 원문 대조가 필요하다."""
    drafts = []
    for m in match_rows:
        no = (m.get("API plcyNo") or "").strip()
        if not no:
            continue
        key = f"{m['후보ID'].strip()}:{no}"
        base = {h: "" for h in RULE_HEADERS}
        base.update({"공고키": key, "작성": "API 초안", "검수 상태": "초안"})

        ages = [int(x) for x in re.findall(r"\d+", m.get("연령(API)") or "")]
        if len(ages) == 2 and ages[1] > 0:
            value = {"max": ages[1]} if ages[0] <= 1 else {"min": ages[0], "max": ages[1]}
            label = f"만 {ages[1]}세 이하" if ages[0] <= 1 else f"만 {ages[0]}~{ages[1]}세"
            drafts.append(base | {
                "규칙키": "age", "항목ID": "birth_year", "연산자": "age_between",
                "값(JSON)": json.dumps(value), "화면 문구": label, "순서": "10",
                "근거 원문 인용": f"API 연령 값: {m['연령(API)'].strip()}",
                "근거 위치": "온통청년 API sprtTrgtMinAge·sprtTrgtMaxAge",
                "메모": "나이 기준일(공고일·신청일), 병역 기간 연장 여부를 원문에서 확인",
            })

        enrollment = _mapped_codes(m.get("학력 코드"), SCHOOL_TO_ENROLLMENT)
        if enrollment:
            drafts.append(base | {
                "규칙키": "enrollment", "항목ID": "enrollment_status", "연산자": "in",
                "값(JSON)": json.dumps(enrollment, ensure_ascii=False),
                "화면 문구": "학적: " + " · ".join(enrollment), "순서": "30",
                "근거 원문 인용": f"API 학력 코드: {m['학력 코드'].strip()}",
                "근거 위치": "온통청년 API schoolCd",
                "메모": "휴학생·수료생 포함 여부를 원문에서 확인",
            })

        employment = _mapped_codes(m.get("취업 코드"), JOB_TO_EMPLOYMENT)
        if employment:
            drafts.append(base | {
                "규칙키": "employment", "항목ID": "employment_status", "연산자": "in",
                "값(JSON)": json.dumps(employment, ensure_ascii=False),
                "화면 문구": "취업 상태: " + " · ".join(employment), "순서": "40",
                "근거 원문 인용": f"API 취업 코드: {m['취업 코드'].strip()}",
                "근거 위치": "온통청년 API jobCd",
                "메모": "단시간 근로·아르바이트 허용 범위를 원문에서 확인",
            })
    return drafts


def write_csv(path: Path, headers: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=headers, lineterminator="\n")
        w.writeheader()
        for r in rows:
            w.writerow({h: r.get(h, "") for h in headers})
