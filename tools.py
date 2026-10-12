"""
TORNADO vositalari.

Model (Gemini) qaysi vositani chaqirishni O'ZI hal qiladi: kalit so'zlar ro'yxati yo'q.
Shuning uchun "brauzerni och", "Chrome'ga o'tib ber", "open the browser" kabi
turli iboralarning hammasi ishlaydi.

Xavfsizlik: faqat config.json dagi "apps" ro'yxatidagi dasturlar ochiladi,
ixtiyoriy terminal buyrug'i bajarilmaydi.
"""
import ast
import functools
import math
import operator as op
import os
import shutil
import subprocess
import sys
import threading
import time
import webbrowser
from datetime import datetime
from urllib.parse import quote_plus

import psutil
import requests


def safe(fn):
    """Vosita xatosi butun dasturni qulatmasin: xato matni modelga qaytadi."""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception as e:  # noqa: BLE001
            return f"Tool error: {type(e).__name__}: {e}"
    return wrapper


# ---- xavfsiz kalkulyator (eval ishlatilmaydi)
_BIN = {ast.Add: op.add, ast.Sub: op.sub, ast.Mult: op.mul, ast.Div: op.truediv,
        ast.Pow: op.pow, ast.Mod: op.mod, ast.FloorDiv: op.floordiv}
_UN = {ast.USub: op.neg, ast.UAdd: op.pos}
_FUNCS = {"sqrt": math.sqrt, "sin": math.sin, "cos": math.cos, "tan": math.tan, "log": math.log,
          "log10": math.log10, "abs": abs, "round": round, "floor": math.floor, "ceil": math.ceil}
_CONST = {"pi": math.pi, "e": math.e}


def _calc(node):
    if isinstance(node, ast.Expression):
        return _calc(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _BIN:
        left, right = _calc(node.left), _calc(node.right)
        if isinstance(node.op, ast.Pow) and abs(right) > 200:
            raise ValueError("daraja juda katta")
        return _BIN[type(node.op)](left, right)
    if isinstance(node, ast.UnaryOp) and type(node.op) in _UN:
        return _UN[type(node.op)](_calc(node.operand))
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in _FUNCS and not node.keywords:
        return _FUNCS[node.func.id](*[_calc(a) for a in node.args])
    if isinstance(node, ast.Name) and node.id in _CONST:
        return _CONST[node.id]
    raise ValueError("ruxsat etilmagan ifoda")


_WEATHER = {0: "clear sky", 1: "mostly clear", 2: "partly cloudy", 3: "overcast", 45: "fog", 48: "rime fog",
            51: "light drizzle", 53: "drizzle", 55: "heavy drizzle", 61: "light rain", 63: "rain", 65: "heavy rain",
            71: "light snow", 73: "snow", 75: "heavy snow", 80: "rain showers", 81: "rain showers", 82: "violent showers",
            95: "thunderstorm", 96: "thunderstorm with hail", 99: "thunderstorm with hail"}


class Toolbox:
    """Model chaqira oladigan vositalar to'plami (har bir metod = bitta vosita)."""

    def __init__(self, cfg, memory, announce, search_fn, vision_fn):
        self.cfg = cfg
        self.memory = memory
        self.announce = announce      # announce(text): taymer tugaganda navbatga qo'yadi
        self.search_fn = search_fn    # internetdan qidirish (Gemini + Google Search)
        self.vision_fn = vision_fn    # (png_bytes, savol) -> matn
        self.apps = {k.lower(): v for k, v in cfg.get("apps", {}).items()}

    def all(self):
        return [self.system_status, self.open_app, self.open_website, self.search_google,
                self.search_youtube, self.internet_lookup, self.get_weather, self.current_time,
                self.remember_fact, self.forget_fact, self.set_reminder, self.add_note,
                self.read_notes, self.calculate, self.look_at_screen, self.change_volume,
                self.lock_computer]

    # ------------------------------------------------------------- tizim
    @safe
    def system_status(self) -> str:
        """Report the computer's current health: CPU, RAM, disk, battery, uptime and the heaviest programs."""
        cpu = psutil.cpu_percent(interval=0.6)
        ram = psutil.virtual_memory()
        disk = psutil.disk_usage(os.path.abspath(os.sep))
        out = [f"CPU {cpu:.0f}%", f"RAM {ram.percent:.0f}% ({ram.used / 2**30:.1f} of {ram.total / 2**30:.1f} GB)",
               f"Disk {disk.percent:.0f}% full ({disk.free / 2**30:.0f} GB free)"]
        bat = psutil.sensors_battery()
        if bat:
            out.append(f"Battery {bat.percent:.0f}%{' (charging)' if bat.power_plugged else ''}")
        up = time.time() - psutil.boot_time()
        out.append(f"Uptime {int(up // 3600)}h {int(up % 3600 // 60)}m")
        mem = {}
        for p in psutil.process_iter(["name", "memory_percent"]):
            try:
                mem[p.info["name"]] = mem.get(p.info["name"], 0) + (p.info["memory_percent"] or 0)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        top = sorted(mem.items(), key=lambda kv: kv[1], reverse=True)[:3]
        out.append("Heaviest by RAM: " + ", ".join(f"{n} {v:.1f}%" for n, v in top))
        warn = " WARNING: high load, suggest closing some programs." if cpu > 85 or ram.percent > 85 else ""
        return "; ".join(out) + "." + warn

    @safe
    def open_app(self, name: str) -> str:
        """Open an installed desktop application by name (e.g. chrome, telegram, notepad, calculator, vscode, spotify, word)."""
        key = (name or "").strip().lower()
        cmd = self.apps.get(key)
        if cmd is None:
            for k, v in self.apps.items():
                if k in key or key in k:
                    cmd = v
                    break
        if cmd is None:
            return "Unknown app. Available: " + ", ".join(sorted(set(self.apps))) + ". The user can add more in config.json."
        if os.name == "nt":
            subprocess.Popen(cmd, shell=True)
        else:
            exe = shutil.which(cmd.split()[-1]) or shutil.which(key)
            if not exe:
                return "App launching is configured for Windows; not found on this system."
            subprocess.Popen([exe])
        return f"Opened {name}."

    @safe
    def open_website(self, url: str) -> str:
        """Open a website in the default browser. Accepts a full URL or a domain such as youtube.com."""
        url = (url or "").strip()
        if not url.startswith(("http://", "https://")):
            if "." not in url or " " in url:
                return "That does not look like a website address. Use search_google for searching."
            url = "https://" + url
        webbrowser.open(url)
        return f"Opened {url}."

    @safe
    def search_google(self, query: str) -> str:
        """Open a Google search results page for the query in the browser (use when the user wants to browse results themselves)."""
        webbrowser.open("https://www.google.com/search?q=" + quote_plus(query))
        return f"Opened Google results for '{query}'."

    @safe
    def search_youtube(self, query: str) -> str:
        """Open YouTube search results in the browser. Use for playing music, videos or tutorials."""
        webbrowser.open("https://www.youtube.com/results?search_query=" + quote_plus(query))
        return f"Opened YouTube search for '{query}'."

    @safe
    def internet_lookup(self, question: str) -> str:
        """Look up CURRENT information on the internet (news, prices, scores, recent events, facts that may have changed) and return a short answer."""
        return self.search_fn(question)

    @safe
    def get_weather(self, city: str = "") -> str:
        """Get the current weather for a city. If no city is given, the user's home city is used."""
        city = (city or self.cfg.get("city", "Tashkent")).strip()
        g = requests.get("https://geocoding-api.open-meteo.com/v1/search",
                         params={"name": city, "count": 1}, timeout=8).json()
        if not g.get("results"):
            return f"City '{city}' not found."
        r = g["results"][0]
        w = requests.get("https://api.open-meteo.com/v1/forecast", params={
            "latitude": r["latitude"], "longitude": r["longitude"], "timezone": "auto",
            "current": "temperature_2m,apparent_temperature,wind_speed_10m,weather_code"}, timeout=8).json()["current"]
        desc = _WEATHER.get(w.get("weather_code"), "unknown conditions")
        return (f"{r['name']}: {w['temperature_2m']}°C (feels like {w['apparent_temperature']}°C), "
                f"{desc}, wind {w['wind_speed_10m']} km/h.")

    @safe
    def current_time(self) -> str:
        """Get the current local date, weekday and time."""
        return datetime.now().strftime("%A, %d %B %Y, %H:%M")

    # ------------------------------------------------------------- xotira
    @safe
    def remember_fact(self, topic: str, fact: str) -> str:
        """Permanently remember a fact about the user or their life (preferences, names, plans) for future conversations."""
        self.memory.remember(topic, fact)
        return "Saved."

    @safe
    def forget_fact(self, topic: str) -> str:
        """Delete a previously remembered fact by its topic."""
        return "Forgotten." if self.memory.forget(topic) else "Nothing like that was stored."

    @safe
    def add_note(self, text: str) -> str:
        """Save a quick note or to-do for the user (appended with a timestamp to a notes file)."""
        self.memory.add_note(text)
        return "Note saved."

    @safe
    def read_notes(self) -> str:
        """Read back the user's most recent saved notes."""
        return self.memory.read_notes() or "No notes yet."

    @safe
    def set_reminder(self, minutes: float, text: str) -> str:
        """Set a reminder or timer that will be announced aloud after the given number of minutes."""
        minutes = max(0.05, min(float(minutes), 24 * 60))
        t = threading.Timer(minutes * 60, lambda: self.announce(text))
        t.daemon = True
        t.start()
        return f"Reminder set for {minutes:g} minutes from now."

    # ------------------------------------------------------------- yordamchilar
    @safe
    def calculate(self, expression: str) -> str:
        """Accurately evaluate a math expression, e.g. '(12.5*8)/3' or 'sqrt(144)+2**5'."""
        tree = ast.parse(expression.replace("^", "**"), mode="eval")
        val = _calc(tree)
        return str(round(val, 10) if isinstance(val, float) else val)

    @safe
    def look_at_screen(self, question: str = "Describe what is on the screen.") -> str:
        """Take a screenshot of the user's screen and answer a question about it (read text, explain an error, describe what is open)."""
        from io import BytesIO
        from PIL import ImageGrab

        img = ImageGrab.grab()
        if img.width > 1600:
            img = img.resize((1600, int(img.height * 1600 / img.width)))
        buf = BytesIO()
        img.save(buf, format="PNG")
        return self.vision_fn(buf.getvalue(), question)

    @safe
    def change_volume(self, action: str, steps: int = 5) -> str:
        """Change the system volume. action must be 'up', 'down' or 'mute' (mute toggles). steps is how many notches (each is about 2%)."""
        import pyautogui

        key = {"up": "volumeup", "down": "volumedown", "mute": "volumemute"}.get((action or "").lower())
        if not key:
            return "action must be up, down or mute."
        for _ in range(1 if key == "volumemute" else max(1, min(int(steps), 50))):
            pyautogui.press(key)
        return f"Volume {action}."

    @safe
    def lock_computer(self) -> str:
        """Lock the computer screen."""
        if os.name == "nt":
            subprocess.Popen("rundll32.exe user32.dll,LockWorkStation", shell=True)
        elif sys.platform == "darwin":
            subprocess.Popen(["pmset", "displaysleepnow"])
        else:
            subprocess.Popen(["loginctl", "lock-session"])
        return "Screen locked."
