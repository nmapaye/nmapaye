from pathlib import Path
import sys
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "public" / "resume.pdf"

INK = colors.HexColor("#17233C")
ACCENT = colors.HexColor("#2563EB")
MUTED = colors.HexColor("#4B5A70")
RULE = colors.HexColor("#CBD5E1")


def link(label: str, url: str) -> str:
    return f'<a href="{escape(url)}" color="#2563EB">{escape(label)}</a>'


def build_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "name": ParagraphStyle(
            "Name",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=23,
            leading=25,
            textColor=INK,
            alignment=TA_CENTER,
            spaceAfter=2,
        ),
        "title": ParagraphStyle(
            "Title",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12,
            textColor=ACCENT,
            alignment=TA_CENTER,
            uppercase=True,
            spaceAfter=4,
        ),
        "contact": ParagraphStyle(
            "Contact",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.7,
            leading=10,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "section": ParagraphStyle(
            "Section",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=9.4,
            leading=11,
            textColor=ACCENT,
            uppercase=True,
            spaceBefore=6,
            spaceAfter=3,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8.15,
            leading=10.2,
            textColor=INK,
            alignment=TA_LEFT,
        ),
        "entry": ParagraphStyle(
            "Entry",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.45,
            leading=10,
            textColor=INK,
        ),
        "meta": ParagraphStyle(
            "Meta",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.6,
            leading=9,
            textColor=MUTED,
            alignment=TA_RIGHT,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.8,
            leading=9.5,
            textColor=INK,
            leftIndent=8,
            firstLineIndent=-6,
            spaceAfter=1.2,
        ),
        "project": ParagraphStyle(
            "Project",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.9,
            leading=9.7,
            textColor=INK,
            spaceAfter=2,
        ),
    }


def section(title: str, styles: dict[str, ParagraphStyle]):
    return [
        Paragraph(title, styles["section"]),
        HRFlowable(width="100%", thickness=0.55, color=RULE, spaceAfter=3),
    ]


def entry_block(
    role: str,
    organization: str,
    dates: str,
    location: str,
    bullets: list[str],
    styles: dict[str, ParagraphStyle],
):
    heading = Table(
        [
            [
                Paragraph(
                    f"{escape(role)} <font color='#4B5A70'>- {escape(organization)}</font>",
                    styles["entry"],
                ),
                Paragraph(
                    f"{escape(dates)}<br/>{escape(location)}",
                    styles["meta"],
                ),
            ]
        ],
        colWidths=[5.55 * inch, 1.25 * inch],
        hAlign="LEFT",
    )
    heading.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]
        )
    )
    content = [heading]
    content.extend(
        Paragraph(f"- {escape(item)}", styles["bullet"]) for item in bullets
    )
    content.append(Spacer(1, 2))
    return KeepTogether(content)


def project(
    name: str,
    url: str,
    stack: str,
    description: str,
    styles: dict[str, ParagraphStyle],
):
    return Paragraph(
        f"<b>{link(name, url)}</b> "
        f"<font color='#4B5A70'>({escape(stack)})</font> - {escape(description)}",
        styles["project"],
    )


def set_metadata(canvas, _document) -> None:
    canvas.setTitle("Nathaniel Mapaye - Software Engineer Resume")
    canvas.setAuthor("Nathaniel Mapaye")
    canvas.setSubject("Professional resume")


def build_resume(output_path: Path) -> None:
    styles = build_styles()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        rightMargin=0.48 * inch,
        leftMargin=0.48 * inch,
        topMargin=0.38 * inch,
        bottomMargin=0.38 * inch,
        title="Nathaniel Mapaye - Software Engineer Resume",
        author="Nathaniel Mapaye",
        pageCompression=1,
    )

    story = [
        Paragraph("Nathaniel Mapaye", styles["name"]),
        Paragraph("Software Engineer", styles["title"]),
        Paragraph(
            " | ".join(
                [
                    link("nmapaye@ucsc.edu", "mailto:nmapaye@ucsc.edu"),
                    link("nmapaye.com", "https://nmapaye.com/"),
                    link(
                        "linkedin.com/in/nmapaye",
                        "https://www.linkedin.com/in/nmapaye",
                    ),
                    link("github.com/nmapaye", "https://github.com/nmapaye"),
                ]
            ),
            styles["contact"],
        ),
        Spacer(1, 5),
        HRFlowable(width="100%", thickness=1, color=INK, spaceAfter=3),
    ]

    story.extend(section("Summary", styles))
    story.append(
        Paragraph(
            "Software engineer and Technology &amp; Information Management student "
            "at UC Santa Cruz building reliable systems from embedded FreeRTOS and "
            "concurrent C++ to React Native mobile products. Experience spans AI "
            "evaluation, data-center engineering, cybersecurity, and technical tutoring.",
            styles["body"],
        )
    )

    story.extend(section("Experience", styles))
    story.extend(
        [
            entry_block(
                "AI Fellow",
                "Handshake",
                "Apr 2026 - Present",
                "Remote / Contract",
                [
                    "Evaluate paired AI responses for correctness, completeness, clarity, and usefulness; document concrete strengths, failure modes, and edge cases.",
                    "Review repository behavior, diffs, tests, and implementation logic to assess whether proposed software changes satisfy task requirements.",
                ],
                styles,
            ),
            entry_block(
                "Linear Algebra Tutor",
                "UCSC ACE",
                "Jan 2026 - Apr 2026",
                "Santa Cruz, CA",
                [
                    "Led guided problem-solving sessions covering systems of equations, vector spaces, linear transformations, eigenvalues, and diagonalization.",
                    "Adapted explanations across skill levels and helped students move from memorized procedures to step-by-step reasoning.",
                ],
                styles,
            ),
            entry_block(
                "Data Center Engineering Intern",
                "Bitera D.C",
                "Aug 2025 - Sep 2025",
                "Jakarta, Indonesia",
                [
                    "Coordinated remediation and verification for high-severity web vulnerabilities and documented repeatable validation steps.",
                    "Authored incident postmortems and operations runbooks covering power, cooling, network, cabling, and alarm checks.",
                ],
                styles,
            ),
            entry_block(
                "Cyber Security Analyst Intern",
                "Xapiens Teknologi Indonesia",
                "Jul 2024 - Sep 2024",
                "Tangerang, Indonesia",
                [
                    "Performed authenticated scanning and manual validation, prioritized findings by exploitability and CVSS, and tracked remediation.",
                    "Produced proof-of-concept-backed reports with concrete fixes and retest results.",
                ],
                styles,
            ),
        ]
    )

    story.extend(section("Selected Projects", styles))
    story.extend(
        [
            project(
                "AURORA",
                "https://github.com/nmapaye/aurora",
                "React Native, TypeScript, HealthKit, MMKV",
                "iPhone and iPad app combining manual caffeine logs, optional read-only Apple Health sleep import, a 60-second vigilance test, and private on-device insights.",
                styles,
            ),
            project(
                "EmbNode",
                "https://github.com/nmapaye/embnode",
                "C++23, FreeRTOS, ESP32/STM32, MQTT",
                "DMA sampling pipeline with sampler, aggregation, communications, OTA, watchdog, and deep-sleep scheduling, plus host-simulation checks.",
                styles,
            ),
            project(
                "GitOps Canary Operator",
                "https://github.com/nmapaye/gitops",
                "Go, Kubernetes, Prometheus, ArgoCD",
                "SLO-driven progressive delivery controller with policy checks and automatic rollback when latency or error thresholds regress.",
                styles,
            ),
            project(
                "SysLib",
                "https://github.com/nmapaye/syslib",
                "C++23, atomics, lock-free data structures",
                "Header-only systems library with RAII utilities, SPSC and MPMC queues, sanitizer checks, benchmarks, and linearizability tests.",
                styles,
            ),
        ]
    )

    story.extend(section("Education", styles))
    story.append(
        entry_block(
            "B.S., Technology & Information Management",
            "University of California, Santa Cruz",
            "2023 - 2027",
            "Santa Cruz, CA",
            [
                "Undergraduate Dean's Scholarship Award; Bilingual International Baccalaureate Diploma.",
            ],
            styles,
        )
    )

    story.extend(section("Technical Skills", styles))
    story.extend(
        [
            Paragraph(
                "<b>Languages:</b> C++23, Go, TypeScript/JavaScript, Python, Java, Lua",
                styles["body"],
            ),
            Paragraph(
                "<b>Systems &amp; mobile:</b> FreeRTOS, ESP32/STM32, React Native, HealthKit, MMKV, Linux",
                styles["body"],
            ),
            Paragraph(
                "<b>Infrastructure &amp; testing:</b> Docker, Kubernetes, ArgoCD, Helm, Prometheus, GitHub Actions, CMake/CTest, Burp Suite, Nessus",
                styles["body"],
            ),
        ]
    )

    document.build(story, onFirstPage=set_metadata)


if __name__ == "__main__":
    target = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEFAULT_OUTPUT
    build_resume(target)
