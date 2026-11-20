"""Shared model and audio adapters for the additional take-home demos."""

from pathlib import Path
import shutil
import subprocess
from tempfile import TemporaryDirectory

from ops_brain import openai_key, structured_response

DRAFT_FIELDS = ("brand_x", "brand_linkedin", "founder_x", "founder_linkedin")
VOICE_GUIDE = Path(__file__).with_name("voice_guide.txt").read_text(encoding="utf-8")


def draft_posts(transcript: str) -> dict:
    if not transcript.strip() or len(transcript) > 12_000:
        raise ValueError("Enter a transcript of up to 12,000 characters.")
    schema = {
        "type": "object",
        "properties": {field: {"type": "string"} for field in DRAFT_FIELDS},
        "required": list(DRAFT_FIELDS),
        "additionalProperties": False,
    }
    drafts = structured_response(transcript, openai_key(), "social_drafts", VOICE_GUIDE, schema)
    if any(not str(drafts[field]).strip() for field in DRAFT_FIELDS):
        raise ValueError("A draft was empty. Try generating again.")
    if any(len(drafts[field]) > 280 for field in ("brand_x", "founder_x")):
        raise ValueError("An X draft exceeded 280 characters. Try generating again.")
    return drafts


def speak(text: str) -> bytes:
    if not text.strip() or len(text) > 600:
        raise ValueError("Enter up to 600 characters for narration.")
    say = shutil.which("say")
    if say is None:
        raise ValueError("Narration uses the macOS say command.")
    with TemporaryDirectory() as folder:
        source = Path(folder) / "narration.txt"
        source.write_text(text, encoding="utf-8")
        output = Path(folder) / "narration.wav"
        try:
            subprocess.run(
                [say, "-r", "165", "--file-format=WAVE", "--data-format=LEI16@22050",
                 "-o", str(output), "-f", str(source)],
                capture_output=True, check=True, timeout=20,
            )
            return output.read_bytes()
        except (subprocess.SubprocessError, OSError):
            raise ValueError("Could not generate narration on this machine.") from None
