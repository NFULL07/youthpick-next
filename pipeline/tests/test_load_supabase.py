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
import rule_tables as rt  # noqa: E402


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
        # API 대분류가 없으면 목적묶음 기준 잠정 분야이고, 그 사실을 근거 칸에 남긴다
        by_id = {p["id"]: p for p in tables["policy"]}
        self.assertEqual((by_id["C1"]["category"], by_id["C1"]["category_basis"]), ("주거", ls.BASIS_PROVISIONAL))
        self.assertEqual((by_id["Z1"]["category"], by_id["Z1"]["category_basis"]), (None, None))
        with_api = {p["id"]: p for p in ls.build_policies(cand, {"C1": "복지문화", "D1": "알 수 없는 값"})}
        self.assertEqual((with_api["C1"]["category"], with_api["C1"]["category_basis"]), ("금융·복지·문화", ls.BASIS_API))
        self.assertEqual(with_api["D1"]["category_basis"], ls.BASIS_PROVISIONAL)
        # 실측한 API 대분류 표기(가운뎃점이 '･', 이전 표기, 여러 개)
        for value, expected in (("금융･복지･문화", "금융·복지·문화"), ("교육･직업훈련", "교육·직업훈련"), ("참여･기반", "참여·기반"),
                                ("복지문화", "금융·복지·문화"), ("참여권리", "참여·기반"), ("교육", "교육·직업훈련"),
                                ("일자리,교육", "일자리"), ("교육,일자리", "교육·직업훈련"), ("주거", "주거")):
            self.assertEqual(ls.category_from_api(value), expected, value)
        self.assertIsNone(ls.category_from_api(""))

    def test_personal_fields_carry_document_guidance(self):
        fields = {f["id"]: f for f in ls.build_personal_fields(
            ls.read_csv(ls.DATA / "personal_fields_v0_3.csv"), ls.read_csv(ls.DATA / "doc_requirements_items_v1.csv"))}
        rent = fields["monthly_rent_amount"]
        self.assertIn("임대차계약서", rent["check_documents"])
        self.assertTrue(rent["document_ids"] and all(d.startswith("D") for d in rent["document_ids"]))
        self.assertEqual({tuple(f.keys()) for f in fields.values()}, {tuple(rent.keys())})

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
        self.assertEqual(a1["apply_period_type"], "특정기간")  # 원본의 코드 대신 매칭표의 이름
        self.assertEqual((a1["api_min_age"], a1["api_max_age"]), (1, 35))
        self.assertEqual(a1["zip_codes"], ["44130", "44131", "44133", "44200"])

        bundle = [n for n in notices if n["plcy_no"] == "20260504005400113115"]
        self.assertEqual(sorted(n["policy_id"] for n in bundle), ["A2", "B2", "B3"])
        self.assertTrue(all(n["is_bundle_record"] for n in bundle))

        unconfirmed = sorted({n["policy_id"] for n in notices if n["current_year_unconfirmed"]})
        self.assertEqual(unconfirmed, ["D2", "E5", "G2"])

        self.assertTrue(by_key["C3:20261016005400113963"]["income_text_conflict"])
        self.assertEqual(sum(n["income_text_conflict"] for n in notices), 1)

    def test_api_category_reaches_policy(self):
        cand = ls.read_csv(ls.DATA / "policy_candidates_v0_1.csv")
        match = ls.read_csv(ls.DATA / "api_match_v0_1.csv")
        records = fake_raw_from_match()
        for r in records:
            if r["plcyNo"] == "20260710005400113256":  # D1
                r["lclsfNm"] = "일자리"
        raw = ls.build_raw(records, "2026-11-09")
        notices = ls.build_notices(match, cand, {r["plcy_no"]: r["payload"] for r in raw}, "2026-11-09")
        d1 = next(n for n in notices if n["policy_id"] == "D1")
        self.assertEqual(d1["api_category"], "일자리")

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


def notice_policy_map() -> dict[str, str]:
    cand = ls.read_csv(ls.DATA / "policy_candidates_v0_1.csv")
    match = ls.read_csv(ls.DATA / "api_match_v0_1.csv")
    return {n["notice_key"]: n["policy_id"] for n in ls.build_notices(match, cand, {}, None)}


def field_classes() -> dict[str, str]:
    return {r["항목ID"].strip(): r["구분"].strip() for r in ls.read_csv(ls.DATA / "personal_fields_v0_3.csv")}


C1 = "C1:20260319005400112218"
C3 = "C3:20261016005400113963"


def rule_row(**over) -> dict:
    row = {h: "" for h in rt.RULE_HEADERS}
    row.update({"공고키": C1, "규칙키": "age", "항목ID": "birth_year", "연산자": "age_between",
                "값(JSON)": '{"min": 19, "max": 34}', "화면 문구": "만 19~34세", "작성": "직접", "검수 상태": "초안"})
    row.update(over)
    return row


class RuleTableTest(unittest.TestCase):
    def test_committed_csvs_are_valid_and_drafts_only(self):
        rules, errors = rt.build_rules(rt.read_rows(ls.RULES_CSV), notice_policy_map(), field_classes())
        self.assertEqual(errors, [])
        # 저장소의 규칙 CSV에 사람이 검수하지 않은 '검수 완료'가 섞이지 않게 한다
        for r in rules:
            if r["origin"] != "manual":
                self.assertTrue(r["review_status"] != "reviewed" or (r["source_url"] and r["reviewed_by"]), r)
        relations, errors = rt.build_relationships(rt.read_rows(ls.RELATIONS_CSV), notice_policy_map())
        self.assertEqual(errors, [])

    def test_drafts_from_api_values(self):
        drafts = rt.draft_rules_from_match(ls.read_csv(ls.DATA / "api_match_v0_1.csv"))
        self.assertEqual(len(drafts), 28)
        self.assertEqual({d["검수 상태"] for d in drafts}, {"초안"})
        self.assertEqual({d["작성"] for d in drafts}, {"API 초안"})
        a1 = next(d for d in drafts if d["공고키"] == "A1:20250616005400110939" and d["규칙키"] == "age")
        self.assertEqual(a1["값(JSON)"], '{"max": 35}')  # 최소 1세는 조건이 아니므로 뺀다
        # '기타'·'제한없음'이 섞인 코드는 표현할 수 없어 초안을 만들지 않는다
        self.assertIsNone(rt._mapped_codes("고교 재학, 대학 재학, 기타", rt.SCHOOL_TO_ENROLLMENT))

    def test_reviewed_rule_needs_evidence(self):
        ok = rule_row(**{"검수 상태": "검수 완료", "근거 URL": "https://example.org/notice",
                         "근거 원문 인용": "만 19세 이상 34세 이하", "검수자": "김주완", "검수일": "2026-11-18"})
        rules, errors = rt.build_rules([ok], notice_policy_map(), field_classes())
        self.assertEqual(errors, [])
        self.assertEqual(rules[0]["review_status"], "reviewed")
        self.assertEqual(rules[0]["reviewed_at"], "2026-11-18T00:00:00+09:00")
        self.assertEqual(rules[0]["value"], {"min": 19, "max": 34})

        for missing in ("근거 URL", "근거 원문 인용", "검수자", "검수일"):
            _, errors = rt.build_rules([dict(ok, **{missing: ""})], notice_policy_map(), field_classes())
            self.assertTrue(any(missing in e for e in errors), missing)

    def test_rule_errors(self):
        cases = {
            "공고키가 공고 목록에 없음": rule_row(**{"공고키": "C1:없는공고"}),
            "개인화 항목 목록에 없음": rule_row(**{"항목ID": "no_such_field"}),
            "수집 제외": rule_row(**{"항목ID": "resident_registration_number", "연산자": "eq", "값(JSON)": '"x"'}),
            "보류": rule_row(**{"항목ID": "major_field", "연산자": "eq", "값(JSON)": '"x"'}),
            "알 수 없음": rule_row(**{"연산자": "about"}),
            "맞지 않는 값 모양": rule_row(**{"연산자": "between", "값(JSON)": "19"}),
            "JSON을 읽을 수 없음": rule_row(**{"값(JSON)": "{min:19}"}),
            "region 표에 없는 지역 코드": rule_row(**{"항목ID": "registered_city_code", "연산자": "region_in", "값(JSON)": '["11110"]'}),
            "쓸 수 없음": rule_row(**{"항목ID": "enrollment_status", "연산자": "in", "값(JSON)": '["대학 재학"]'}),
            "검수 상태는": rule_row(**{"검수 상태": "완료"}),
            "화면 문구가 비어": rule_row(**{"화면 문구": ""}),
        }
        for expected, row in cases.items():
            _, errors = rt.build_rules([row], notice_policy_map(), field_classes())
            self.assertTrue(any(expected in e for e in errors), f"{expected}: {errors}")
        _, errors = rt.build_rules([rule_row(), rule_row()], notice_policy_map(), field_classes())
        self.assertTrue(any("두 번" in e for e in errors))

    def test_relationship_rules(self):
        base = {h: "" for h in rt.RELATION_HEADERS}
        base.update({"공고키 A": C3, "공고키 B": C1, "관계": "병행 가능", "검수 상태": "검수 완료",
                     "검수자": "김주완", "검수일": "2026-11-18"})
        _, errors = rt.build_relationships([base], notice_policy_map())
        self.assertTrue(any("근거 원문 인용" in e for e in errors))  # 근거 없는 병행 가능은 검수 완료 불가
        ok = dict(base, **{"근거 URL": "https://example.org/n", "근거 원문 인용": "중복 지원 가능"})
        rows, errors = rt.build_relationships([ok], notice_policy_map())
        self.assertEqual(errors, [])
        check = dict(base, **{"관계": "추가 확인", "조건·확인할 내용": "동시 수혜 가능 여부 공고 확인"})
        _, errors = rt.build_relationships([check], notice_policy_map())
        self.assertEqual(errors, [])
        _, errors = rt.build_relationships([dict(base, **{"관계": "조건부 병행", "검수 상태": "초안"})], notice_policy_map())
        self.assertTrue(any("조건이 있어야" in e for e in errors))
        self.assertEqual(ls.ordered_pair("병행 제한", 9, 3), (3, 9))
        self.assertEqual(ls.ordered_pair("선행조건", 9, 3), (9, 3))

    def test_sql_output_for_rule_tables(self):
        rules, _ = rt.build_rules([rule_row(**{"근거 URL": "https://example.org/n"}),
                                   rule_row(**{"규칙키": "no_house", "항목ID": "homeownership_status",
                                               "연산자": "is_true", "값(JSON)": "", "화면 문구": "무주택"})],
                                  notice_policy_map(), field_classes())
        sql = ls.rule_tables_sql(rules, [], [], prune=True)
        self.assertIn("(select id from public.policy_notice where notice_key = 'C1:20260319005400112218')", sql)
        self.assertIn("'{\"min\": 19, \"max\": 34}'::jsonb", sql)
        self.assertIn("on conflict (notice_id,rule_key) do update", sql)
        self.assertIn("delete from public.eligibility_rule", sql)
        extra = rt.extra_sources(rules, [], [], set())
        self.assertEqual([(s["policy_id"], s["url"]) for s in extra], [("C1", "https://example.org/n")])


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


    def test_rule_tables_use_ids_and_prune_only_when_asked(self):
        calls = []
        existing = {
            "policy_notice": [{"id": 7, "notice_key": C1}, {"id": 3, "notice_key": C3}],
            "source_document": [{"id": 50, "policy_id": "C1", "url": "https://example.org/n"}],
            "eligibility_rule": [{"id": 1, "notice_id": 7, "rule_key": "age"}, {"id": 2, "notice_id": 7, "rule_key": "old"}],
            "policy_relationship": [],
            "document_requirement": [],
        }

        class Handler(BaseHTTPRequestHandler):
            def _reply(self, status, body=None):
                data = json.dumps(body).encode() if body is not None else b""
                self.send_response(status)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def do_GET(self):
                table = self.path.split("?")[0].rsplit("/", 1)[1]
                calls.append(("GET", self.path, None))
                self._reply(200, existing[table])

            def do_POST(self):
                body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                calls.append(("POST", self.path, body))
                self._reply(201)

            def do_DELETE(self):
                calls.append(("DELETE", self.path, None))
                self._reply(204)

            def log_message(self, *a):
                pass

        rules, errors = rt.build_rules([rule_row(**{"근거 URL": "https://example.org/n"})], notice_policy_map(), field_classes())
        self.assertEqual(errors, [])
        relation = {h: "" for h in rt.RELATION_HEADERS}
        relation.update({"공고키 A": C1, "공고키 B": C3, "관계": "병행 제한", "근거 원문 인용": "유사 사업 지원 중이면 불가"})
        relations, errors = rt.build_relationships([relation], notice_policy_map())
        self.assertEqual(errors, [])

        for prune in (False, True):
            calls.clear()
            server = HTTPServer(("127.0.0.1", 0), Handler)
            threading.Thread(target=server.serve_forever, daemon=True).start()
            try:
                with redirect_stdout(io.StringIO()) as out:
                    ls.load_rule_tables(f"http://127.0.0.1:{server.server_port}", "test-secret", rules, relations, [], prune)
            finally:
                server.shutdown()
                server.server_close()
            posts = {p.split("?")[0].rsplit("/", 1)[1]: b for m, p, b in calls if m == "POST"}
            self.assertEqual(posts["eligibility_rule"][0]["notice_id"], 7)
            self.assertEqual(posts["eligibility_rule"][0]["source_document_id"], 50)
            self.assertEqual(posts["eligibility_rule"][0]["value"], {"min": 19, "max": 34})
            # 방향 없는 관계는 작은 공고 id가 a
            self.assertEqual((posts["policy_relationship"][0]["notice_a_id"], posts["policy_relationship"][0]["notice_b_id"]), (3, 7))
            deletes = [p for m, p, _ in calls if m == "DELETE"]
            if prune:
                self.assertEqual(deletes, ["/rest/v1/eligibility_rule?id=in.(2)"])
            else:
                self.assertEqual(deletes, [])
                self.assertIn("1건 (지우려면 --prune)", out.getvalue())


if __name__ == "__main__":
    unittest.main()
