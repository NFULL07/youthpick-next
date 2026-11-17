# -*- coding: utf-8 -*-
"""load_supabase.py 테스트. 실행: python -m unittest discover -s pipeline/tests -v

API 원본(policies_all.json)은 Git에 없으므로, 테스트용 원본 레코드는 매칭표(api_match_v0_1.csv)에
적힌 plcyNo·정책명·신청기간·연령으로 만든다. 코드값(소득 등)은 테스트 목적의 값이다.
"""
import io
import json
import re
import sys
import threading
import unittest
from contextlib import redirect_stdout
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import load_supabase as ls  # noqa: E402


def fake_raw_from_match() -> list[dict]:
    rows = ls.read_csv(ls.DATA / "api_match_v0_1.csv")
    seen = {}
    for m in rows:
        no = m["API plcyNo"].strip()
        if not no or no in seen:
            continue
        ages = re.findall(r"\d+", m["연령(API)"])
        seen[no] = {
            "plcyNo": no,
            "plcyNm": m["API 정책명"].strip(),
            "aplyYmd": m["API 신청기간"].strip(),
            "sprtTrgtMinAge": ages[0] if ages else "0",
            "sprtTrgtMaxAge": ages[1] if len(ages) > 1 else "0",
            "zipCd": "44130,44131,44133,44200",
            "earnCndSeCd": "0043002",
            "_region": "천안,아산",  # 수집 스크립트가 붙이는 값. 적재 때 빠져야 함
        }
    # C3: 소득 코드 무관 + 소득 문구 -> 충돌 표시 대상
    seen["20261016005400113963"].update(earnCndSeCd="0043001", earnEtcCn="기준 중위소득 150% 이하")
    return list(seen.values())


class BuildTest(unittest.TestCase):
    def test_csv_only_counts_and_validation(self):
        cand = ls.read_csv(ls.DATA / "policy_candidates_v0_1.csv")
        match = ls.read_csv(ls.DATA / "api_match_v0_1.csv")
        tables = {
            "personal_field": ls.build_personal_fields(ls.read_csv(ls.DATA / "personal_fields_v0_3.csv")),
            "document_catalog": ls.build_document_catalog(ls.read_csv(ls.DATA / "doc_requirements_docs_v1.csv")),
            "policy": ls.build_policies(cand),
            "policy_notice": ls.build_notices(match, cand, {}, None),
        }
        self.assertEqual(len(tables["personal_field"]), 69)
        self.assertEqual(len(tables["document_catalog"]), 39)
        self.assertEqual(sum(d["wallet_external"] for d in tables["document_catalog"]), 14)
        self.assertEqual(len(tables["policy"]), 41)
        self.assertEqual(len(tables["policy_notice"]), 33)
        counts = ls.check_match_counts(match)
        self.assertEqual(dict(counts), {"개별 매칭": 18, "묶음 레코드": 3, "API에 없음": 7})
        self.assertEqual(ls.validate(tables, counts), [])
        manual = [n for n in tables["policy_notice"] if n["source_kind"] == "manual"]
        self.assertEqual(sorted(n["policy_id"] for n in manual), ["A4", "B4", "B5", "E1", "E2", "E3", "H1"])
        self.assertTrue(all(n["plcy_no"] is None and n["notice_key"].endswith(":manual") for n in manual))
        # 모든 공고 행이 같은 칸을 가져야 REST 일괄 입력이 된다
        self.assertEqual({tuple(n.keys()) for n in tables["policy_notice"]}, {tuple(ls.NOTICE_COLUMNS)})
        # 정책 분야는 임의로 채우지 않는다
        self.assertTrue(all(p["category"] is None for p in tables["policy"]))

    def test_notices_with_raw(self):
        cand = ls.read_csv(ls.DATA / "policy_candidates_v0_1.csv")
        match = ls.read_csv(ls.DATA / "api_match_v0_1.csv")
        raw = ls.build_raw(fake_raw_from_match(), "2026-11-09")
        self.assertTrue(all("_region" not in r["payload"] for r in raw))
        notices = ls.build_notices(match, cand, {r["plcy_no"]: r["payload"] for r in raw}, "2026-11-09")
        by_key = {n["notice_key"]: n for n in notices}

        a1 = by_key["A1:20250616005400110939"]
        self.assertEqual((a1["apply_start"], a1["apply_end"]), ("2026-07-01", "2026-11-17"))
        self.assertEqual(a1["notice_year"], 2026)
        self.assertEqual((a1["api_min_age"], a1["api_max_age"]), (1, 35))
        self.assertEqual(a1["zip_codes"], ["44130", "44131", "44133", "44200"])

        bundle = [n for n in notices if n["plcy_no"] == "20260504005400113115"]
        self.assertEqual(sorted(n["policy_id"] for n in bundle), ["A2", "B2", "B3"])
        self.assertTrue(all(n["is_bundle_record"] for n in bundle))

        unconfirmed = sorted({n["policy_id"] for n in notices if n["current_year_unconfirmed"]})
        self.assertEqual(unconfirmed, ["D2", "E5", "G2"])

        self.assertTrue(by_key["C3:20261016005400113963"]["income_text_conflict"])
        self.assertEqual(sum(n["income_text_conflict"] for n in notices), 1)

    def test_small_helpers(self):
        self.assertEqual(ls.parse_period("20260701 ~ 20261117"), ("2026-07-01", "2026-11-17"))
        self.assertEqual(ls.parse_period(""), (None, None))
        self.assertEqual(ls.parse_period("20260231 ~ 20260301"), ("2026-03-01", "2026-03-01"))
        self.assertEqual(ls.split_codes("44130, 44131,,"), ["44130", "44131"])
        self.assertIsNone(ls.to_int(""))
        self.assertEqual(ls.to_int("0"), 0)
        self.assertEqual(ls.collected_on_from(Path("x/ythapi_20261109_2115/policies_all.json"), None), "2026-11-09")
        self.assertEqual(ls.sql_literal("it's"), "'it''s'")
        self.assertEqual(ls.sql_literal([]), "'{}'::text[]")


class RestTest(unittest.TestCase):
    """가짜 서버로 REST 요청 형식만 확인한다(실제 Supabase에 접속하지 않음)."""

    def test_upsert_request_and_batches(self):
        seen = []

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                body = self.rfile.read(int(self.headers["Content-Length"]))
                seen.append((self.path, dict(self.headers), json.loads(body)))
                self.send_response(201)
                self.end_headers()

            def log_message(self, *a):
                pass

        server = HTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            rows = [{"plcy_no": f"{i:020d}", "payload": {}} for i in range(ls.BATCH + 3)]
            out = io.StringIO()
            with redirect_stdout(out):
                ls.post_rows(f"http://127.0.0.1:{server.server_port}", "test-secret", "api_policy_raw", rows, "plcy_no")
        finally:
            server.shutdown()
            server.server_close()
        self.assertEqual([len(b) for _, _, b in seen], [ls.BATCH, 3])
        path, headers, _ = seen[0]
        self.assertEqual(path, "/rest/v1/api_policy_raw?on_conflict=plcy_no")
        self.assertIn("resolution=merge-duplicates", headers["Prefer"])
        self.assertEqual(headers["Authorization"], "Bearer test-secret")
        self.assertNotIn("test-secret", out.getvalue())  # 키는 출력하지 않는다


if __name__ == "__main__":
    unittest.main()
