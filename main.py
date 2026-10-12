"""
TORNADO — shaxsiy sun'iy intellekt (kompyuter versiyasi).

Ishga tushirish:
    python main.py            # ovozli rejim ("Tornado" deb chaqirasiz)
    python main.py --text     # yozib muloqot (mikrofon kerak emas, sinash uchun qulay)
    python main.py --mute     # javoblar faqat matn bo'lib chiqadi (ovozsiz)
"""
import argparse
import json
import os
import queue
import random
import re
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))
load_dotenv(BASE.parent / ".env")
load_dotenv(BASE / ".env")

ACKS = {
    "uz": ["Eshitaman.", "Ha, tinglayapman.", "Labbay!", "Buyuring."],
    "ru": ["Слушаю.", "Да, я здесь.", "Весь внимание."],
    "en": ["Listening.", "Yes?", "I'm here."],
}
BYE = {
    "uz": ["Xayr, ko'rishguncha!", "Salomat bo'ling, kerak bo'lsam chaqiring.", "Xayr! Yaxshi kun tilayman."],
    "ru": ["До свидания!", "Пока, зовите, если что."],
    "en": ["Goodbye!", "See you soon."],
}
SLEEP = {
    "uz": "Yaxshi, jim turaman. Kerak bo'lsam, Tornado deb chaqiring.",
    "ru": "Хорошо, молчу. Позовите меня словом Торнадо.",
    "en": "Okay, going quiet. Say Tornado when you need me.",
}
ERR = {
    "uz": "Kechirasiz, hozir AI bilan aloqa o'rnatolmadim. Internetni tekshirib ko'ring.",
    "ru": "Извините, не удалось связаться с ИИ. Проверьте интернет.",
    "en": "Sorry, I couldn't reach the AI. Please check your connection.",
}


def norm(text: str) -> str:
    return re.sub(r"[^\w\s']", "", text.lower(), flags=re.UNICODE).strip()


def strip_wake(text: str, wake_words):
    """Gap boshidagi/ichidagi uyg'otuvchi so'zni topadi. Qaytaradi: (topildimi, qolgan_matn)."""
    words = "|".join(re.escape(w) for w in sorted(wake_words, key=len, reverse=True))
    pattern = re.compile(rf"(?<!\w)({words})(?!\w)[\s,.!?:;-]*", re.IGNORECASE | re.UNICODE)
    if not pattern.search(text):
        return False, text
    return True, pattern.sub("", text, count=1).strip()


def matches(text: str, phrases) -> bool:
    """Qisqa gap (<=4 so'z) bo'lsa va ibora bilan mos kelsa True ("пока я работаю..." chiqish deb olinmasin)."""
    n = norm(text)
    if len(n.split()) > 4:
        return False
    return any(n == norm(p) or n.endswith(" " + norm(p)) or n.startswith(norm(p) + " ") for p in phrases)


def load_cfg():
    with open(BASE / "config.json", "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text", action="store_true", help="yozib muloqot (mikrofonsiz)")
    ap.add_argument("--mute", action="store_true", help="ovozsiz (faqat matn)")
    args = ap.parse_args()

    cfg = load_cfg()
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        print("GEMINI_API_KEY topilmadi.\n.env.example faylini .env deb nusxalang va ichiga YANGI kalitingizni yozing.")
        sys.exit(1)
    model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash").strip()

    from brain import Brain
    from memory import Memory
    from textutil import detect_lang
    from tools import Toolbox
    from voice import Voice

    memory = Memory(BASE / "data")
    voice = None
    if not (args.text and args.mute):
        try:
            voice = Voice(cfg, with_mic=not args.text, with_audio=not args.mute)
        except Exception as e:  # noqa: BLE001
            print(f"Ovoz tizimini ishga tushirib bo'lmadi: {e}")
            if not args.text:
                print("Mikrofon/PyAudio o'rnatilganini tekshiring yoki `python main.py --text` bilan sinab ko'ring.")
                sys.exit(1)

    brain = Brain(cfg, memory, key, model)
    announcements: "queue.Queue[str]" = queue.Queue()
    brain.attach_tools(Toolbox(cfg, memory, announcements.put, brain.search, brain.vision))

    owner = cfg.get("owner_name", "Siz")
    wake_words = cfg.get("wake_words", ["tornado"])
    use_wake = cfg.get("use_wake_word", True) and not args.text
    window = cfg.get("conversation_window_sec", 30)

    def say(text, lang="uz"):
        print(f"TORNADO ({lang.upper()}): {text}")
        if voice:
            voice.speak(text, lang)

    # ---- yangi salom (har safar boshqacha)
    try:
        text, lang = brain.greeting()
        say(text or "Salom, men TORNADO. Tizim ishga tushdi.", lang if text else "uz")
    except Exception as e:  # noqa: BLE001
        print(f"(salom uchun AI javob bermadi: {e})")
        say("Salom! Men TORNADOman, tizim ishga tushdi.", "uz")

    if use_wake:
        print(f"\n[Uyg'otuvchi so'z: {', '.join(wake_words[:2])}. 'Tornado' deb gap boshlang yoki chaqiring.]")
    active_until = time.time() + window

    while True:
        # taymer/eslatmalarni e'lon qilish
        while not announcements.empty():
            say("Eslatma: " + announcements.get(), "uz")

        # ---- kirish
        if args.text:
            try:
                text = input(f"\n{owner} > ").strip()
            except (EOFError, KeyboardInterrupt):
                break
            lang, audio = None, None
        else:
            print("\n[tinglayapman...]" if time.time() < active_until or not use_wake else ".", end="", flush=True)
            text, lang, audio = voice.listen(timeout=4)
            if not text and audio is not None and voice.audio_seconds(audio) > 0.8 and (time.time() < active_until or not use_wake):
                try:  # Google tanimadi: Gemini bilan zaxira transkripsiya
                    text = brain.transcribe(audio.get_wav_data())
                    lang = None
                except Exception:  # noqa: BLE001
                    text = ""
            if not text:
                if voice.last_error:
                    print(f"\n({voice.last_error})")
                    voice.last_error = ""
                continue
        if not text:
            continue

        # ---- uyg'otuvchi so'z
        active = (not use_wake) or time.time() < active_until
        woke, rest = strip_wake(text, wake_words)
        if not active and not woke:
            continue  # atrofdagi suhbat: e'tibor bermaymiz
        if woke:
            text = rest
            if not text:
                say(random.choice(ACKS[lang or "uz"]), lang or "uz")
                active_until = time.time() + window
                continue
        lang = lang or detect_lang(text)
        print(f"\n{owner} ({lang.upper()}): {text}")

        # ---- tezkor mahalliy buyruqlar
        if matches(text, cfg["exit_phrases"]):
            say(random.choice(BYE[lang]), lang)
            break
        if matches(text, cfg["sleep_phrases"]):
            say(SLEEP[lang], lang)
            active_until = 0
            continue

        # ---- miya
        try:
            reply, rlang = brain.respond(text)
        except Exception as e:  # noqa: BLE001
            print(f"Xatolik: {e}")
            say(ERR[lang], lang)
            continue
        if reply:
            say(reply, rlang)
        active_until = time.time() + window


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nTORNADO to'xtatildi.")
