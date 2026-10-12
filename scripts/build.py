#!/usr/bin/env python3
"""Build installable packages and refresh Firefox updates.json (release branch)."""

from __future__ import annotations

import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
ARTIFACTS = ROOT / "artifacts"

REPO = "Klaus220/seo-extension"
RELEASE_BRANCH = "release"
GECKO_ID = "seo-viewer@klaus220"

INCLUDE = [
    "manifest.json",
    "api.js",
    "helpers.js",
    "extract.js",
    "popup.html",
    "popup.css",
    "popup.js",
    "icons/icon-48.png",
    "icons/icon-96.png",
    "README.md",
]


def version() -> str:
    data = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    return data["version"]


def stage(target: Path) -> None:
    if target.exists():
        shutil.rmtree(target)
    for rel in INCLUDE:
        src = ROOT / rel
        dst = target / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)


def zip_dir(source: Path, archive: Path) -> None:
    if archive.exists():
        archive.unlink()
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(source.rglob("*")):
            if path.is_file():
                zf.write(path, path.relative_to(source).as_posix())


def write_updates_json(ver: str, xpi_name: str) -> None:
    update_link = (
        f"https://github.com/{REPO}/raw/{RELEASE_BRANCH}/artifacts/{xpi_name}"
    )
    payload = {
        "addons": {
            GECKO_ID: {
                "updates": [
                    {
                        "version": ver,
                        "update_link": update_link,
                    }
                ]
            }
        }
    }
    (ROOT / "updates.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    ver = version()
    DIST.mkdir(parents=True, exist_ok=True)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)

    firefox_dir = DIST / "firefox"
    chromium_dir = DIST / "chromium"
    stage(firefox_dir)
    stage(chromium_dir)

    xpi_name = f"seo-viewer-{ver}-firefox.xpi"
    xpi = DIST / xpi_name
    chromium_zip = DIST / f"seo-viewer-{ver}-chromium.zip"

    zip_dir(firefox_dir, xpi)
    zip_dir(chromium_dir, chromium_zip)

    artifact_xpi = ARTIFACTS / xpi_name
    shutil.copy2(xpi, artifact_xpi)
    write_updates_json(ver, xpi_name)

    print(f"Firefox:  {xpi}")
    print(f"Artifact: {artifact_xpi}")
    print(f"Chromium: {chromium_zip}")
    print(f"Updates:  {ROOT / 'updates.json'}")
    print(f"Unpacked: {firefox_dir}/  and  {chromium_dir}/")


if __name__ == "__main__":
    main()
