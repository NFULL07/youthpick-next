# -*- coding: utf-8 -*-
"""fetch_policies.py / env_config.py 테스트. 실제 온통청년 API는 부르지 않고 127.0.0.1 가짜 서버를 쓴다.

실행 (저장소 맨 위에서): python -m unittest discover -s pipeline/tests
"""
from __future__ import annotations

import contextlib
import io
import json
import os
import sys
import tempfile
import threading
import unittest
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import env_config  # noqa: E402
import fetch_policies as fp  # noqa: E402

KEY = "test-secret-key-7f3a"


def make_policy(n: int) -> dict:
    """KNOWN_FIELDS를 모두 가진 가짜 정책 한 건."""
    row = {f: "" for f in fp.KNOWN_FIELDS}
    row.update({"plcyNo": f"2026{n:06}", "plcyNm": f"가짜 정책 {n}", "zipCd": "44130"})
    return row


class FakeApi:
    """pageNum에 맞는 페이지를 돌려주는 가짜 온통청년 API."""

    def __init__(self, total: int, *, tot_as_str: bool = False, echo_key: bool = False):
        self.records = [make_policy(i) for i in range(1, total + 1)]
        self.tot_as_str = tot_as_str
        self.echo_key = echo_key
        self.fail_status: list[int] = []      # 앞에서부터 하나씩 꺼내 이 HTTP 상태로 응답
        self.result_code = "200"
        self.page_cap = 0              # 서버가 페이지 크기를 이 수로 줄임(0이면 요청대로)
        self.ignore_page = False       # pageNum을 무시하고 늘 1페이지를 돌려줌
        self.no_total = False          # 전체 건수(pagging)를 주지 않음
        self.raw_body: bytes | None = None  # JSON 대신 이 본문을 200으로 돌려줌(안내 페이지 흉내)
        self.requests: list[dict] = []
        api = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *a):  # 테스트 출력에 접속 기록을 남기지 않음
                pass

            def do_GET(self):
                q = dict(urllib.parse.parse_qsl(urllib.parse.urlparse(self.path).query))
                api.requests.append(q)
                if api.fail_status:
                    self.send_response(api.fail_status.pop(0))
                    self.end_headers()
                    self.wfile.write(f"error for {self.path}".encode())  # 주소(키 포함)를 본문에 섞어 봄
                    return
                if q.get("apiKeyNm") != KEY:
                    self.send_response(401)
                    self.end_headers()
                    return
                if api.raw_body is not None:
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html")
                    self.end_headers()
                    self.wfile.write(api.raw_body)
                    return
                page, size = int(q["pageNum"]), int(q["pageSize"])
                if api.page_cap:
                    size = min(size, api.page_cap)
                if api.ignore_page:
                    page = 1
                rows = api.records[(page - 1) * size: page * size]
                total = len(api.records)
                result = {"youthPolicyList": rows}
                if not api.no_total:
                    result["pagging"] = {"totCount": str(total) if api.tot_as_str else total,
                                         "pageNum": page, "pageSize": size}
                body = {
                    "resultCode": api.result_code,
                    "resultMessage": f"요청 키 {q['apiKeyNm']}" if api.echo_key else "정상",
                    "result": result,
                }
                data = json.dumps(body, ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

        self.server = HTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server.server_port}/go/ythip/getPlcy"
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown()
        self.server.server_close()


class FetchTestBase(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        # 실제 .env가 있어도 테스트가 읽지 않게 가짜 경로로 돌린다
        self.env_patch = mock.patch.object(env_config, "ENV_FILE", self.tmp / "no.env")
        self.env_patch.start()
        self.sleep_patch = mock.patch.object(fp.time, "sleep", lambda s: None)
        self.sleep_patch.start()

    def tearDown(self):
        self.sleep_patch.stop()
        self.env_patch.stop()
        import shutil
        shutil.rmtree(self.tmp, ignore_errors=True)

    def run_main(self, args, env=None):
        out, err = io.StringIO(), io.StringIO()
        env = {"YTH_POLICY_KEY": KEY} if env is None else env
        with mock.patch.dict(os.environ, env, clear=False), \
                contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            if "YTH_POLICY_KEY" not in env:
                os.environ.pop("YTH_POLICY_KEY", None)
            code = fp.main(args)
        return code, out.getvalue(), err.getvalue()

    def run_dirs(self):
        return sorted(p for p in (self.tmp / "out").glob("ythapi_*") if p.is_dir())

    def all_written_text(self) -> str:
        return "".join(p.read_text(encoding="utf-8-sig") for p in self.tmp.rglob("*") if p.is_file())


class FetchAllTest(FetchTestBase):
    def test_pages_until_total_and_writes_outputs(self):
        api = FakeApi(250)
        self.addCleanup(api.close)
        code, out, _ = self.run_main(["--base-url", api.url, "--out-dir", str(self.tmp / "out"), "--sleep", "0"])
        self.assertEqual(code, 0, out)
        self.assertEqual([r["pageNum"] for r in api.requests], ["1", "2", "3"])
        self.assertTrue(all(r["pageSize"] == "100" and r["rtnType"] == "json" for r in api.requests))
        (run,) = self.run_dirs()
        records = json.loads((run / "policies_all.json").read_text(encoding="utf-8"))
        self.assertEqual(len(records), 250)
        self.assertEqual(records[0]["plcyNo"], "2026000001")
        self.assertEqual(sorted(p.name for p in (run / "raw").iterdir()),
                         ["page_001.json", "page_002.json", "page_003.json"])
        self.assertTrue((run / "field_coverage.csv").exists())
        self.assertIn("검증 통과", out)
        self.assertIn("load_supabase.py --raw", out)

    def test_total_count_as_string(self):
        api = FakeApi(120, tot_as_str=True)
        self.addCleanup(api.close)
        code, out, _ = self.run_main(["--base-url", api.url, "--out-dir", str(self.tmp / "out"), "--sleep", "0"])
        self.assertEqual(code, 0, out)
        self.assertIn("API 전체 120건", out)

    def test_exact_multiple_of_page_size_stops_without_empty_page(self):
        api = FakeApi(200)
        self.addCleanup(api.close)
        code, _, _ = self.run_main(["--base-url", api.url, "--out-dir", str(self.tmp / "out"), "--sleep", "0"])
        self.assertEqual(code, 0)
        self.assertEqual(len(api.requests), 2)

    def test_server_smaller_page_size_still_collects_all(self):
        api = FakeApi(120)
        api.page_cap = 50
        self.addCleanup(api.close)
        code, out, _ = self.run_main(["--base-url", api.url, "--out-dir", str(self.tmp / "out"), "--sleep", "0"])
        self.assertEqual(code, 0, out)
        self.assertEqual(len(api.requests), 3)
        (run,) = self.run_dirs()
        self.assertEqual(len(json.loads((run / "policies_all.json").read_text(encoding="utf-8"))), 120)

    def test_without_total_stops_on_short_page_and_warns(self):
        api = FakeApi(150)
        api.no_total = True
        self.addCleanup(api.close)
        code, out, _ = self.run_main(["--base-url", api.url, "--out-dir", str(self.tmp / "out"), "--sleep", "0"])
        self.assertEqual(code, 0, out)
        self.assertEqual(len(api.requests), 2)
        self.assertIn("건수 대조를 못 함", out)

    def test_max_pages_writes_sample_not_all(self):
        api = FakeApi(250)
        self.addCleanup(api.close)
        code, out, _ = self.run_main(["--base-url", api.url, "--out-dir", str(self.tmp / "out"),
                                      "--sleep", "0", "--max-pages", "1"])
        self.assertEqual(code, 0, out)
        (run,) = self.run_dirs()
        self.assertTrue((run / "policies_sample.json").exists())
        self.assertFalse((run / "policies_all.json").exists())
        self.assertEqual(len(api.requests), 1)
        self.assertNotIn("load_supabase.py --raw", out)  # 일부만 받은 파일로 적재 안내를 하지 않음

    def test_second_run_makes_new_folder(self):
        api = FakeApi(10)
        self.addCleanup(api.close)
        args = ["--base-url", api.url, "--out-dir", str(self.tmp / "out"), "--sleep", "0"]
        self.assertEqual(self.run_main(args)[0], 0)
        self.assertEqual(self.run_main(args)[0], 0)
        self.assertEqual(len(self.run_dirs()), 2)


class FetchErrorTest(FetchTestBase):
    def test_retries_on_server_error_then_succeeds(self):
        api = FakeApi(5)
        self.addCleanup(api.close)
        api.fail_status = [500, 503]
        body = fp.fetch_page(api.url, KEY, 1, 100, sleep=lambda s: None)
        self.assertEqual(len(json.loads(body)["result"]["youthPolicyList"]), 5)
        self.assertEqual(len(api.requests), 3)

    def test_gives_up_after_retries(self):
        api = FakeApi(5)
        self.addCleanup(api.close)
        api.fail_status = [500, 500, 500]
        with self.assertRaises(fp.FetchError) as cm:
            fp.fetch_page(api.url, KEY, 1, 100, sleep=lambda s: None)
        self.assertIn("3번", str(cm.exception))
        self.assertNotIn(KEY, str(cm.exception))

    def test_client_error_is_not_retried(self):
        api = FakeApi(5)
        self.addCleanup(api.close)
        api.fail_status = [403]
        code, out, err = self.run_main(["--base-url", api.url, "--out-dir", str(self.tmp / "out"), "--sleep", "0"])
        self.assertEqual(code, 2)
        self.assertEqual(len(api.requests), 1)
        self.assertIn("HTTP 403", err)
        self.assertNotIn(KEY, out + err)
        self.assertNotIn("apiKeyNm", out + err)

    def test_wrong_key_is_rejected(self):
        api = FakeApi(5)
        self.addCleanup(api.close)
        code, out, err = self.run_main(["--base-url", api.url, "--out-dir", str(self.tmp / "out")],
                                       env={"YTH_POLICY_KEY": "wrong-key-0000"})
        self.assertEqual(code, 2)
        self.assertIn("HTTP 401", err)
        self.assertNotIn("wrong-key-0000", out + err)

    def test_api_result_code_error(self):
        api = FakeApi(5)
        self.addCleanup(api.close)
        api.result_code = "403"
        code, _, err = self.run_main(["--base-url", api.url, "--out-dir", str(self.tmp / "out")])
        self.assertEqual(code, 2)
        self.assertIn("resultCode=403", err)

    def test_repeated_page_stops_instead_of_looping(self):
        api = FakeApi(300)
        api.ignore_page = True
        api.no_total = True
        self.addCleanup(api.close)
        code, _, err = self.run_main(["--base-url", api.url, "--out-dir", str(self.tmp / "out"), "--sleep", "0"])
        self.assertEqual(code, 2)
        self.assertEqual(len(api.requests), 2)
        self.assertIn("pageNum", err)

    def test_non_utf8_notice_page_is_reported_cleanly(self):
        api = FakeApi(5)
        api.raw_body = "<html><body>시스템 점검 중입니다</body></html>".encode("euc-kr")
        self.addCleanup(api.close)
        code, _, err = self.run_main(["--base-url", api.url, "--out-dir", str(self.tmp / "out")])
        self.assertEqual(code, 2)
        self.assertIn("UTF-8이 아님", err)
        self.assertNotIn("Traceback", err)

    def test_html_notice_page_is_reported_cleanly(self):
        api = FakeApi(5)
        api.raw_body = b"<html><body>Access Denied</body></html>"
        self.addCleanup(api.close)
        code, _, err = self.run_main(["--base-url", api.url, "--out-dir", str(self.tmp / "out")])
        self.assertEqual(code, 2)
        self.assertIn("JSON이 아님", err)

    def test_missing_key(self):
        code, out, err = self.run_main(["--out-dir", str(self.tmp / "out")], env={})
        self.assertEqual(code, 2)
        self.assertIn("YTH_POLICY_KEY가 없습니다", err)
        self.assertFalse((self.tmp / "out").exists())

    def test_parse_rejects_unexpected_shape(self):
        for body in ['[]', '{"resultCode":"200","result":{}}', 'not json',
                     '{"resultCode":"200","result":{"youthPolicyList":[1,2]}}']:
            with self.subTest(body=body), self.assertRaises(fp.FetchError):
                fp.parse_page(body, 1)


class KeyNeverLeaksTest(FetchTestBase):
    def test_key_not_in_files_or_output_even_if_api_echoes_it(self):
        api = FakeApi(150, echo_key=True)
        self.addCleanup(api.close)
        code, out, err = self.run_main(["--base-url", api.url, "--out-dir", str(self.tmp / "out"), "--sleep", "0"])
        self.assertEqual(code, 0, out + err)
        self.assertNotIn(KEY, out + err)
        written = self.all_written_text()
        self.assertIn("요청 키 ***", written)  # 원본 페이지는 남기되 키만 가림
        self.assertNotIn(KEY, written)

    def test_check_env_shows_state_not_values(self):
        env = {"YTH_POLICY_KEY": KEY, "SUPABASE_URL": "https://example.supabase.co",
               "SUPABASE_SERVICE_ROLE_KEY": "service-role-secret-9"}
        code, out, err = self.run_main(["--check-env"], env=env)
        self.assertEqual(code, 0)
        self.assertEqual(out.count("설정됨 (환경변수)"), 3)
        for value in env.values():
            self.assertNotIn(value, out + err)


class ValidateTest(unittest.TestCase):
    def test_duplicate_and_missing_plcy_no(self):
        rows = [make_policy(1), make_policy(1), {**make_policy(2), "plcyNo": ""}]
        errors, _ = fp.validate(rows, 3, True)
        self.assertTrue(any("중복" in e for e in errors))
        self.assertTrue(any("plcyNo가 없는" in e for e in errors))

    def test_count_mismatch_only_when_complete(self):
        rows = [make_policy(1), make_policy(2)]
        self.assertTrue(any("다름" in e for e in fp.validate(rows, 3, True)[0]))
        self.assertEqual(fp.validate(rows, 300, False)[0], [])

    def test_field_change_warnings(self):
        row = make_policy(1)
        row["newField"] = "x"
        del row["zipCd"]
        _, warnings = fp.validate([row], 1, True)
        self.assertTrue(any("처음 보는 필드" in w and "newField" in w for w in warnings))
        self.assertTrue(any("사라진 필드" in w and "zipCd" in w for w in warnings))

    def test_validation_failure_exits_1_and_keeps_file(self):
        rows = [make_policy(1), make_policy(1)]
        body = json.dumps({"resultCode": "200", "result": {"pagging": {"totCount": 2}, "youthPolicyList": rows}})
        with tempfile.TemporaryDirectory() as d, \
                mock.patch.object(env_config, "ENV_FILE", Path(d) / "no.env"), \
                mock.patch.dict(os.environ, {"YTH_POLICY_KEY": KEY}), \
                mock.patch.object(fp, "fetch_page", lambda *a, **k: body), \
                contextlib.redirect_stdout(io.StringIO()) as out:
            code = fp.main(["--out-dir", d, "--sleep", "0"])
            files = list(Path(d).glob("ythapi_*/policies_all.json"))
        self.assertEqual(code, 1)
        self.assertEqual(len(files), 1)
        self.assertIn("검증 실패", out.getvalue())


class EnvConfigTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.env_file = self.tmp / ".env"
        self.env_file.write_text(
            "# 주석\n\nexport YTH_POLICY_KEY=\"from-dotenv-1\"\nSUPABASE_URL='https://x.supabase.co'\n"
            "SUPABASE_SERVICE_ROLE_KEY=\nBROKEN LINE\n",
            encoding="utf-8",
        )

    def tearDown(self):
        import shutil
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_reads_dotenv_with_export_and_quotes(self):
        values = env_config.read_env_file(self.env_file)
        self.assertEqual(values["YTH_POLICY_KEY"], "from-dotenv-1")
        self.assertEqual(values["SUPABASE_URL"], "https://x.supabase.co")
        self.assertEqual(values["SUPABASE_SERVICE_ROLE_KEY"], "")
        self.assertNotIn("BROKEN LINE", values)

    def test_environment_variable_wins_over_dotenv(self):
        with mock.patch.dict(os.environ, {"YTH_POLICY_KEY": "from-env-2"}):
            self.assertEqual(env_config.get_setting("YTH_POLICY_KEY", self.env_file), ("from-env-2", "환경변수"))
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("YTH_POLICY_KEY", None)
            self.assertEqual(env_config.get_setting("YTH_POLICY_KEY", self.env_file), ("from-dotenv-1", ".env"))

    def test_empty_value_counts_as_missing(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("SUPABASE_SERVICE_ROLE_KEY", None)
            self.assertEqual(env_config.get_setting("SUPABASE_SERVICE_ROLE_KEY", self.env_file), ("", ""))

    def test_describe_settings_has_no_values(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            for name in env_config.PIPELINE_SETTINGS:
                os.environ.pop(name, None)
            text = "\n".join(env_config.describe_settings(self.env_file))
        self.assertIn("YTH_POLICY_KEY: 설정됨 (.env)", text)
        self.assertIn("SUPABASE_SERVICE_ROLE_KEY: 없음", text)
        self.assertNotIn("from-dotenv-1", text)
        self.assertNotIn("x.supabase.co", text)

    def test_scrub(self):
        self.assertEqual(env_config.scrub("a abcd1234 b", "abcd1234"), "a *** b")
        self.assertEqual(env_config.scrub("abc", ""), "abc")
        # 주소에 실려 %XX로 바뀐 모양도 가린다
        self.assertEqual(env_config.scrub("?apiKeyNm=ab%2Bcd%3D%3D&x=1", "ab+cd=="), "?apiKeyNm=***&x=1")

    def test_reads_utf16_dotenv_made_by_powershell_redirect(self):
        self.env_file.write_bytes("YTH_POLICY_KEY=from-utf16-3\r\n".encode("utf-16"))
        self.assertEqual(env_config.read_env_file(self.env_file)["YTH_POLICY_KEY"], "from-utf16-3")

    def test_reads_dotenv_with_non_utf8_comment(self):
        self.env_file.write_bytes("# 한글 주석\nYTH_POLICY_KEY=from-cp949-4\n".encode("cp949"))
        self.assertEqual(env_config.read_env_file(self.env_file)["YTH_POLICY_KEY"], "from-cp949-4")


if __name__ == "__main__":
    unittest.main()
