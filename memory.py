"""TORNADO xotirasi: faktlar va qaydlar JSON faylda saqlanadi (desktop/data/memory.json)."""
import json
import threading
from datetime import datetime
from pathlib import Path


class Memory:
    def __init__(self, folder: Path):
        self.folder = Path(folder)
        self.folder.mkdir(parents=True, exist_ok=True)
        self.path = self.folder / "memory.json"
        self.notes_path = self.folder / "qaydlar.txt"
        self._lock = threading.Lock()
        self.data = {"facts": {}}
        self._load()

    def _load(self):
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                loaded = json.load(f)
            if isinstance(loaded, dict) and isinstance(loaded.get("facts"), dict):
                self.data = loaded
        except (FileNotFoundError, json.JSONDecodeError):
            pass

    def _save(self):
        tmp = self.path.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)
        tmp.replace(self.path)

    # ---- faktlar
    def remember(self, key: str, value: str) -> None:
        with self._lock:
            self.data["facts"][key.strip().lower()[:60]] = value.strip()[:300]
            self._save()

    def forget(self, key: str) -> bool:
        key = key.strip().lower()
        with self._lock:
            hit = [k for k in self.data["facts"] if key in k or k in key]
            for k in hit:
                del self.data["facts"][k]
            if hit:
                self._save()
            return bool(hit)

    def facts_text(self, limit: int = 40) -> str:
        items = list(self.data["facts"].items())[-limit:]
        if not items:
            return "(hozircha hech narsa eslab qolinmagan)"
        return "\n".join(f"- {k}: {v}" for k, v in items)

    # ---- qaydlar
    def add_note(self, text: str) -> None:
        stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        with self._lock, open(self.notes_path, "a", encoding="utf-8") as f:
            f.write(f"[{stamp}] {text.strip()}\n")

    def read_notes(self, last: int = 10) -> str:
        try:
            with open(self.notes_path, "r", encoding="utf-8") as f:
                lines = [ln.rstrip() for ln in f if ln.strip()]
        except FileNotFoundError:
            return ""
        return "\n".join(lines[-last:])
