/*!
 * TORNADO portfolio vidjeti
 * Qo'shish:
 *   <script src="tornado-widget.js" defer data-api="http://127.0.0.1:8000" data-owner="Abdunosir"></script>
 * Ixtiyoriy: data-theme="dark|light|auto" (standart: dark), data-autogreet="false"
 * Portfolio bo'limlariga:  <section data-tornado-section="projects"> ...
 * Dasturiy boshqaruv: window.Tornado.open() / .startTour() / .say("matn") / .ask("savol")
 */
(() => {
  'use strict';
  if (window.Tornado) return;

  const script = document.currentScript;
  const ds = (script && script.dataset) || {};
  const API = (ds.api || '').replace(/\/+$/, ''); // bo'sh = shu domen
  const OWNER = ds.owner || 'Abdunosir';
  const AUTOGREET = ds.autogreet !== 'false';
  const THEME = (ds.theme || 'dark').toLowerCase(); // dark | light | auto

  const LANG_TAG = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------------ matnlar
  const hourPart = () => {
    const h = new Date().getHours();
    return h < 5 ? 3 : h < 12 ? 0 : h < 18 ? 1 : h < 23 ? 2 : 3;
  };
  const I18N = {
    uz: {
      hello: ['Xayrli tong', 'Xayrli kun', 'Xayrli kech', 'Xayrli tun'],
      greet: (hi) => `${hi}! Men TORNADO, ${OWNER}ning shaxsiy sun'iy intellektiman. Portfolioga xush kelibsiz!`,
      offer: "Xohlasangiz, portfolioni qisqacha tanishtirib chiqaman yoki savollaringizga javob beraman.",
      placeholder: "Savol yozing yoki mikrofonni bosing…",
      ready: 'Tayyor', listening: 'Tinglayapman…', thinking: "O'ylayapman…", speaking: 'Gapiryapman…',
      chips: ['Portfolioni tanishtir', 'Loyihalar haqida ayt', "Seni kim yaratgan?", "Egasi bilan bog'lanmoqchiman"],
      errNet: "Kechirasiz, hozir ulana olmadim. Birozdan keyin urinib ko'ring.",
      errRate: "So'rovlar juda ko'p yuborildi. Bir daqiqadan keyin urinib ko'ring.",
      micDenied: 'Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering.',
      micNone: "Brauzeringiz ovozli kiritishni qo'llamaydi. Chrome yoki Edge'dan foydalaning.",
      noSpeech: 'Hech narsa eshitmadim.',
      form: { title: 'Xabar qoldirish', name: 'Ismingiz', contact: 'Telefon, email yoki Telegram', message: 'Xabaringiz', send: 'Yuborish', cancel: 'Bekor qilish',
              ok: 'Xabaringiz yetkazildi. Rahmat!', fail: "Xabar yuborilmadi, keyinroq urinib ko'ring.", need: "Aloqa ma'lumoti va xabarni yozing." },
      tour: { btn: 'Taqdimot', skip: 'Keyingisi', stop: "To'xtatish", end: "Taqdimot tugadi. Savollaringiz bo'lsa, bemalol so'rang!", fail: "Taqdimotni boshlab bo'lmadi." },
      hands: 'Suhbat rejimi', mute: "Ovozni o'chirish", unmute: 'Ovozni yoqish', close: 'Yopish', send: 'Yuborish', mic: 'Mikrofon',
    },
    ru: {
      hello: ['Доброе утро', 'Добрый день', 'Добрый вечер', 'Доброй ночи'],
      greet: (hi) => `${hi}! Я TORNADO, личный помощник на базе искусственного интеллекта. Меня создал ${OWNER}. Добро пожаловать в портфолио!`,
      offer: 'Если хотите, я коротко представлю портфолио или отвечу на ваши вопросы.',
      placeholder: 'Напишите вопрос или нажмите микрофон…',
      ready: 'Готов', listening: 'Слушаю…', thinking: 'Думаю…', speaking: 'Говорю…',
      chips: ['Представь портфолио', 'Расскажи о проектах', 'Кто тебя создал?', 'Хочу связаться с автором'],
      errNet: 'Извините, не удалось подключиться. Попробуйте чуть позже.',
      errRate: 'Слишком много запросов. Попробуйте через минуту.',
      micDenied: 'Нет доступа к микрофону. Разрешите его в настройках браузера.',
      micNone: 'Браузер не поддерживает голосовой ввод. Используйте Chrome или Edge.',
      noSpeech: 'Ничего не расслышал.',
      form: { title: 'Оставить сообщение', name: 'Ваше имя', contact: 'Телефон, email или Telegram', message: 'Ваше сообщение', send: 'Отправить', cancel: 'Отмена',
              ok: 'Сообщение доставлено. Спасибо!', fail: 'Не удалось отправить, попробуйте позже.', need: 'Укажите контакт и сообщение.' },
      tour: { btn: 'Презентация', skip: 'Дальше', stop: 'Стоп', end: 'Презентация окончена. Если есть вопросы, спрашивайте!', fail: 'Не удалось начать презентацию.' },
      hands: 'Режим диалога', mute: 'Выключить звук', unmute: 'Включить звук', close: 'Закрыть', send: 'Отправить', mic: 'Микрофон',
    },
    en: {
      hello: ['Good morning', 'Good afternoon', 'Good evening', 'Hello'],
      greet: (hi) => `${hi}! I'm TORNADO, ${OWNER}'s personal AI. Welcome to the portfolio!`,
      offer: 'I can give you a quick tour of the portfolio or answer any questions you have.',
      placeholder: 'Type a question or tap the microphone…',
      ready: 'Ready', listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking…',
      chips: ['Present the portfolio', 'Tell me about the projects', 'Who created you?', 'I want to contact the owner'],
      errNet: "Sorry, I couldn't connect right now. Please try again shortly.",
      errRate: 'Too many requests. Please try again in a minute.',
      micDenied: 'Microphone access was denied. Allow it in your browser settings.',
      micNone: "Your browser doesn't support voice input. Please use Chrome or Edge.",
      noSpeech: "I didn't hear anything.",
      form: { title: 'Leave a message', name: 'Your name', contact: 'Phone, email or Telegram', message: 'Your message', send: 'Send', cancel: 'Cancel',
              ok: 'Your message was delivered. Thank you!', fail: "Couldn't send it, please try later.", need: 'Please add a contact and a message.' },
      tour: { btn: 'Tour', skip: 'Next', stop: 'Stop', end: "That's the tour. Ask me anything!", fail: "Couldn't start the tour." },
      hands: 'Conversation mode', mute: 'Mute voice', unmute: 'Unmute voice', close: 'Close', send: 'Send', mic: 'Microphone',
    },
  };

  // ------------------------------------------------------------------ holat
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* ignore */ } },
  };
  const detectLang = () => {
    const saved = store.get('tornado_lang');
    if (saved && I18N[saved]) return saved;
    const n = (navigator.language || 'uz').slice(0, 2).toLowerCase();
    return I18N[n] ? n : 'uz';
  };

  let lang = detectLang();
  let muted = store.get('tornado_muted') === '1';
  let handsfree = false;
  let busy = false;
  let listening = false;
  let speaking = false;
  let tourRunning = false;
  let visibleSection = '';
  const history = [];
  let ui = {};
  let rec = null;
  let silentRetries = 0;

  const t = () => I18N[lang];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ------------------------------------------------------------------ uslublar
  const ICON = {
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
    on: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
    off: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6m0-6 6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    hands: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-7h3zM3 19a2 2 0 0 0 2 2h1v-7H3z"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg>',
  };

  const WIDGET_CSS = `
:host{all:initial}
*{box-sizing:border-box}
.root{--bg:#0b1020;--bg2:#121a33;--fg:#e8ecf8;--mut:#93a0c4;--line:rgba(148,163,184,.18);--a:#22d3ee;--b:#8b5cf6;--bot:#17213f;--me:linear-gradient(135deg,#22d3ee,#8b5cf6);
  font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--fg);position:fixed;right:20px;bottom:20px;z-index:2147483000}
.root.light{--bg:#ffffff;--bg2:#f3f6fd;--fg:#10172e;--mut:#5b6785;--line:rgba(15,23,42,.12);--bot:#eef2fb}
button{font:inherit;color:inherit;cursor:pointer;border:0;background:none}
button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid var(--a);outline-offset:2px}

.orb{position:relative;width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--a),var(--b));display:grid;place-items:center;
  box-shadow:0 10px 30px rgba(34,211,238,.35),0 0 0 1px rgba(255,255,255,.15) inset;transition:transform .2s}
.orb:hover{transform:scale(1.06)}
.orb svg{width:34px;height:34px}
.orb .l{transform-box:fill-box;transform-origin:center;animation:sway 2.6s ease-in-out infinite alternate}
.orb .l2{animation-delay:-.6s}.orb .l3{animation-delay:-1.2s}.orb .l4{animation-delay:-1.8s}
@keyframes sway{from{transform:translateX(-3px)}to{transform:translateX(3px)}}
.orb::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:2px solid var(--a);opacity:0}
.root.live .orb::after{animation:ring 1.4s ease-out infinite}
.root.live .orb .l{animation-duration:.7s}
@keyframes ring{from{transform:scale(.85);opacity:.9}to{transform:scale(1.35);opacity:0}}

.bubble{position:absolute;right:0;bottom:78px;width:min(300px,calc(100vw - 40px));background:var(--bg);color:var(--fg);border:1px solid var(--line);
  border-radius:16px 16px 4px 16px;padding:12px 34px 12px 14px;box-shadow:0 12px 40px rgba(0,0,0,.35);animation:pop .35s ease both}
.bubble .x{position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;color:var(--mut)}
.bubble .x svg{width:14px;height:14px}
.bubble b{display:block;margin-bottom:2px}
.bubble button.go{margin-top:8px;padding:6px 12px;border-radius:999px;background:linear-gradient(135deg,var(--a),var(--b));color:#06101f;font-weight:600}
@keyframes pop{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}

.panel{position:absolute;right:0;bottom:78px;width:min(300px,calc(100vw - 56px));height:min(360px,calc(100vh - 160px));display:flex;flex-direction:column;
  background:var(--bg);border:1px solid var(--line);border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.45);overflow:hidden;animation:pop .25s ease both}
.hidden{display:none!important}
.head{display:flex;align-items:center;gap:8px;padding:12px 12px 12px 16px;background:linear-gradient(135deg,rgba(34,211,238,.14),rgba(139,92,246,.14));border-bottom:1px solid var(--line)}
.head .ttl{flex:1;min-width:0}
.head .ttl b{display:block;letter-spacing:.08em}
.head .ttl span{font-size:12px;color:var(--mut)}
.ib{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;color:var(--mut)}
.ib:hover{background:var(--bg2);color:var(--fg)}
.ib.on{background:var(--bg2);color:var(--a)}
.ib svg{width:18px;height:18px}
select{background:var(--bg2);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:4px 6px;font:inherit;font-size:12px}

.log{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}
.m{max-width:86%;padding:9px 12px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word;animation:pop .2s ease both}
.m.bot{background:var(--bot);border-bottom-left-radius:4px;align-self:flex-start}
.m.me{background:var(--me);color:#06101f;border-bottom-right-radius:4px;align-self:flex-end;font-weight:500}
.m.dots{display:flex;gap:4px;padding:12px}
.m.dots i{width:7px;height:7px;border-radius:50%;background:var(--mut);animation:bl 1s infinite}
.m.dots i:nth-child(2){animation-delay:.15s}.m.dots i:nth-child(3){animation-delay:.3s}
@keyframes bl{0%,80%,100%{opacity:.25}40%{opacity:1}}

.chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px}
.chips button{padding:6px 11px;border:1px solid var(--line);border-radius:999px;background:var(--bg2);font-size:12.5px}
.chips button:hover{border-color:var(--a)}

.tourbar{padding:10px 14px;border-top:1px solid var(--line);background:var(--bg2);display:flex;gap:8px;align-items:center}
.tourbar span{flex:1;font-size:12.5px;color:var(--mut)}
.tourbar button{padding:6px 12px;border-radius:999px;border:1px solid var(--line)}
.tourbar button.pri{background:linear-gradient(135deg,var(--a),var(--b));color:#06101f;border:0;font-weight:600}

.form{padding:12px 14px;border-top:1px solid var(--line);background:var(--bg2);display:flex;flex-direction:column;gap:8px}
.form b{font-size:13px}
.form input,.form textarea{width:100%;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:10px;padding:8px 10px;font:inherit}
.form textarea{resize:none;height:70px}
.form .row{display:flex;gap:8px;justify-content:flex-end}
.form .row button{padding:7px 14px;border-radius:999px;border:1px solid var(--line)}
.form .row .pri{background:linear-gradient(135deg,var(--a),var(--b));color:#06101f;border:0;font-weight:600}
.form .hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}

.bar{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--line);align-items:center}
.bar input{flex:1;min-width:0;background:var(--bg2);color:var(--fg);border:1px solid var(--line);border-radius:999px;padding:10px 14px;font:inherit}
.bar .ib{width:40px;height:40px;border-radius:50%}
.bar .mic.on{background:#ef4444;color:#fff;animation:ring2 1.2s infinite}
.bar .snd{background:linear-gradient(135deg,var(--a),var(--b));color:#06101f}
@keyframes ring2{0%{box-shadow:0 0 0 0 rgba(239,68,68,.55)}100%{box-shadow:0 0 0 12px rgba(239,68,68,0)}}

.tourfloat{position:absolute;right:0;bottom:78px;width:min(320px,calc(100vw - 40px));background:var(--bg);border:1px solid var(--line);border-radius:16px;
  padding:12px 14px;box-shadow:0 12px 40px rgba(0,0,0,.4);animation:pop .3s ease both}
.tourfloat p{margin:0 0 10px;color:var(--fg)}
.tourfloat .btns{display:flex;gap:8px;justify-content:flex-end}
.tourfloat button{padding:6px 12px;border-radius:999px;border:1px solid var(--line)}
.tourfloat button.pri{background:linear-gradient(135deg,var(--a),var(--b));color:#06101f;border:0;font-weight:600}

@media (max-width:520px){
  .root{right:12px;bottom:12px}
  .root.open .orb{display:none}
  .panel{position:fixed;right:0;left:0;bottom:0;width:auto;height:48vh;border-radius:20px 20px 0 0}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

  const HTML = `
<div class="root" id="root">
  <div class="bubble hidden" id="bubble" role="status">
    <button class="x" id="bubbleX" aria-label="close">${ICON.close}</button>
    <b>TORNADO</b><span id="bubbleText"></span>
    <div><button class="go" id="bubbleGo"></button></div>
  </div>

  <div class="tourfloat hidden" id="tourfloat" role="status" aria-live="polite">
    <p id="tourText"></p>
    <div class="btns"><button id="tourStop"></button><button class="pri" id="tourSkip"></button></div>
  </div>

  <section class="panel hidden" id="panel" role="dialog" aria-label="TORNADO">
    <header class="head">
      <div class="ttl"><b>TORNADO</b><span id="status"></span></div>
      <select id="lang" aria-label="language"><option value="uz">UZ</option><option value="ru">RU</option><option value="en">EN</option></select>
      <button class="ib" id="hands">${ICON.hands}</button>
      <button class="ib" id="mute"></button>
      <button class="ib" id="close">${ICON.close}</button>
    </header>
    <div class="log" id="log" aria-live="polite"></div>
    <div class="chips" id="chips"></div>
    <form class="form hidden" id="form" autocomplete="off">
      <b id="fTitle"></b>
      <input id="fName" maxlength="80">
      <input id="fContact" maxlength="120">
      <textarea id="fMsg" maxlength="1000"></textarea>
      <input class="hp" id="fHp" tabindex="-1" aria-hidden="true" autocomplete="off">
      <div class="row"><button type="button" id="fCancel"></button><button type="submit" class="pri" id="fSend"></button></div>
    </form>
    <div class="bar">
      <input id="input" maxlength="500" autocomplete="off">
      <button class="ib mic" id="mic">${ICON.mic}</button>
      <button class="ib snd" id="send">${ICON.send}</button>
    </div>
  </section>

  <button class="orb" id="orb" aria-label="TORNADO">
    <svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round">
      <path class="l l1" d="M9 11h30"/><path class="l l2" d="M13 20h22"/><path class="l l3" d="M17 29h14"/><path class="l l4" d="M21 38h6"/>
    </svg>
  </button>
</div>`;

  // ------------------------------------------------------------------ yordamchi UI
  const $ = (id) => ui.sr.getElementById(id);

  function setStatus(txt) { ui.status.textContent = txt; }
  function refreshStatus() {
    setStatus(listening ? t().listening : busy ? t().thinking : speaking ? t().speaking : t().ready);
    ui.root.classList.toggle('live', listening || speaking);
    ui.mic.classList.toggle('on', listening);
  }

  function addMsg(who, text) {
    const d = document.createElement('div');
    d.className = 'm ' + who;
    d.textContent = text; // textContent: XSS'dan himoya
    ui.log.appendChild(d);
    ui.log.scrollTop = ui.log.scrollHeight;
    return d;
  }
  function showDots() {
    const d = document.createElement('div');
    d.className = 'm bot dots';
    d.innerHTML = '<i></i><i></i><i></i>';
    ui.log.appendChild(d);
    ui.log.scrollTop = ui.log.scrollHeight;
    return d;
  }

  function renderChips() {
    ui.chips.innerHTML = '';
    t().chips.forEach((label, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', () => {
        ui.chips.classList.add('hidden');
        if (i === 0) startTour(); else send(label);
      });
      ui.chips.appendChild(b);
    });
  }

  function applyLang() {
    const L = t();
    ui.lang.value = lang;
    ui.input.placeholder = L.placeholder;
    ui.mic.setAttribute('aria-label', L.mic);
    ui.send.setAttribute('aria-label', L.send);
    ui.hands.title = L.hands;
    ui.hands.setAttribute('aria-label', L.hands);
    ui.close.setAttribute('aria-label', L.close);
    ui.mute.innerHTML = muted ? ICON.off : ICON.on;
    ui.mute.title = muted ? L.unmute : L.mute;
    ui.mute.setAttribute('aria-label', ui.mute.title);
    ui.fTitle.textContent = L.form.title;
    ui.fName.placeholder = L.form.name;
    ui.fContact.placeholder = L.form.contact;
    ui.fMsg.placeholder = L.form.message;
    ui.fSend.textContent = L.form.send;
    ui.fCancel.textContent = L.form.cancel;
    ui.tourStop.textContent = L.tour.stop;
    ui.tourSkip.textContent = L.tour.skip;
    ui.bubbleGo.textContent = L.tour.btn;
    renderChips();
    refreshStatus();
  }

  // ------------------------------------------------------------------ bo'limlar
  function sectionEl(id) {
    if (!id) return null;
    return document.querySelector(`[data-tornado-section="${window.CSS.escape(id)}"]`) || document.getElementById(id);
  }
  function scrollToSection(id) {
    if (!id) return false;
    // Portfolio SPA: menyu orqali bo'limni ochish (scroll emas)
    const nav = document.querySelector(`.nav-item[data-target="${id}"]`);
    if (nav) {
      nav.click();
    } else if (typeof window.switchPage === 'function') {
      window.switchPage(id);
    }
    const el = sectionEl(id);
    if (!el) return !!nav;
    // Agar oddiy (scroll) sahifa bo'lsa — pastga tushamiz
    if (!nav && !document.querySelector('.page-section')) {
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
    el.classList.add('tornado-highlight');
    setTimeout(() => el.classList.remove('tornado-highlight'), 3200);
    visibleSection = id;
    return true;
  }
  function watchSections() {
    const els = document.querySelectorAll('[data-tornado-section]');
    if (!els.length || !('IntersectionObserver' in window)) return;
    const ratios = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const id = e.target.dataset.tornadoSection;
        if (e.isIntersecting) ratios.set(id, e.intersectionRatio); else ratios.delete(id);
      });
      let best = '', max = 0;
      ratios.forEach((r, id) => { if (r >= max) { max = r; best = id; } });
      if (best) visibleSection = best;
    }, { threshold: [0.2, 0.4, 0.6, 0.8] });
    els.forEach((el) => io.observe(el));
  }

  // ------------------------------------------------------------------ ovoz chiqarish
  let speakToken = 0;
  let cancelCurrent = null;

  function stopSpeaking() {
    speakToken++;
    try { window.speechSynthesis && speechSynthesis.cancel(); } catch (_) { /* ignore */ }
    if (cancelCurrent) cancelCurrent();
    speaking = false;
    refreshStatus();
  }

  function browserSpeak(text, l, token) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window) || token !== speakToken) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = LANG_TAG[l] || 'uz-UZ';
      const voices = speechSynthesis.getVoices();
      const langPrefix = (l || 'uz').toLowerCase();
      // Faqat erkak ovoz: female/ayol nomlarini rad etamiz
      const isFemale = (n) => /female|woman|girl|zira|susan|helen|hazel|catherine|natalia|irina|milena|gulnora|madina|ayol|qiz/i.test(n || '');
      const isMale = (n) => /male|man|boy|david|mark|george|brian|guy|sardor|dmitry|paul|richard|thomas|dilshod|jamshid/i.test(n || '');
      const sameLang = voices.filter((x) => x.lang && x.lang.toLowerCase().startsWith(langPrefix));
      // Faqat erkak — ayol ovoz umuman ishlatilmaydi
      const v = sameLang.find((x) => isMale(x.name) && !isFemale(x.name))
        || sameLang.find((x) => !isFemale(x.name) && /male/i.test(x.name || ''));
      if (!v) { resolve(); return; } // erkak topilmasa jim
      u.voice = v;
      u.onend = u.onerror = () => { cancelCurrent = null; resolve(); };
      cancelCurrent = () => { try { speechSynthesis.cancel(); } catch (_) { /* ignore */ } resolve(); };
      speechSynthesis.speak(u);
    });
  }

  async function speak(text, l) {
    stopSpeaking();
    if (muted || !text) return;
    const token = speakToken;
    speaking = true;
    refreshStatus();
    try {
      const r = await fetch(API + '/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang: l || lang }),
      });
      if (!r.ok) throw new Error('tts ' + r.status);
      const blob = await r.blob();
      if (token !== speakToken) return;
      const url = URL.createObjectURL(blob);
      await new Promise((resolve) => {
        const a = new Audio(url);
        const done = () => { URL.revokeObjectURL(url); if (cancelCurrent === cancel) cancelCurrent = null; resolve(); };
        const cancel = () => { a.pause(); done(); };
        cancelCurrent = cancel;
        a.onended = done;
        a.onerror = done;
        a.play().catch(done); // brauzer avtoijroni bloklasa jim o'tadi
      });
    } catch (_) {
      if (token === speakToken) await browserSpeak(text, l || lang, token);
    } finally {
      if (token === speakToken) { speaking = false; refreshStatus(); }
    }
  }

  // ------------------------------------------------------------------ ovoz kiritish
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  function stopListening() {
    if (rec) { try { rec.abort(); } catch (_) { /* ignore */ } rec = null; }
    listening = false;
    refreshStatus();
  }

  function startListening() {
    if (!SR) { addMsg('bot', t().micNone); handsfree = false; ui.hands.classList.remove('on'); return; }
    if (listening || busy) return;
    stopSpeaking();
    let gotFinal = false;
    let errored = false;
    rec = new SR();
    rec.lang = LANG_TAG[lang];
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => { listening = true; refreshStatus(); };
    rec.onresult = (e) => {
      let interim = '', fin = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript; else interim += r[0].transcript;
      }
      ui.input.value = (fin || interim).trim();
      if (fin.trim()) { gotFinal = true; silentRetries = 0; const q = fin.trim(); ui.input.value = ''; send(q); }
    };
    rec.onerror = (e) => {
      errored = true;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        addMsg('bot', t().micDenied); handsfree = false; ui.hands.classList.remove('on');
      } else if (e.error === 'no-speech') {
        errored = false; // onend hal qiladi
      } else if (e.error !== 'aborted') {
        addMsg('bot', t().noSpeech);
      }
    };
    rec.onend = () => {
      listening = false; rec = null; refreshStatus();
      if (handsfree && !gotFinal && !errored && !busy && !speaking && !ui.panel.classList.contains('hidden')) {
        if (++silentRetries <= 2) setTimeout(startListening, 400);
        else { handsfree = false; ui.hands.classList.remove('on'); silentRetries = 0; }
      }
    };
    try { rec.start(); } catch (_) { listening = false; rec = null; }
  }

  // ------------------------------------------------------------------ suhbat
  async function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    if (tourRunning) stopTour(false);
    stopSpeaking();
    openPanel();
    ui.chips.classList.add('hidden');
    addMsg('me', text);
    ui.input.value = '';
    busy = true;
    refreshStatus();
    const dots = showDots();
    let data = null, errMsg = '';
    try {
      const r = await fetch(API + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history.slice(-10), current_section: visibleSection }),
      });
      if (r.status === 429) errMsg = t().errRate;
      else if (!r.ok) {
        try {
          const j = await r.json();
          if (j && j.error === 'bad_api_key') {
            errMsg = lang === 'ru'
              ? 'API-ключ неверный. В .env укажите ключ AIzaSy... из Google AI Studio.'
              : lang === 'en'
              ? 'Invalid API key. Put an AIzaSy... key from Google AI Studio in .env.'
              : "API kalit noto'g'ri. .env ga Google AI Studio dan AIzaSy... kalitini yozing.";
          } else errMsg = t().errNet;
        } catch (_) { errMsg = t().errNet; }
      } else data = await r.json();
    } catch (_) { errMsg = t().errNet; }
    dots.remove();
    busy = false;

    if (!data || !data.reply) {
      addMsg('bot', errMsg || t().errNet);
      refreshStatus();
      return;
    }
    history.push({ role: 'user', text }, { role: 'assistant', text: data.reply });
    if (history.length > 20) history.splice(0, history.length - 20);
    const replyLang = I18N[data.lang] ? data.lang : lang;
    addMsg('bot', data.reply);
    refreshStatus();

    if (data.action === 'scroll' && data.target) scrollToSection(data.target);
    if (data.action === 'leave_message') showForm();

    await speak(data.reply, replyLang);

    if (data.action === 'start_tour') { startTour(); return; }
    if (handsfree && !tourRunning && !ui.panel.classList.contains('hidden')) startListening();
  }

  // ------------------------------------------------------------------ taqdimot (tour)
  let skipResolve = null;
  const waitSkip = () => new Promise((r) => { skipResolve = r; });

  function stopTour(speakEnd) {
    if (!tourRunning) return;
    tourRunning = false;
    ui.tourfloat.classList.add('hidden');
    stopSpeaking();
    if (skipResolve) skipResolve();
    if (speakEnd) { addMsg('bot', t().tour.end); }
  }

  async function startTour() {
    if (tourRunning) return;
    stopListening();
    let steps = [];
    try {
      const r = await fetch(API + '/api/tour');
      if (!r.ok) throw new Error('tour');
      steps = (await r.json()).steps || [];
    } catch (_) { /* quyida xabar beriladi */ }
    if (!steps.length) { addMsg('bot', t().tour.fail); await speak(t().tour.fail, lang); return; }

    tourRunning = true;
    ui.panel.classList.add('hidden');
    ui.root.classList.remove('open');
    ui.bubble.classList.add('hidden');
    ui.tourfloat.classList.remove('hidden');

    for (const step of steps) {
      if (!tourRunning) break;
      const text = (step.text && (step.text[lang] || step.text.uz)) || '';
      if (!text) continue;
      scrollToSection(step.section);
      ui.tourText.textContent = text;
      addMsg('bot', text);
      const skip = waitSkip();
      const body = muted ? sleep(Math.max(3000, text.length * 60)) : speak(text, lang);
      await Promise.race([body, skip]);
      if (tourRunning && !muted) await Promise.race([sleep(500), skip]);
    }

    const completed = tourRunning;
    ui.tourfloat.classList.add('hidden');
    tourRunning = false;
    // Panel ochilmaydi — faqat ovoz; foydalanuvchi orb orqali ochadi
    if (completed) {
      addMsg('bot', t().tour.end);
      await speak(t().tour.end, lang);
    }
  }

  // ------------------------------------------------------------------ xabar qoldirish
  function showForm() {
    ui.form.classList.remove('hidden');
    ui.fContact.focus();
  }
  async function submitForm(ev) {
    ev.preventDefault();
    const body = {
      name: ui.fName.value, contact: ui.fContact.value, message: ui.fMsg.value, website: ui.fHp.value,
    };
    if (!body.contact.trim() || !body.message.trim()) { addMsg('bot', t().form.need); return; }
    ui.fSend.disabled = true;
    try {
      const r = await fetch(API + '/api/leave-message', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (r.status === 429) addMsg('bot', t().errRate);
      else if (!r.ok) addMsg('bot', t().form.fail);
      else {
        addMsg('bot', t().form.ok);
        ui.form.classList.add('hidden');
        ui.fName.value = ui.fContact.value = ui.fMsg.value = '';
        speak(t().form.ok, lang);
      }
    } catch (_) { addMsg('bot', t().form.fail); }
    ui.fSend.disabled = false;
  }

  // ------------------------------------------------------------------ salomlashish
  let opened = false;
  function greetText() { return t().greet(t().hello[hourPart()]); }

  function openPanel() {
    ui.bubble.classList.add('hidden');
    ui.panel.classList.remove('hidden');
    ui.root.classList.add('open');
    if (!opened) {
      opened = true;
      addMsg('bot', greetText() + '\n' + t().offer);
    }
    if (window.matchMedia && matchMedia('(pointer:fine)').matches) setTimeout(() => ui.input.focus({ preventScroll: true }), 50);
  }
  function closePanel() {
    ui.panel.classList.add('hidden');
    ui.root.classList.remove('open');
    stopListening();
    stopSpeaking();
    handsfree = false;
    ui.hands.classList.remove('on');
  }

  function showBubble() {
    if (opened || tourRunning || !ui.panel.classList.contains('hidden')) return;
    ui.bubbleText.textContent = greetText();
    ui.bubble.classList.remove('hidden');
  }

  function armVoiceGreeting() {
    let done = false;
    try { if (sessionStorage.getItem('tornado_greeted')) return; } catch (_) { /* ignore */ }
    const events = ['pointerdown', 'keydown', 'touchstart'];
    const go = (e) => {
      if (done) return;
      done = true;
      events.forEach((n) => window.removeEventListener(n, go, true));
      try { sessionStorage.setItem('tornado_greeted', '1'); } catch (_) { /* ignore */ }
      // mehmon vidjetning o'zi bilan ishlayotgan bo'lsa (masalan mikrofon) aralashmaymiz
      const path = e.composedPath ? e.composedPath() : [];
      if (path.includes(ui.host) || muted || tourRunning || busy || listening) return;
      speak(greetText(), lang);
    };
    events.forEach((n) => window.addEventListener(n, go, true));
  }

  // ------------------------------------------------------------------ ishga tushirish
  function init() {
    const style = document.createElement('style');
    style.textContent =
      '.tornado-highlight{outline:2px solid rgba(34,211,238,.9)!important;outline-offset:8px;border-radius:14px;' +
      'box-shadow:0 0 0 10px rgba(34,211,238,.10),0 0 50px rgba(139,92,246,.25)!important;transition:box-shadow .4s,outline-color .4s}';
    document.head.appendChild(style);

    const host = document.createElement('div');
    host.id = 'tornado-root';
    document.body.appendChild(host);
    const sr = host.attachShadow({ mode: 'open' });
    sr.innerHTML = `<style>${WIDGET_CSS}</style>${HTML}`;
    ui = { host, sr };
    ['root', 'bubble', 'bubbleText', 'bubbleGo', 'bubbleX', 'tourfloat', 'tourText', 'tourStop', 'tourSkip', 'panel', 'status', 'lang', 'hands',
      'mute', 'close', 'log', 'chips', 'form', 'fTitle', 'fName', 'fContact', 'fMsg', 'fHp', 'fCancel', 'fSend', 'input', 'mic', 'send', 'orb']
      .forEach((id) => { ui[id] = $(id); });

    const light = THEME === 'light' || (THEME === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches);
    ui.root.classList.toggle('light', light);
    applyLang();
    if (!SR) ui.mic.classList.add('hidden');

    ui.orb.addEventListener('click', () => (ui.panel.classList.contains('hidden') ? openPanel() : closePanel()));
    ui.bubbleX.addEventListener('click', () => ui.bubble.classList.add('hidden'));
    ui.bubbleGo.addEventListener('click', () => startTour());
    ui.bubble.addEventListener('click', (e) => { if (e.target === ui.bubble || e.target === ui.bubbleText) openPanel(); });
    ui.close.addEventListener('click', closePanel);
    ui.send.addEventListener('click', () => send(ui.input.value));
    ui.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); send(ui.input.value); } });
    ui.mic.addEventListener('click', () => (listening ? stopListening() : startListening()));
    ui.hands.addEventListener('click', () => {
      handsfree = !handsfree;
      ui.hands.classList.toggle('on', handsfree);
      if (handsfree) startListening(); else stopListening();
    });
    ui.mute.addEventListener('click', () => {
      muted = !muted;
      store.set('tornado_muted', muted ? '1' : '0');
      if (muted) stopSpeaking();
      applyLang();
    });
    ui.lang.addEventListener('change', () => {
      lang = ui.lang.value;
      store.set('tornado_lang', lang);
      stopListening();
      applyLang();
    });
    ui.tourSkip.addEventListener('click', () => { stopSpeaking(); if (skipResolve) skipResolve(); });
    ui.tourStop.addEventListener('click', () => { stopTour(false); openPanel(); });
    ui.form.addEventListener('submit', submitForm);
    ui.fCancel.addEventListener('click', () => ui.form.classList.add('hidden'));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (tourRunning) { stopTour(false); openPanel(); }
        else if (!ui.panel.classList.contains('hidden')) closePanel();
        else stopSpeaking();
      }
    });

    watchSections();
    if (AUTOGREET) {
      setTimeout(showBubble, 1200);
      armVoiceGreeting();
    }
  }

  window.Tornado = {
    open: () => openPanel(),
    close: () => closePanel(),
    ask: (q) => send(q),
    say: (text, l) => { openPanel(); addMsg('bot', text); return speak(text, l || lang); },
    sayVoice: (text, l) => { return speak(text, l || lang); },
    startTour: () => startTour(),
    stopTour: () => { stopTour(false); openPanel(); },
    setLang: (l) => { if (I18N[l]) { lang = l; store.set('tornado_lang', l); applyLang(); } },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
