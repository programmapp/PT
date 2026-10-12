# Abdunosir Safarov — Portfolio + TORNADO AI

Portfolio sayti va uning shaxsiy sun'iy intellekti **TORNADO** birga ulangan.

TORNADO mehmonni kutib oladi, portfolioni ovozli/yozma taqdim etadi, savollarga javob beradi va xabar qoldirish imkonini beradi.

---

## Tezkor ishga tushirish (test)

### 1. API kalit

1. [Google AI Studio](https://aistudio.google.com/apikey) dan Gemini API kalit oling.
2. `.env.example` ni `.env` deb nusxalang:
   ```bash
   cp .env.example .env
   ```
3. `.env` ichida `GEMINI_API_KEY=...` qatoriga kalitingizni yozing.

### 2. Kutubxonalar

```bash
pip install -r requirements.txt
```

(Faqat portfolio + server uchun: `pip install google-genai python-dotenv edge-tts requests Flask flask-cors`)

### 3. Serverni ishga tushirish

```bash
cd server
python server.py
```

Brauzerda oching: **http://127.0.0.1:8000**

Pastki o'ng burchakda **TORNADO** tugmasi chiqadi. Bosib gaplashib ko'ring yoki "Portfolioni tanishtir" deb yozing.

---

## Struktura

```
portfolio-tornado/
├── Portfolio/              # Asosiy portfolio sayti
│   ├── index.html          # TORNADO vidjeti ulangan
│   ├── style.css
│   ├── script.js
│   ├── profile.jpg
│   ├── assets/
│   └── projects/hacker-terminal/
├── server/
│   ├── server.py           # Flask API + saytni beradi
│   └── portfolio_knowledge.json   # TORNADO bilimi (to'ldirilgan)
├── web/
│   └── tornado-widget.js   # Brauzer vidjeti
├── desktop/                # Kompyuter uchun ovozli TORNADO (ixtiyoriy)
├── requirements.txt
├── .env.example
└── README.md
```

---

## Nima qiladi TORNADO?

- Mehmonni o'zbek / rus / ingliz tilida kutib oladi
- "Portfolioni tanishtir" — bo'limma-bo'lim sayohat (tour)
- Savollarga `portfolio_knowledge.json` asosida javob beradi
- "Xabar qoldirish" — Telegram yoki `messages.log` ga yozadi
- Mikrofon orqali ovozli savol (Chrome / Edge)

---

## Keyingi qadam: hosting

Ishlaganini tasdiqlagandan keyin hosting variantlari:

| Variant | Izoh |
|---------|------|
| **Railway / Render / Fly.io** | `server.py` ni Python app sifatida deploy. `HOST=0.0.0.0`, `PORT` env |
| **VPS (Ubuntu)** | nginx + gunicorn yoki to'g'ridan-to'g'ri `python server.py` |
| **Faqat static** | Frontend GitHub Pages / Netlify, API alohida (Railway) |

Deploy qilishda:
- `.env` dagi kalitlarni hosting environment variables ga qo'ying
- `ALLOWED_ORIGINS` ga sayt domeningizni qo'shing
- `HOST=0.0.0.0` qiling

---

## Desktop (kompyuter) versiyasi

```bash
python desktop/main.py          # ovozli
python desktop/main.py --text   # matn rejimida sinash
```

Bu qism portfolio saytidan mustaqil ishlaydi.

---

© Abdunosir Safarov
