"""Matn yordamchilari (til aniqlash, ovoz uchun tozalash, gaplarga bo'lish)."""
import re

_CYR = re.compile(r"[а-яА-ЯёЁўқғҳЎҚҒҲ]")
_EN_WORDS = {"the", "and", "is", "are", "what", "how", "you", "can", "open", "please", "hello", "who", "why",
             "my", "me", "do", "does", "it", "to", "of", "in", "on", "for", "with", "tell", "show", "play"}
_EMOJI = re.compile("[\U0001F300-\U0001FAFF\u2600-\u27BF\uFE0F]")
_URL = re.compile(r"https?://\S+")
_SPLIT = re.compile(r"(?<=[.!?…])\s+|\n+")


_UZ_MARK = re.compile(r"o['\u2018\u2019`\u02bb]|g['\u2018\u2019`\u02bb]|\b(va|bu|men|siz|sen|nima|qanday|bilan|uchun|yoki|ham|bor|bugun|salom|kerak|menga|bering|och|ayt)\b")


def detect_lang(text: str) -> str:
    """Matn tilini taxminan aniqlaydi: ru / en / uz."""
    if _CYR.search(text):
        return "ru"
    low = text.lower()
    en = len(set(re.findall(r"[a-z']+", low)) & _EN_WORDS)
    uz = len(_UZ_MARK.findall(low))
    return "en" if en > uz else "uz"


def clean_for_speech(text: str) -> str:
    text = _URL.sub(" havola ", text)
    text = _EMOJI.sub("", text)
    text = re.sub(r"[*_`#>~|]+", "", text)
    text = re.sub(r"^\s*[-•]\s+", "", text, flags=re.M)
    return re.sub(r"[ \t]+", " ", text).strip()


def split_sentences(text: str, min_len: int = 25):
    """Gaplarga bo'ladi, juda qisqa bo'laklarni qo'shni gapga biriktiradi."""
    parts, buf = [], ""
    for piece in _SPLIT.split(text):
        piece = piece.strip()
        if not piece:
            continue
        buf = f"{buf} {piece}".strip()
        if len(buf) >= min_len:
            parts.append(buf)
            buf = ""
    if buf:
        if parts and len(buf) < min_len:
            parts[-1] += " " + buf
        else:
            parts.append(buf)
    return parts
