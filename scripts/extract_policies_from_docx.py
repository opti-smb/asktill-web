"""One-off: split AskTill policy docx into plain-text files for the web app."""
from __future__ import annotations

import re
import zipfile
from pathlib import Path

DOCX = Path(r"c:\Users\aswit\Downloads\AskTill_Terms_Privacy_Security_VDP_REVISED_TRACKED (1).docx")
OUT = Path(__file__).resolve().parents[1] / "src" / "content" / "policies"

MARKERS = [
    "ASKTILL TERMS OF SERVICE",
    "ASKTILL PRIVACY POLICY",
    "ASKTILL SECURITY & TRUST",
    "ASKTILL VULNERABILITY DISCLOSURE POLICY",
]

SLUGS = {
    "ASKTILL TERMS OF SERVICE": "terms",
    "ASKTILL PRIVACY POLICY": "privacy",
    "ASKTILL SECURITY & TRUST": "security",
    "ASKTILL VULNERABILITY DISCLOSURE POLICY": "vulnerability-disclosure",
}


def normalize_policy_text(text: str) -> str:
    text = text.replace("\r", "")
    text = text.replace("AskTill Inc.Email:", "AskTill Inc.\nEmail:")
    text = re.sub(r"\[support@asktill\.com\]", "support@asktill.com", text)
    # Common mojibake from Word → plain text extraction
    replacements = {
        "\u201c": '"',
        "\u201d": '"',
        "\u2018": "'",
        "\u2019": "'",
        "\u2013": "-",
        "\u2014": "-",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def extract_text(docx: Path) -> str:
    with zipfile.ZipFile(docx) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    text = re.sub(r"</w:p>", "\n", xml)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("&amp;", "&")
    return normalize_policy_text(text)


def main() -> None:
    text = extract_text(DOCX)
    OUT.mkdir(parents=True, exist_ok=True)
    for i, marker in enumerate(MARKERS):
        start = text.find(marker)
        end = text.find(MARKERS[i + 1]) if i + 1 < len(MARKERS) else len(text)
        body = text[start:end].strip()
        slug = SLUGS[marker]
        (OUT / f"{slug}.txt").write_text(body, encoding="utf-8")
        print(f"wrote {slug}.txt ({len(body)} chars)")


if __name__ == "__main__":
    main()
