"""
TORNADO ovoz qatlami.

Eshitish: uchta tilda (uz/ru/en) bir vaqtda taniydi va eng ishonchlisini tanlaydi
          (eski kodda ketma-ket urinilardi va doim o'zbek tili yutardi).
Gapirish: javob gaplarga bo'linadi; birinchi gap ijro etilayotganda keyingilari
          parallel tayyorlanadi, shuning uchun kutish deyarli sezilmaydi.
"""
import asyncio
import atexit
import os
import shutil
import tempfile
import threading
from concurrent.futures import ThreadPoolExecutor

import edge_tts
import pygame
import speech_recognition as sr

from textutil import clean_for_speech, split_sentences


class Voice:
    def __init__(self, cfg: dict, with_mic: bool = True, with_audio: bool = True):
        self.cfg = cfg
        self.with_audio = with_audio
        self.voices = cfg["voices"]
        self.rate = cfg.get("speech_rate", "+0%")
        self.tmp = tempfile.mkdtemp(prefix="tornado_")
        atexit.register(shutil.rmtree, self.tmp, True)
        if with_audio:
            pygame.mixer.init()
        self.pool = ThreadPoolExecutor(max_workers=3)
        self.stop_event = threading.Event()

        self.rec = sr.Recognizer()
        self.rec.dynamic_energy_threshold = True
        self.rec.pause_threshold = 0.9
        self.rec.non_speaking_duration = 0.5
        self.last_error = ""
        self.mic = None
        if with_mic:
            self.mic = sr.Microphone()
            self._calibrate()

    # ------------------------------------------------------------- eshitish
    def _calibrate(self):
        try:
            with self.mic as source:
                self.rec.adjust_for_ambient_noise(source, duration=1.0)
        except Exception as e:  # noqa: BLE001
            self.last_error = f"mikrofon: {e}"

    def listen(self, timeout=None, phrase_limit=20):
        """Bitta jumlani tinglaydi. Qaytaradi: (matn, til, audio). Hech narsa bo'lmasa ('', None, None)."""
        try:
            with self.mic as source:
                audio = self.rec.listen(source, timeout=timeout, phrase_time_limit=phrase_limit)
        except sr.WaitTimeoutError:
            return "", None, None
        except Exception as e:  # noqa: BLE001
            self.last_error = f"mikrofon: {e}"
            return "", None, None
        text, lang = self._recognize(audio)
        return text, lang, audio

    def audio_seconds(self, audio) -> float:
        return len(audio.frame_data) / float(audio.sample_rate * audio.sample_width)

    def _recognize(self, audio):
        langs = self.cfg["recognition_languages"]  # {"uz": "uz-UZ", ...}

        def one(code, tag):
            try:
                res = self.rec.recognize_google(audio, language=tag, show_all=True)
            except sr.RequestError as e:
                self.last_error = f"internet/Google: {e}"
                return None
            except Exception:  # noqa: BLE001
                return None
            alts = res.get("alternative") if isinstance(res, dict) else None
            if not alts:
                return None
            top = alts[0]
            txt = (top.get("transcript") or "").strip()
            return (float(top.get("confidence", 0.0)), txt, code) if txt else None

        futs = [self.pool.submit(one, c, t) for c, t in langs.items()]
        cands = [r for r in (f.result() for f in futs) if r]
        if not cands:
            return "", None
        best = max(cands, key=lambda c: c[0])  # ishonch teng bo'lsa, ro'yxatdagi birinchi til yutadi
        return best[1], best[2]

    # ------------------------------------------------------------- gapirish
    def _synth(self, text: str, lang: str):
        voice = self.voices.get(lang) or self.voices["uz"]
        fd, path = tempfile.mkstemp(suffix=".mp3", dir=self.tmp)
        os.close(fd)
        for _ in range(2):  # tarmoq xatosida bir marta qayta urinadi
            try:
                asyncio.run(edge_tts.Communicate(text, voice, rate=self.rate).save(path))
                if os.path.getsize(path) > 0:
                    return path
            except Exception as e:  # noqa: BLE001
                self.last_error = f"tts: {e}"
        try:
            os.remove(path)
        except OSError:
            pass
        return None

    def _play(self, path: str):
        try:
            pygame.mixer.music.load(path)
            pygame.mixer.music.play()
            while pygame.mixer.music.get_busy() and not self.stop_event.is_set():
                pygame.time.wait(40)
            pygame.mixer.music.stop()
            pygame.mixer.music.unload()
        finally:
            try:
                os.remove(path)
            except OSError:
                pass

    def speak(self, text: str, lang: str = "uz"):
        text = clean_for_speech(text)
        if not text or not self.with_audio:
            return
        self.stop_event.clear()
        futures = [self.pool.submit(self._synth, p, lang) for p in split_sentences(text)]
        for f in futures:
            path = f.result()
            if path and not self.stop_event.is_set():
                self._play(path)
            elif path:
                try:
                    os.remove(path)
                except OSError:
                    pass

    def stop(self):
        self.stop_event.set()
        try:
            pygame.mixer.music.stop()
        except pygame.error:
            pass
