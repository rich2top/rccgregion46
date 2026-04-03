import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "lib" / "question-banks.generated.js"

DOCS = {
    "adult": ROOT / "2026 Provincial Adult Quiz.docx",
    "yaya": ROOT / "2026 Provincial YAYA Quiz REGION 46 SUNDAY SCHOOL.docx",
}

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
NUM_PAT = re.compile(r"^\d+$")
REF_PAT = re.compile(
    r"^(page\b|lesson\b|leson\b|memory verse\b|bible passage\b|intro\b|conclusion\b|"
    r"outline\b|outlines\b|topic\b|mv\b|lo\b|los\b|tr\b|ca\b)",
    re.I,
)
OPTION_PREFIX = re.compile(r"^[a-dA-D][.)]\s*")
INSTRUCTION_PATTERNS = [
    re.compile(r"^select correct answer:?$", re.I),
    re.compile(r"^true or false$", re.I),
    re.compile(r"^fill (in )?the gap[:.]?$", re.I),
]


def read_paragraphs(path: Path):
    with zipfile.ZipFile(path) as archive:
      xml = archive.read("word/document.xml")

    root = ET.fromstring(xml)
    paragraphs = []

    for paragraph in root.findall(".//w:p", NS):
        pieces = []
        is_bold = False

        for run in paragraph.findall(".//w:r", NS):
            text = "".join((node.text or "") for node in run.findall(".//w:t", NS))

            if not text:
                continue

            pieces.append(text)
            run_props = run.find("w:rPr", NS)

            if run_props is not None and run_props.find("w:b", NS) is not None:
                is_bold = True

        joined = "".join(pieces).strip()

        if joined:
            paragraphs.append({"text": joined, "bold": is_bold})

    return paragraphs


def strip_option_prefix(text: str):
    return OPTION_PREFIX.sub("", text).strip()


def is_instruction(text: str):
    return any(pattern.match(text.strip()) for pattern in INSTRUCTION_PATTERNS)


def split_question_blocks(paragraphs):
    blocks = []
    cursor = 0

    while cursor < len(paragraphs):
        current = paragraphs[cursor]["text"]

        if NUM_PAT.fullmatch(current):
            question_number = current
            cursor += 1
            block = []

            while cursor < len(paragraphs) and not NUM_PAT.fullmatch(paragraphs[cursor]["text"]):
                block.append(paragraphs[cursor])
                cursor += 1

            blocks.append((question_number, block))
        else:
            cursor += 1

    return blocks


def extract_content_lines(block):
    content = []

    for item in block:
        if REF_PAT.match(item["text"]):
            break

        content.append(item)

    return content


def parse_document(path: Path, group: str):
    paragraphs = read_paragraphs(path)
    questions = []

    for number, block in split_question_blocks(paragraphs):
        content = extract_content_lines(block)

        if len(content) < 2:
            continue

        instruction = None

        if is_instruction(content[0]["text"]):
            instruction = content[0]["text"]
            content = content[1:]

        if len(content) < 2:
            continue

        prompt = content[0]["text"]
        answers = [
            {"text": strip_option_prefix(item["text"]), "bold": item["bold"]}
            for item in content[1:]
        ]
        correct_answers = [item["text"] for item in answers if item["bold"]]

        if len(answers) == 1:
            question_type = "text"
            options = []
        elif len(correct_answers) > 1:
            question_type = "multi"
            options = [item["text"] for item in answers]
        else:
            question_type = "single"
            options = [item["text"] for item in answers]

        questions.append(
            {
                "id": f"{group}-{number}",
                "number": int(number),
                "instruction": instruction,
                "question": prompt,
                "type": question_type,
                "options": options,
                "acceptedAnswers": correct_answers or [answers[0]["text"]],
            }
        )

    return questions


def main():
    question_banks = {
        group: parse_document(path, group)
        for group, path in DOCS.items()
    }

    body = json.dumps(question_banks, indent=2, ensure_ascii=False)
    OUTPUT.write_text(f"export const QUESTION_BANKS = {body};\n", encoding="utf-8")
    print(f"Generated {OUTPUT}")
    for group, questions in question_banks.items():
        print(f"{group}: {len(questions)} questions")


if __name__ == "__main__":
    main()
