#!/usr/bin/env python3
"""Validate bundled Claude skills and regenerate this extension's VSIX.

Run: python sync_skills.py

The required_skills.json file is the source of truth. Every entry must have a
matching bundled_skills/<name>/SKILL.md before the VSIX is rebuilt.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REQUIREMENTS = ROOT / "required_skills.json"
BUNDLE = ROOT / "bundled_skills"
PACKAGE = ROOT / "package.json"


def read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise RuntimeError(f"Missing required file: {path.name}")
    except json.JSONDecodeError as error:
        raise RuntimeError(f"Invalid JSON in {path.name}: {error.msg}") from error


def validate_bundled_skills() -> None:
    requirements = read_json(REQUIREMENTS)
    skills = requirements.get("skills")
    if not isinstance(skills, list):
        raise RuntimeError("required_skills.json must contain a 'skills' array")
    names: set[str] = set()
    for skill in skills:
        if not isinstance(skill, dict) or not isinstance(skill.get("name"), str) or not isinstance(skill.get("version"), str):
            raise RuntimeError("Every skill needs string 'name' and 'version' fields")
        name = skill["name"]
        if name in names:
            raise RuntimeError(f"Duplicate required skill: {name}")
        names.add(name)
        if not (BUNDLE / name / "SKILL.md").is_file():
            raise RuntimeError(f"Missing bundled SKILL.md for required skill: {name}")


def command(name: str) -> str:
    executable = shutil.which(name) or shutil.which(f"{name}.cmd")
    if not executable:
        raise RuntimeError(f"{name} is required. Install Node.js and npm first.")
    return executable


def run(arguments: list[str]) -> None:
    print("+", " ".join(arguments))
    subprocess.run(arguments, cwd=ROOT, check=True)


def main() -> int:
    validate_bundled_skills()
    package = read_json(PACKAGE)
    name, version = package.get("name"), package.get("version")
    if not isinstance(name, str) or not isinstance(version, str):
        raise RuntimeError("package.json needs string name and version fields")
    output = ROOT / f"{name}-{version}.vsix"
    run([command("npm"), "run", "validate"])
    run([command("npx"), "vsce", "package", "--no-dependencies", "--out", str(output)])
    if not output.is_file() or output.stat().st_size == 0:
        raise RuntimeError("VSIX packaging did not produce an output file")
    print(f"Updated VSIX: {output.name} ({output.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print(f"VSIX update failed: {error}", file=sys.stderr)
        sys.exit(1)
