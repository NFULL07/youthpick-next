# -*- coding: utf-8 -*-
"""파이프라인 스크립트가 쓰는 비밀값(키·주소) 읽기.

순서: 환경변수가 먼저, 없으면 저장소 맨 위 .env 파일. .env는 .gitignore로 Git에서 빠진다.
값은 화면·파일·오류 메시지에 남기지 않는다. 이 모듈은 값을 돌려줄 뿐 출력하지 않는다.
"""
from __future__ import annotations

import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env"

# 파이프라인이 쓰는 이름. 화면용 값(VITE_*)은 web/.env.local에 따로 둔다.
PIPELINE_SETTINGS = {
    "YTH_POLICY_KEY": "온통청년 API 키 (fetch_policies.py)",
    "SUPABASE_URL": "Supabase 프로젝트 주소 (load_supabase.py)",
    "SUPABASE_SERVICE_ROLE_KEY": "Supabase 관리자 키 (load_supabase.py 전용, 화면에 넣지 않음)",
}


def read_env_file(path: Path | None = None) -> dict[str, str]:
    """KEY=VALUE 줄만 읽는다. 빈 줄, # 주석, 앞의 'export ', 값을 감싼 따옴표를 처리한다."""
    path = path or ENV_FILE
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.startswith("export "):
            line = line[len("export "):]
        name, value = line.split("=", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[name.strip()] = value
    return values


def get_setting(name: str, env_file: Path | None = None) -> tuple[str, str]:
    """(값, 출처)를 돌려준다. 출처는 '환경변수', '.env', 또는 없으면 ''."""
    value = os.environ.get(name, "").strip()
    if value:
        return value, "환경변수"
    value = read_env_file(env_file).get(name, "").strip()
    if value:
        return value, ".env"
    return "", ""


def env_file_ignored_by_git(env_file: Path | None = None) -> bool | None:
    """.env가 Git에서 빠지는지 확인한다. git이 없거나 저장소가 아니면 None."""
    env_file = env_file or ENV_FILE
    try:
        r = subprocess.run(
            ["git", "check-ignore", "-q", str(env_file)],
            cwd=ROOT, capture_output=True, timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if r.returncode == 0:
        return True
    if r.returncode == 1:
        return False
    return None


def describe_settings(env_file: Path | None = None) -> list[str]:
    """설정 상태를 사람이 읽는 줄로 돌려준다. 값은 절대 포함하지 않는다."""
    env_file = env_file or ENV_FILE
    lines = []
    for name, label in PIPELINE_SETTINGS.items():
        _, source = get_setting(name, env_file)
        state = f"설정됨 ({source})" if source else "없음"
        lines.append(f"{name}: {state} - {label}")
    if env_file.exists():
        ignored = env_file_ignored_by_git(env_file)
        if ignored is True:
            lines.append(f".env: {env_file} (Git 제외 확인)")
        elif ignored is False:
            lines.append(f".env: {env_file} (주의: Git에서 빠지지 않습니다. .gitignore를 확인하세요)")
        else:
            lines.append(f".env: {env_file} (Git 제외 여부 확인 못 함)")
    else:
        lines.append(f".env: 없음 ({env_file}). 환경변수로 넣거나 .env.example을 복사해 만드세요")
    return lines


def scrub(text: str, *secrets: str) -> str:
    """텍스트에 비밀값이 섞여 있으면 *** 로 가린다(응답·오류 메시지 저장 전에 쓴다)."""
    for secret in secrets:
        if secret and len(secret) >= 4:
            text = text.replace(secret, "***")
    return text
