# -*- coding: utf-8 -*-
"""
온통청년 청년정책 API 수집 (pipeline/fetch_policies.py)

노트북의 youthpick_fetch_policies.py(2026-11-09, 3,969건 수집)를 저장소로 옮기고,
실제 응답 구조에 맞춰 고친 것. 표준 라이브러리만 쓴다(Python 3.10+).

키
  YTH_POLICY_KEY. 환경변수가 먼저, 없으면 저장소 맨 위 .env(Git 제외).
  키는 화면 출력·저장 파일·오류 메시지에 남기지 않는다(응답에 섞여 오면 *** 로 가린다).

실행 (저장소 맨 위에서)
  키 설정 확인(값은 안 보임):  python pipeline/fetch_policies.py --check-env
  한 페이지만 시험:            python pipeline/fetch_policies.py --max-pages 1
  전체 수집:                   python pipeline/fetch_policies.py
    -> data_raw/ythapi_YYYYMMDD_HHMM/ 에 raw/page_NNN.json, policies_all.json, field_coverage.csv
  다음 단계(적재 미리보기):     python pipeline/load_supabase.py --raw <그 폴더>/policies_all.json --dry-run

응답 구조 (2026-11-09 실제 응답 40페이지로 확인)
  {"resultCode": "200", "resultMessage": "...",
   "result": {"pagging": {"totCount": 3969, "pageNum": 1, "pageSize": 100},
              "youthPolicyList": [{"plcyNo": ..., ...}, ...]}}
  엔드포인트와 파라미터 이름은 공식 명세가 아니라 공개 코드 기준이다(docs/handoff/supabase_setup.md 3장).

종료 코드: 0 성공, 1 검증 실패(파일은 남김), 2 설정·통신 오류
"""
from __future__ import annotations

import argparse
import csv
import json
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Callable

sys.path.insert(0, str(Path(__file__).resolve().parent))
import env_config  # noqa: E402

BASE_URL = "https://www.youthcenter.go.kr/go/ythip/getPlcy"
KEY_NAME = "YTH_POLICY_KEY"
DEFAULT_OUT = env_config.ROOT / "data_raw"
PAGE_SIZE = 100          # 2026-11-09 수집에서 100으로 정상 동작
SLEEP_SEC = 0.5          # 호출 간격. 트래픽 제한 수치는 공개되지 않음
TIMEOUT_SEC = 30
RETRIES = 3              # 일시 오류(5xx, 시간 초과, 연결 끊김)만 다시 시도
USER_AGENT = "youthpick-next-pipeline"

# 2026-11-09 수집본의 필드 60개. 새 필드가 생기거나 빠지면 경고한다(형식 변경 감지용).
KNOWN_FIELDS = frozenset([
    'addAplyQlfcCndCn', 'aplyPrdSeCd', 'aplyUrlAddr', 'aplyYmd', 'bizPrdBgngYmd', 'bizPrdEndYmd',
    'bizPrdEtcCn', 'bizPrdSeCd', 'bscPlanAsmtNo', 'bscPlanCycl', 'bscPlanFcsAsmtNo',
    'bscPlanPlcyWayNo', 'earnCndSeCd', 'earnEtcCn', 'earnMaxAmt', 'earnMinAmt', 'etcMttrCn',
    'frstRegDt', 'inqCnt', 'jobCd', 'lastMdfcnDt', 'lclsfNm', 'mclsfNm', 'mrgSttsCd', 'operInstCd',
    'operInstCdNm', 'operInstPicNm', 'plcyAplyMthdCn', 'plcyAprvSttsCd', 'plcyExplnCn',
    'plcyKywdNm', 'plcyMajorCd', 'plcyNm', 'plcyNo', 'plcyPvsnMthdCd', 'plcySprtCn',
    'ptcpPrpTrgtCn', 'pvsnInstGroupCd', 'refUrlAddr1', 'refUrlAddr2', 'rgtrHghrkInstCd',
    'rgtrHghrkInstCdNm', 'rgtrInstCd', 'rgtrInstCdNm', 'rgtrUpInstCd', 'rgtrUpInstCdNm', 'sbizCd',
    'sbmsnDcmntCn', 'schoolCd', 'sprtArvlSeqYn', 'sprtSclCnt', 'sprtSclLmtYn', 'sprtTrgtAgeLmtYn',
    'sprtTrgtMaxAge', 'sprtTrgtMinAge', 'sprvsnInstCd', 'sprvsnInstCdNm', 'sprvsnInstPicNm',
    'srngMthdCn', 'zipCd',
])
# 자격조건 판정에 쓰는 필드(채움률 보고서 표시용)
CONDITION_FIELDS = frozenset([
    "sprtTrgtMinAge", "sprtTrgtMaxAge", "sprtTrgtAgeLmtYn", "zipCd",
    "earnCndSeCd", "earnMinAmt", "earnMaxAmt", "earnEtcCn",
    "schoolCd", "jobCd", "plcyMajorCd", "mrgSttsCd", "sbizCd",
    "addAplyQlfcCndCn", "ptcpPrpTrgtCn", "plcySprtCn", "etcMttrCn",
    "aplyPrdSeCd", "aplyYmd", "bizPrdBgngYmd", "bizPrdEndYmd", "bizPrdEtcCn",
    "sbmsnDcmntCn", "srngMthdCn", "plcyAplyMthdCn", "aplyUrlAddr",
])


class FetchError(Exception):
    """설정·통신·응답 오류. 메시지에는 키와 키가 든 주소를 넣지 않는다."""


# ---------------------------------------------------------------------------
# 호출과 응답 해석
# ---------------------------------------------------------------------------
def build_url(base_url: str, key: str, page: int, page_size: int) -> str:
    query = urllib.parse.urlencode(
        {"apiKeyNm": key, "pageNum": page, "pageSize": page_size, "rtnType": "json"}
    )
    return f"{base_url}?{query}"


def fetch_page(
    base_url: str,
    key: str,
    page: int,
    page_size: int,
    *,
    timeout: float = TIMEOUT_SEC,
    retries: int = RETRIES,
    sleep: Callable[[float], None] = time.sleep,
) -> str:
    """한 페이지의 응답 본문(문자열)을 돌려준다. 키는 본문에 섞여 와도 가려서 돌려준다."""
    url = build_url(base_url, key, page, page_size)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    last_problem = ""
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return env_config.scrub(r.read().decode("utf-8"), key)
        except urllib.error.HTTPError as e:
            e.close()  # 오류 응답 본문은 읽지 않는다(주소·키가 섞여 있을 수 있음)
            if e.code < 500:
                # 4xx는 다시 해도 같다: 키·파라미터·접근 차단 문제
                hint = " (키가 맞는지, 이 PC에서 접속이 막히지 않았는지 확인하세요)" if e.code in (401, 403) else ""
                raise FetchError(f"{page}페이지 요청이 거부됨: HTTP {e.code}{hint}") from None
            last_problem = f"HTTP {e.code}"
        except (urllib.error.URLError, socket.timeout, TimeoutError, ConnectionError) as e:
            reason = getattr(e, "reason", e)
            last_problem = f"연결 오류({type(reason).__name__})"
        if attempt < retries:
            sleep(2 ** (attempt - 1))
    raise FetchError(f"{page}페이지를 {retries}번 시도했지만 실패: {last_problem}")


def _as_int(value) -> int | None:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def parse_page(body: str, page: int) -> tuple[list[dict], int | None]:
    """(정책 목록, 전체 건수)를 돌려준다. 구조가 다르면 FetchError."""
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise FetchError(f"{page}페이지 응답이 JSON이 아님(앞부분: {body[:80]!r})") from None
    if not isinstance(data, dict):
        raise FetchError(f"{page}페이지 응답 형식이 다름: 최상위가 {type(data).__name__}")
    code = str(data.get("resultCode", "")).strip()
    if code != "200":
        message = str(data.get("resultMessage", ""))[:200]
        raise FetchError(f"{page}페이지 API 오류: resultCode={code or '(없음)'} {message}")
    result = data.get("result")
    if not isinstance(result, dict) or not isinstance(result.get("youthPolicyList"), list):
        keys = list(result.keys()) if isinstance(result, dict) else type(result).__name__
        raise FetchError(f"{page}페이지 응답 형식이 다름: result.youthPolicyList 없음 (result: {keys})")
    rows = result["youthPolicyList"]
    bad = [i for i, r in enumerate(rows) if not isinstance(r, dict)]
    if bad:
        raise FetchError(f"{page}페이지 응답 형식이 다름: 정책 항목이 객체가 아님({len(bad)}개)")
    paging = result.get("pagging") if isinstance(result.get("pagging"), dict) else {}
    return rows, _as_int(paging.get("totCount"))


def fetch_all(
    base_url: str,
    key: str,
    *,
    page_size: int = PAGE_SIZE,
    max_pages: int | None = None,
    sleep_sec: float = SLEEP_SEC,
    raw_dir: Path | None = None,
    log: Callable[[str], None] = print,
    sleep: Callable[[float], None] = time.sleep,
) -> tuple[list[dict], int | None, bool]:
    """(정책 목록, API가 알려 준 전체 건수, 끝까지 받았는지)를 돌려준다."""
    records: list[dict] = []
    total: int | None = None
    page = 1
    while True:
        body = fetch_page(base_url, key, page, page_size, sleep=sleep)
        if raw_dir is not None:
            raw_dir.mkdir(parents=True, exist_ok=True)
            (raw_dir / f"page_{page:03}.json").write_text(body, encoding="utf-8")
        rows, page_total = parse_page(body, page)
        if total is None:
            total = page_total
        records.extend(rows)
        log(f"{page}페이지: {len(rows)}건 (누적 {len(records)}" + (f" / 전체 {total})" if total is not None else ")"))
        complete = (total is not None and len(records) >= total) or not rows or len(rows) < page_size
        if complete:
            return records, total, True
        if max_pages is not None and page >= max_pages:
            return records, total, False
        page += 1
        sleep(sleep_sec)


# ---------------------------------------------------------------------------
# 검증과 보고서
# ---------------------------------------------------------------------------
def validate(records: list[dict], total: int | None, complete: bool) -> tuple[list[str], list[str]]:
    """(오류, 경고). 오류가 있으면 적재에 쓰면 안 된다."""
    errors: list[str] = []
    warnings: list[str] = []
    numbers = [str(r.get("plcyNo", "")).strip() for r in records]
    missing = sum(1 for n in numbers if not n)
    if missing:
        errors.append(f"plcyNo가 없는 정책 {missing}건")
    dup = sorted(n for n, c in Counter(n for n in numbers if n).items() if c > 1)
    if dup:
        errors.append(f"plcyNo 중복 {len(dup)}건 (예: {', '.join(dup[:3])})")
    if complete:
        if total is None:
            warnings.append("API가 전체 건수(totCount)를 주지 않아 건수 대조를 못 함")
        elif len(records) != total:
            errors.append(f"받은 건수 {len(records)}와 API 전체 건수 {total}가 다름")
    seen = Counter(k for r in records for k in r)
    new_fields = sorted(set(seen) - KNOWN_FIELDS)
    gone_fields = sorted(KNOWN_FIELDS - set(seen))
    if new_fields:
        warnings.append(f"처음 보는 필드 {len(new_fields)}개: {', '.join(new_fields[:8])} (형식이 바뀌었을 수 있음)")
    if gone_fields and complete:
        warnings.append(f"사라진 필드 {len(gone_fields)}개: {', '.join(gone_fields[:8])} (형식이 바뀌었을 수 있음)")
    return errors, warnings


def write_field_coverage(path: Path, records: list[dict]) -> None:
    fields = sorted({k for r in records for k in r})
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["필드", "채움", "자격조건 필드 여부"])
        for fld in fields:
            filled = sum(1 for r in records if str(r.get(fld, "")).strip() not in ("", "0", "-"))
            w.writerow([fld, f"{filled}/{len(records)}", "Y" if fld in CONDITION_FIELDS else ""])


def new_run_dir(out_root: Path, now: datetime | None = None) -> Path:
    stamp = (now or datetime.now()).strftime("%Y%m%d_%H%M")
    run = out_root / f"ythapi_{stamp}"
    n = 2
    while run.exists():
        run = out_root / f"ythapi_{stamp}_{n}"
        n += 1
    return run


# ---------------------------------------------------------------------------
# 실행
# ---------------------------------------------------------------------------
def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="온통청년 청년정책 API 수집 (키: YTH_POLICY_KEY, 환경변수 또는 .env)")
    ap.add_argument("--check-env", action="store_true", help="키·주소 설정 상태만 확인(값은 출력하지 않음)")
    ap.add_argument("--max-pages", type=int, help="이 페이지 수까지만 받기(시험용). 결과는 policies_sample.json")
    ap.add_argument("--page-size", type=int, default=PAGE_SIZE, help=f"페이지당 건수(기본 {PAGE_SIZE})")
    ap.add_argument("--sleep", type=float, default=SLEEP_SEC, help=f"페이지 사이 대기 초(기본 {SLEEP_SEC})")
    ap.add_argument("--out-dir", type=Path, default=DEFAULT_OUT, help="결과 폴더를 만들 곳(기본 data_raw/)")
    ap.add_argument("--base-url", default=BASE_URL, help=argparse.SUPPRESS)  # 테스트용 가짜 서버 주소
    args = ap.parse_args(argv)

    if args.check_env:
        for line in env_config.describe_settings():
            print(line)
        return 0

    key, source = env_config.get_setting(KEY_NAME)
    if not key:
        print(f"{KEY_NAME}가 없습니다. 환경변수로 넣거나 저장소 맨 위 .env 파일에 {KEY_NAME}=값 으로 넣어 주세요.",
              file=sys.stderr)
        return 2
    if args.max_pages is not None and args.max_pages < 1:
        print("--max-pages는 1 이상이어야 합니다.", file=sys.stderr)
        return 2

    run_dir = new_run_dir(args.out_dir)
    print(f"수집 시작 (키: {source}에서 읽음, 결과 폴더: {run_dir})")
    try:
        records, total, complete = fetch_all(
            args.base_url, key, page_size=args.page_size, max_pages=args.max_pages,
            sleep_sec=args.sleep, raw_dir=run_dir / "raw",
        )
    except FetchError as e:
        print(f"수집 실패: {env_config.scrub(str(e), key)}", file=sys.stderr)
        print(f"받은 페이지까지는 {run_dir / 'raw'}에 남아 있습니다.", file=sys.stderr)
        return 2

    errors, warnings = validate(records, total, complete)
    out_name = "policies_all.json" if complete else "policies_sample.json"
    out_file = run_dir / out_name
    out_file.write_text(json.dumps(records, ensure_ascii=False, indent=1), encoding="utf-8")
    write_field_coverage(run_dir / "field_coverage.csv", records)

    print(f"\n받은 정책 {len(records)}건" + (f" / API 전체 {total}건" if total is not None else "")
          + ("" if complete else f" (--max-pages {args.max_pages}에서 멈춤, 시험용)"))
    for w in warnings:
        print(f"경고: {w}")
    if errors:
        print("\n검증 실패 (이 파일로 적재하지 마세요):")
        for e in errors:
            print(f" - {e}")
        print(f"결과: {out_file}")
        return 1
    print("검증 통과")
    print(f"결과: {out_file}")
    if complete:
        print("\n다음 단계(적재 미리보기, 네트워크 안 씀):")
        print(f"  python pipeline/load_supabase.py --raw \"{out_file}\" --dry-run")
    return 0


if __name__ == "__main__":
    sys.exit(main())
