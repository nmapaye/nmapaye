from pathlib import Path
import re
import unittest

from pypdf import PdfReader


RESUME_PATH = Path(__file__).resolve().parents[1] / "public" / "resume.pdf"


class ResumeContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.reader = PdfReader(RESUME_PATH)
        cls.text = "\n".join(page.extract_text() or "" for page in cls.reader.pages)

    def test_resume_is_a_complete_single_page_professional_document(self) -> None:
        self.assertEqual(len(self.reader.pages), 1)
        self.assertIn("Nathaniel Mapaye", self.text)
        self.assertIn("Software Engineer", self.text)
        self.assertIn("nmapaye.com", self.text)
        self.assertNotIn("placeholder", self.text.lower())

    def test_resume_respects_professional_only_privacy(self) -> None:
        self.assertNotRegex(self.text, re.compile(r"\bGPA\b", re.IGNORECASE))
        self.assertNotRegex(
            self.text,
            re.compile(
                r"(?:\+?1[\s.-]*)?(?:\(\d{3}\)|\d{3})"
                r"[\s.-]+\d{3}[\s.-]+\d{4}"
            ),
        )


if __name__ == "__main__":
    unittest.main()
