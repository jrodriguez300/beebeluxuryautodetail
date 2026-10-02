/* The Beebe Luxury Auto Detail booking chat (scripted template, facts from SITE.md / GBP.md / PROFILE.md). No dependencies, no network: the finished request goes to
   the shop as a pre-filled text (sms:), call or email. window.TQChat.open()/.close(); [data-tq-chat] opens it. */
(() => {
  'use strict';
  if (window.TQChat) return;

  const TEL = '+18037450169', MAIL = 'kewan@beebeluxuryautodetail.com';
  const SRC = document.currentScript && document.currentScript.src;
  const ICON = SRC ? new URL('../img/logo.png?v=1', SRC).href : 'img/logo.png';
  const KEY = 'blc-state', GREET_KEY = 'blc-greeted';
  const GREETING = 'Hey 👋 Welcome to Beebe Luxury Auto Detail. Want a quote or to book a spot?';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const phoneMQ = matchMedia('(max-width: 860px)');
  // iPadOS reports itself as a Mac; iOS wants sms:NUMBER&body=, everyone else ?body=
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const ss = (fn) => { try { return fn(sessionStorage); } catch (e) { return null; } };

  // ---- facts (beebeluxuryautodetail.com + Urable catalog + Google + IG). Nothing outside this block is claimed. ----
  const SVC = {
    ppf: { name: 'Paint Protection Film (PPF)', label: 'Coverage',
      intro: "Invisible shield for your car's protection: self-healing film against rock chips, scratches and everyday wear. Essential $350, Full Frontal from $1,800, Track Package from $2,400, Full Body from $5,800.",
      ask: 'How much coverage?', chips: ['Essential (door cups, B-pillars, edges)', 'Full Frontal', 'Track Package', 'Full Body', 'Not sure'] },
    cer: { name: 'Ceramic coating', label: 'Package',
      intro: 'Certified System X Installers. Level 1 (3 year) $999, Level 2 (5–7 year, multi-layer) $1,350, Level 3 (10 year) $1,700, paint correction included. Afterpay available.',
      ask: 'Which level sounds right?', chips: ['Level 1 · 3 year', 'Level 2 · 5–7 year', 'Level 3 · 10 year', 'Not sure'] },
    pc: { name: 'Paint correction', label: 'Condition',
      intro: '1-Step removes light swirls and oxidation; 2-Step removes moderate to heavy swirls, oxidation and surface defects. Included in every ceramic level; Machine Polish on its own is $150.',
      ask: 'Light swirls, or does it need the heavier cut?', chips: ['Light swirls', 'Heavy swirls / scratches', 'Not sure'] },
    tint: { name: 'Window tint', label: 'Windows',
      intro: 'Professional window tinting: reduces glare, increases privacy and provides UV protection for a cooler, safer ride. Quoted per vehicle.',
      ask: 'Which windows?', chips: ['All windows', 'Front two', 'Not sure'] },
    mob: { name: 'Mobile detailing', label: 'Where',
      intro: 'Bringing Luxury to Your Doorstep: the fully equipped mobile unit comes to your home or office with the same premium results as the shop.',
      ask: 'Home, office, or drop off at the shop?', chips: ['Home', 'Office', 'Drop off at the shop'] },
    q: { name: 'Question', chip: 'Just a question', label: 'Question' },
  };
  const ASK = {
    car: ['What are you driving? (year, make, model)', ['Sedan', 'SUV / truck', 'Sports car', 'Other']],
    when: ['When would you like to bring it in?', ['This week', 'Next week', 'Saturday', 'Pick a date']],
    q: ["Sure, what's your question?", []],
    name: ["What's your name?", []],
    phone: ['And a mobile number the shop can text back?', []],
    notes: ['Anything else the shop should know? (optional)', ['Skip']],
  };
  const PRICE = {
    ppf: 'PPF: Essential $350, Full Frontal from $1,800, Track Package from $2,400, Full Body from $5,800 (by vehicle size). Send the year, make and model and Kewan texts you the exact number.',
    cer: 'Ceramic: Level 1 $999, Level 2 $1,350, Level 3 $1,700, paint correction included. Afterpay available.',
    pc: 'Paint correction is inside every ceramic level (1-Step in Level 1, 2-Step in Levels 2 and 3). Machine Polish on its own is $150.',
    tint: 'Window tint is quoted per vehicle. Send the year, make and model and Kewan texts you a price.',
    mob: 'Mobile detailing: Elite Detail Package from $600, VIP Maintenance $750 for 6 months or $1,200 a year, Black Card Membership $2,800 for 6 months or $4,200 a year.',
  };
  const ALL_PRICES = 'Ceramic from $999, PPF from $350, Black Card Membership from $2,800; tint and detailing are quoted per vehicle. Send the details and Kewan texts you a price.';
  const svcIn = (t) => /ppf|protection film|clear bra|rock chip/.test(t) ? 'ppf' : /ceramic coat|coating|system x/.test(t) ? 'cer'
    : /correct|polish|swirl|scratch/.test(t) ? 'pc' : /mobile|come to me|my house|doorstep|detail/.test(t) ? 'mob'
    : /tint|film|window/.test(t) ? 'tint' : '';
  const cur = () => (st.svc !== 'q' ? st.svc : '');
  const WARRANTY = 'PPF installs come with a manufacturer-backed warranty and are uploaded to Carfax. Ask Kewan for the coating warranty details when he quotes.';
  const PRICE_RE = /price|cost|how much|\$|pricing|quote|charge/;
  const INTENTS = [
    [/warrant|guarantee|carfax/, () => WARRANTY],
    [/black card|membership|vip|maintenance plan/, () => 'Black Card Membership: on-call priority, up to 4 maintenance appointments a month, polishing included, white-glove mobile service, priority scheduling. $2,800 for 6 months or $4,200 a year. VIP Maintenance is $750 for 6 months or $1,200 a year.'],
    [/afterpay|financ|payment|pay (in|with)|credit card/, () => 'Afterpay is available on the ceramic and PPF packages; credit and debit cards are accepted.'],
    [PRICE_RE, (t) => PRICE[svcIn(t) || cur()] || ALL_PRICES],
    [/business|since when|experience|reviews?|rating|how long (have|has)|certif/, () => 'Certified PPF and ceramic coating installer, 5.0 stars on Google across 174 reviews, and a Columbia Regional Business Report Forty Under 40 honoree.'],
    [/how long|how many (days|hours)|turnaround|durab|\blast\b/, (t) => {
      const s = svcIn(t) || cur();
      if (/\blast|durab/.test(t)) return s === 'cer' ? 'Level 1 lasts 3 years, Level 2 5 to 7 years, Level 3 up to 10 years.' : s === 'ppf' ? 'The film resists yellowing, staining and UV damage, and minor surface scratches disappear with heat.' : 'Kewan covers that when he quotes.';
      return s === 'cer' ? 'Levels 1 and 2 take about 6 hours, Level 3 about 48 hours. Kewan confirms timing when he quotes.' : s === 'ppf' ? 'Essential about 1 hour, Full Frontal about 48 hours, Full Body about 120 hours. Kewan confirms timing when he quotes.' : 'Kewan confirms timing when he quotes.';
    }],
    [/book|schedule|appointment|availab/, () => 'Book online at app.urable.com (Services & Availability on the site), or text (803) 745-0169. Appointment required.'],
    [/mobile|come to me|my house|travel|on site|onsite|doorstep/, () => SVC.mob.intro],
    [/(your|of|past|previous) work|portfolio|gallery|instagram|before and after|examples?/, () => 'See the work on Instagram @beebe_luxuryautodetail and in the gallery on this page.'],
    [/\bwhere\b|locat|address|directions/, () => '1736 W Main St, Lexington, SC 29072. Call or text (803) 745-0169 if you need directions.'],
    [/hours|open|close|weekend|saturday|sunday/, () => 'Monday to Friday 8:30 am to 6 pm, Saturday 10 am to 5 pm, closed Sunday.'],
    [/system x|brand|material|what (film|coating)|which (film|coating)/, () => 'Ceramic coatings are System X: Beebe is a Certified System X Installer.'],
    [/shade|percent|%|darkest|legal|limo/, () => 'Kewan walks you through the shades and the South Carolina limits, and respects the percentage you want.'],
    [/ppf|protection film|clear bra|rock chip/, () => SVC.ppf.intro],
    [/ceramic coat|coating/, () => SVC.cer.intro],
    [/correct|polish|swirl|scratch|oxid/, () => SVC.pc.intro],
    [/tint|film|window/, () => SVC.tint.intro],
    [/detail/, () => SVC.mob.intro],
    [/phone|call|email|instagram|contact|number/, () => 'Call or text (803) 745-0169, email kewan@beebeluxuryautodetail.com, or DM @beebe_luxuryautodetail on Instagram.'],
    [/^(hi|hey|hello|yo|good (morning|afternoon|evening))\b/, () => 'Hey! Happy to help with a quote or a booking.'],
    [/thank/, () => "You're welcome!"],
  ];
  const intent = (raw) => { const t = raw.toLowerCase(); for (const [re, fn] of INTENTS) if (re.test(t)) return fn(t); return ''; };
  const isQ = (t) => /\?\s*$/.test(t) || /^(how|what|where|when|do|does|can|could|is|are|which|why|who|will|would)\b/i.test(t);
  const isSkip = (t) => /^(skip|no|nah|none|nope|nothing|n\/a|no thanks?|that'?s it|all good)[.!]*$/i.test(t);
  // email on a mouse-driven computer (no sms: handler there), text everywhere else
  const desk = () => !isIOS && matchMedia('(hover:hover) and (pointer:fine)').matches;

  function normPhone(t) {
    if (/[a-z]/i.test(t)) return '';
    let d = t.replace(/\D/g, '');
    if (d.length === 11 && d[0] === '1') d = d.slice(1);
    if (d.length !== 10 || /^[01]/.test(d) || /^\d{3}[01]/.test(d)) return '';   // NANP: area + exchange start 2-9
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };

  // ---- state (sessionStorage so a reload restores the conversation) ----
  const STEPS = ['start', 'car', 'detail', 'when', 'q', 'name', 'phone', 'notes', 'sum', 'sent'];
  // q = bot lines still queued, so a reload mid-reply finishes the reply on the next open
  const fresh = () => ({ step: 'start', svc: '', car: '', detail: '', when: '', name: '', phone: '', notes: '', pick: 0, log: [], q: [] });
  let st = fresh();
  const saved = ss((s) => JSON.parse(s.getItem(KEY) || 'null'));
  if (saved && Array.isArray(saved.log) && Array.isArray(saved.q || []) && STEPS.includes(saved.step) && (!saved.svc || SVC[saved.svc])) st = Object.assign(fresh(), saved);
  const save = () => ss((s) => s.setItem(KEY, JSON.stringify(st)));

  const rows = () => {
    const s = SVC[st.svc];
    return [['Service', s.name], ['Car', st.car], [s.label, st.detail], ['When', st.when],
      ['Name', st.name], ['Phone', st.phone], ['Notes', st.notes]].filter((r) => r[1]);
  };
  const body = () => {
    const r = rows();
    return ['New request from beebeluxuryautodetail.com — ' + r[0][1], ...r.slice(1).map(([k, v]) => k + ': ' + v)].join('\n');
  };
  const smsHref = (b) => 'sms:' + TEL + (b ? (isIOS ? '&' : '?') + 'body=' + encodeURIComponent(b) : '');
  const mailHref = () => 'mailto:' + MAIL + '?subject=' + encodeURIComponent('Quote request: ' + SVC[st.svc].name) +
    '&body=' + encodeURIComponent(body());

  // ---- DOM ----
  const ico = (d, w) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const X = ico('M18 6 6 18M6 6l12 12', 20);
  const root = document.createElement('div');
  root.className = 'dhc';
  root.innerHTML =
    `<div class="dhc-bubble" hidden><button type="button" class="dhc-bubble__t">Want a quote on PPF, ceramic or tint? Ask here.</button>` +
    `<button type="button" class="dhc-x" aria-label="Dismiss">${X}</button></div>` +
    `<button type="button" class="dhc-pill" tabindex="-1" aria-hidden="true">Get a quote</button>` +
    `<button type="button" class="dhc-launch" aria-label="Chat with Beebe Luxury Auto Detail" aria-haspopup="dialog" aria-expanded="false" aria-controls="dhc-panel">` +
    ico('M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z', 26) + `</button>` +
    `<div class="dhc-panel" id="dhc-panel" role="dialog" aria-modal="true" aria-label="Chat with Beebe Luxury Auto Detail" tabindex="-1" hidden>` +
      `<div class="dhc-head"><img src="${ICON}" alt="" width="40" height="40">` +
        `<div class="dhc-title"><strong>Beebe Luxury Auto Detail</strong><span>PPF · Paint correction · Ceramic · Tint — Lexington, SC</span></div>` +
        `<button type="button" class="dhc-restart">Start over</button>` +
        `<button type="button" class="dhc-x dhc-close" aria-label="Close chat">${X}</button></div>` +
      `<div class="dhc-scroll"><div class="dhc-log" aria-live="polite"></div>` +
        `<div class="dhc-typing" aria-hidden="true" hidden><i></i><i></i><i></i></div>` +
        `<div class="dhc-ctrl" role="group" aria-label="Quick replies"></div></div>` +
      `<form class="dhc-form" autocomplete="off"><input class="dhc-input" maxlength="300" aria-label="Type a message" enterkeyhint="send">` +
        `<button class="dhc-send" type="submit" aria-label="Send">${ico('M12 19V5M5 12l7-7 7 7', 20)}</button></form>` +
    `</div>`;
  const $ = (s) => root.querySelector(s);
  const bubble = $('.dhc-bubble'), pill = $('.dhc-pill'), launch = $('.dhc-launch'), panel = $('.dhc-panel');
  const scroller = $('.dhc-scroll'), log = $('.dhc-log'), typing = $('.dhc-typing'), ctrl = $('.dhc-ctrl');
  const form = $('.dhc-form'), input = $('.dhc-input'), send = $('.dhc-send');

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const chip = (label, fn, cls) => { const b = el('button', 'dhc-chip ' + (cls || ''), label); b.type = 'button'; b.addEventListener('click', fn); return b; };
  const link = (label, href, cls, fn) => {
    const a = el('a', 'dhc-chip ' + (cls || ''), label); a.href = href;
    if (fn) a.addEventListener('click', fn);
    return a;
  };
  const scrollEnd = () => { scroller.scrollTop = scroller.scrollHeight; };

  function draw(m) {
    const d = el('div', 'dhc-msg ' + (m.b ? 'dhc-bot' : 'dhc-me'));
    if (m.card) {
      d.classList.add('dhc-card');
      const dl = el('dl');
      m.card.forEach(([k, v]) => { dl.appendChild(el('dt', '', k)); dl.appendChild(el('dd', '', v)); });
      d.appendChild(dl);
    } else d.textContent = m.t;
    if (m.links) {
      const r = el('div', 'dhc-links');
      r.append(link('Call', 'tel:' + TEL), link('Text', smsHref('')));
      d.appendChild(r);
    }
    log.appendChild(d);
  }
  const push = (m) => { st.log.push(m); draw(m); save(); scrollEnd(); };

  // bot lines go out one by one behind a short typing indicator; `gen` cancels a queue on restart
  let busy = false, gen = 0, isOpen = false;
  function bot(...msgs) {
    const g = gen;
    st.q = msgs; save();   // msgs.shift() below shrinks st.q too, and push() saves it
    busy = true; controls();
    const step = () => {
      if (g !== gen) return;
      if (!msgs.length) {
        busy = false; typing.hidden = true; save(); controls();
        const a = document.activeElement;
        // a tapped chip is gone now: phones land on the next chip (no keyboard pop), desktop on the input
        if (isOpen && (!panel.contains(a) || a === panel)) (phoneMQ.matches ? ctrl.querySelector('button, a') || panel : input).focus({ preventScroll: true });
        return scrollEnd();
      }
      typing.hidden = false; scrollEnd();
      setTimeout(() => {
        if (g !== gen) return;
        typing.hidden = true;
        const m = msgs.shift();
        push(typeof m === 'string' ? { b: 1, t: m } : Object.assign({ b: 1 }, m));
        step();
      }, reduce.matches ? 0 : 520 + Math.random() * 160);
    };
    step();
  }
  const me = (t) => push({ t });
  const askFor = (step) => (step === 'detail' ? [SVC[st.svc].ask, SVC[st.svc].chips] : ASK[step]);

  function pick(k, lead) {
    Object.assign(st, { svc: k, car: '', detail: '', when: '', notes: '', pick: 0, step: k === 'q' ? 'q' : 'car' });
    bot(...[lead || SVC[k].intro, askFor(st.step)[0]].filter(Boolean));
  }
  function next(step) {
    st.step = step;
    if (step === 'sum') return bot('Here’s your request:', { card: rows() },
      'Tap “Send request by ' + (desk() ? 'email” and your email app' : 'text” and your messages app') + ' opens with it all filled in.');
    bot(askFor(step)[0]);
  }
  function sent(mail) {
    const g = gen;
    setTimeout(() => {   // after the sms:/mailto: link has fired
      if (g !== gen || st.step !== 'sum') return;
      st.step = 'sent';
      bot(`Your ${mail ? 'email' : 'messages'} app should be open with everything filled in. Just hit send, and the shop will text you back to confirm the time.` +
        (mail ? ' Nothing opened? Call or text (803) 745-0169.' : ''), 'You can also call or text (803) 745-0169 any time.');
    }, 300);
  }
  function restart() {
    gen++; busy = false; typing.hidden = true;
    st = fresh(); log.textContent = ''; save();
    bot(GREETING);
  }

  function onText(raw, fromChip) {
    const t = raw.replace(/\s+/g, ' ').trim().slice(0, 300), lc = t.toLowerCase();
    if (!t || busy) return;
    me(t);
    const step = st.step, s = svcIn(lc), q = isQ(t);
    const collecting = ['car', 'detail', 'when', 'name', 'phone'].includes(step);
    if (!fromChip && step === 'start') {
      if (s && (!q || PRICE_RE.test(lc))) return pick(s, q && intent(t));   // "quote on tint?" starts the tint quote
      if (/\bquestions?\b|\bask\b/.test(lc) && !intent(t)) return pick('q');
    }
    // "Will" is a name, not a question: on name/phone only a trailing "?" counts
    const asks = step === 'name' || step === 'phone' ? /\?\s*$/.test(t) : q;
    if (!fromChip && (collecting ? asks : !['q', 'notes'].includes(step))) {
      const a = intent(t);
      const more = collecting ? ['Back to your quote. ' + askFor(step)[0]]
        : step === 'start' ? ['Pick a service below to get a quote, or ask away.'] : [];
      if (a || asks) return bot(a || { t: 'Good question — the team can answer that directly.', links: 1 }, ...more);
      return bot(step === 'sent' ? 'Thanks! The shop will reach out to confirm the time.'
        : step === 'sum' ? 'Got it. Tap a button below to send it, or type a question.' : 'Got it. Pick a service below, or type a question.');
    }
    switch (step) {
      case 'car':
        if (fromChip && t === 'Other') return bot('No problem. Type the year, make and model.');
        if (t.length < 2 || t.length > 60) return bot('Just the year, make and model works, like 2024 Porsche 911.');
        st.car = t; return next(SVC[st.svc].ask ? 'detail' : 'when');
      // only chrome delete's detail is optional ("No thanks" is a real answer to the windshield add-on)
      case 'detail': st.detail = st.svc === 'chr' && isSkip(t) ? '' : t.slice(0, 80); return next('when');
      case 'when': st.when = t.slice(0, 60); st.pick = 0; return next('name');
      case 'q': st.detail = t; return next('name');
      case 'name':
        if (t.length > 40) return bot('Just a first name is fine.');
        st.name = t; return next('phone');
      case 'phone': {
        const p = normPhone(t);
        if (!p) return bot("Hmm, that doesn't look like a US mobile number. Try it like (803) 555-0123.");
        st.phone = p; return next(st.svc === 'q' ? 'sum' : 'notes');
      }
      case 'notes': st.notes = isSkip(t) ? '' : t; return next('sum');
    }
  }

  function controls() {
    ctrl.textContent = '';
    ctrl.classList.toggle('dhc-ctrl--stack', st.step === 'sum' || st.step === 'sent');
    send.disabled = busy;
    const s = st.step, add = (n) => ctrl.appendChild(n);
    const I = { phone: ['tel', 'tel', '(803) 555-0123'], name: ['text', 'given-name', 'Your name'],
      car: ['text', 'off', 'Year, make and model'] }[s] || ['text', 'off', 'Type a message…'];
    if (input.type !== I[0]) input.type = I[0];
    input.autocomplete = I[1]; input.placeholder = I[2];
    if (busy) return;
    if (s === 'start') {
      Object.keys(SVC).forEach((k) => { const l = SVC[k].chip || SVC[k].name; add(chip(l, () => { if (!busy) { me(l); pick(k); } })); });
    } else if (s === 'sum' || s === 'sent') {
      const m = desk(), p = m ? ['email', mailHref(), 'Text instead', smsHref(body())] : ['text', smsHref(body()), 'Email instead', mailHref()];
      add(link(s === 'sum' ? 'Send request by ' + p[0] : `Open the ${p[0]} again`, p[1], 'dhc-primary', () => sent(m)));
      add(link('Call instead', 'tel:' + TEL));
      add(link(p[2], p[3]));
      add(chip(s === 'sum' ? 'Edit' : 'Start over', restart));
    } else if (s === 'when' && st.pick) {
      const d = el('input', 'dhc-date'); d.type = 'date'; d.min = today(); d.setAttribute('aria-label', 'Preferred date');
      add(d);
      add(chip('Use this date', () => {
        if (!d.value || d.value < d.min) return d.focus();
        const [y, m, dd] = d.value.split('-').map(Number);
        onText(new Date(y, m - 1, dd).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), 1);
      }, 'dhc-primary'));
      add(chip('Back', () => { st.pick = 0; save(); controls(); ctrl.querySelector('button').focus(); }));
    } else {
      (askFor(s) || [0, []])[1].forEach((c) => add(chip(c, s === 'when' && c === 'Pick a date'
        ? () => { st.pick = 1; save(); controls(); ctrl.querySelector('input').focus(); }
        : () => onText(c, 1))));
    }
  }

  // ---- open / close ----
  let opener = null, lockY = 0, pushed = false;
  const html = document.documentElement;
  // Phones: size the sheet to the visual viewport so the on-screen keyboard never hides the input.
  function fit() {
    const v = window.visualViewport, on = isOpen && phoneMQ.matches && v;
    panel.style.top = on ? v.offsetTop + 'px' : '';
    panel.style.height = on ? v.height + 'px' : '';
    panel.style.bottom = on ? 'auto' : '';
  }
  function open(from) {
    if (isOpen) return;
    isOpen = true; opener = from && from.focus ? from : launch;
    hideBubble();
    root.classList.add('dhc-is-open'); panel.hidden = false; launch.setAttribute('aria-expanded', 'true');
    // overflow:hidden keeps scrollY where it is, so the film does not scrub under the sheet.
    // The full-screen sheet gets its own history entry so Android Back closes it instead of leaving the site.
    if (phoneMQ.matches) { lockY = window.scrollY; html.classList.add('dhc-lock'); history.pushState({ dhc: 1 }, ''); pushed = true; }
    fit();
    if (!st.log.length) bot(GREETING);
    else if (!busy && st.q.length) bot(...st.q);   // reloaded mid-reply
    (phoneMQ.matches ? panel : input).focus({ preventScroll: true });
    scrollEnd();
  }
  function close(fromBack) {
    if (!isOpen) return;
    isOpen = false;
    panel.hidden = true; root.classList.remove('dhc-is-open'); launch.setAttribute('aria-expanded', 'false');
    if (html.classList.contains('dhc-lock')) {
      html.classList.remove('dhc-lock');
      if (Math.abs(window.scrollY - lockY) > 1) window.scrollTo(0, lockY);
    }
    if (pushed) { pushed = false; if (fromBack !== true) history.back(); }
    fit();
    (opener && opener.isConnected ? opener : launch).focus({ preventScroll: true });
    queue();
  }

  // ---- greeting bubble: once per session, ~6 s in ----
  function hideBubble() { bubble.hidden = true; ss((s) => s.setItem(GREET_KEY, '1')); }
  setTimeout(() => {
    if (isOpen || st.log.length > 1 || ss((s) => s.getItem(GREET_KEY)) === '1') return;
    bubble.hidden = false; ss((s) => s.setItem(GREET_KEY, '1')); queue();
  }, 6000);

  // ---- keep the launcher, pill and bubble off the page's copy and buttons ----
  // the shop card scrolls under the fixed launcher: check real rects live, fade whatever overlaps
  const AVOID = '.sw-copy, .sw-topcta, .sw-route, .sw-hint, .dh a, .dh button';
  const hit = (a, b) => a.width && b.width && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  let raf = 0, bubbleT = 0;
  function dodge() {
    raf = 0;
    if (isOpen) return;
    const rects = [...document.querySelectorAll(AVOID)]
      // the engine's inline opacity is the target value (the hint also CSS-transitions toward it)
      .filter((n) => +(n.style.opacity || getComputedStyle(n).opacity) > 0.05).map((n) => n.getBoundingClientRect());
    [launch, pill, bubble].forEach((n) => {
      const r = n.getBoundingClientRect();
      n.classList.toggle('dhc-dodge', rects.some((o) => hit(r, o)));
    });
    // the greeting bows out ~10 s after it is actually seen (on phones it can start out dodged)
    if (!bubble.hidden && !bubbleT && !bubble.classList.contains('dhc-dodge')) bubbleT = setTimeout(() => { bubble.hidden = true; }, 10000);
  }
  const queue = () => { if (!raf) raf = requestAnimationFrame(dodge); };

  // ---- wiring ----
  launch.addEventListener('click', () => open(launch));
  pill.addEventListener('click', () => open(launch));
  $('.dhc-bubble__t').addEventListener('click', () => open(launch));
  bubble.querySelector('.dhc-x').addEventListener('click', () => { hideBubble(); launch.focus({ preventScroll: true }); });
  $('.dhc-close').addEventListener('click', close);
  $('.dhc-restart').addEventListener('click', restart);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (busy || !input.value.trim()) return;
    const v = input.value; input.value = '';
    onText(v);
  });
  // on the document, not the panel: a click on the page behind the desktop card must not break Escape/Tab
  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); return close(); }
    if (e.key !== 'Tab') return;
    const f = [...panel.querySelectorAll('button, a[href], input')].filter((n) => !n.disabled && n.getClientRects().length);
    const a = document.activeElement, first = f[0], last = f[f.length - 1];
    if (!panel.contains(a)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && (a === first || a === panel)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  });
  addEventListener('popstate', () => { if (isOpen) close(true); });
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-tq-chat]');
    if (t) { e.preventDefault(); open(t); }
  });
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', () => { queue(); fit(); });
  if (window.visualViewport) { visualViewport.addEventListener('resize', fit); visualViewport.addEventListener('scroll', fit); }

  const css = `
.dhc [hidden]{display:none!important}
button.btn[data-tq-chat]{box-sizing:content-box;font-family:inherit;line-height:inherit;letter-spacing:inherit;margin:0;background:transparent;cursor:pointer;-webkit-appearance:none;appearance:none}
html.dhc-lock,html.dhc-lock body{overflow:hidden}
.dhc :focus-visible{outline:2px solid #fff;outline-offset:2px}
.dhc .dhc-input:focus-visible{outline:none}
.dhc-launch,.dhc-pill,.dhc-bubble{position:fixed;z-index:82;transition:opacity .2s,visibility 0s,transform .2s}
.dhc-dodge,.dhc-is-open .dhc-launch,.dhc-is-open .dhc-pill,.dhc-is-open .dhc-bubble{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .2s,visibility 0s .2s,transform .2s}
.dhc-launch{right:20px;bottom:calc(20px + env(safe-area-inset-bottom,0px));width:56px;height:56px;padding:0;border:0;border-radius:50%;cursor:pointer;color:#fff;display:grid;place-items:center;background:linear-gradient(135deg,#00E8DA,#0038FF);box-shadow:0 8px 24px rgba(0,232,218,.35),0 2px 8px rgba(0,0,0,.5)}
.dhc-launch svg{width:46%;height:46%}
.dhc-pill{right:86px;bottom:calc(30px + env(safe-area-inset-bottom,0px));height:36px;padding:0 15px;border-radius:999px;border:1px solid #23232a;background:rgba(19,19,23,.92);color:#fff;font:700 .8rem/1 'Syne',system-ui,sans-serif;letter-spacing:.02em;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.45)}
.dhc-pill::after{content:"";position:absolute;inset:-4px 0}
.dhc-bubble{right:20px;bottom:calc(88px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;max-width:280px;background:#131317;border:1px solid #23232a;border-radius:16px;box-shadow:0 12px 30px rgba(0,0,0,.5);animation:dhc-pop .3s ease-out}
.dhc-bubble__t{flex:1;min-height:44px;padding:8px 2px 8px 14px;background:none;border:0;color:#fff;text-align:left;font:500 .88rem/1.35 'Inter',system-ui,sans-serif;cursor:pointer}
.dhc-x{flex:none;width:44px;height:44px;display:grid;place-items:center;padding:0;background:none;border:0;border-radius:12px;color:#a9abb2;cursor:pointer}
.dhc-panel{position:fixed;z-index:90;right:20px;bottom:calc(20px + env(safe-area-inset-bottom,0px));width:380px;height:580px;max-height:calc(100vh - 40px);max-height:calc(100dvh - 40px);display:flex;flex-direction:column;overflow:hidden;background:#0b0b0d;color:#fff;border:1px solid #23232a;border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.6);font:400 15px/1.45 'Inter',system-ui,-apple-system,sans-serif;text-align:left;letter-spacing:normal;outline:none;animation:dhc-pop .22s cubic-bezier(.2,.8,.2,1)}
@keyframes dhc-pop{from{opacity:0;transform:translateY(10px) scale(.98)}}
.dhc-head{display:flex;align-items:center;gap:10px;padding:8px 6px 8px 14px;background:#131317;border-bottom:1px solid #23232a}
.dhc-head img{flex:none;width:40px;height:40px;object-fit:contain}
.dhc-title{flex:1;min-width:0}
.dhc-title strong{display:block;font:800 1rem/1.2 'Syne',system-ui,sans-serif}
.dhc-title span{display:block;font-size:.72rem;line-height:1.3;color:#a9abb2}
.dhc-restart{flex:none;min-height:44px;padding:0 8px;background:none;border:0;border-radius:10px;color:#a9abb2;font:600 .78rem 'Inter',system-ui,sans-serif;cursor:pointer}
.dhc-close{color:#fff}
.dhc-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:16px 14px 10px}
.dhc-log{display:flex;flex-direction:column;gap:8px}
.dhc-msg{max-width:86%;padding:10px 14px;border-radius:18px;overflow-wrap:anywhere;white-space:pre-wrap}
.dhc-bot{align-self:flex-start;background:#131317;border:1px solid #23232a;border-bottom-left-radius:6px}
.dhc-me{align-self:flex-end;background:#0038FF;border-bottom-right-radius:6px}
.dhc-card{width:86%;white-space:normal}
.dhc-card dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:6px 12px}
.dhc-card dt{color:#a9abb2;font-size:.8rem;padding-top:1px}
.dhc-card dd{margin:0;font-weight:600;min-width:0}
.dhc-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.dhc-typing{display:inline-flex;gap:4px;margin-top:8px;padding:14px 16px;background:#131317;border:1px solid #23232a;border-radius:18px 18px 18px 6px}
.dhc-typing i{width:7px;height:7px;border-radius:50%;background:#a9abb2;animation:dhc-dot 1s infinite}
.dhc-typing i:nth-child(2){animation-delay:.15s}.dhc-typing i:nth-child(3){animation-delay:.3s}
@keyframes dhc-dot{0%,60%,100%{opacity:.3;transform:none}30%{opacity:1;transform:translateY(-3px)}}
.dhc-ctrl{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;padding-top:12px}
.dhc-ctrl:empty{display:none}
.dhc-ctrl--stack{flex-direction:column;align-items:stretch}
.dhc-chip{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 16px;border:1.5px solid #3a3a42;border-radius:999px;background:transparent;color:#fff;font:600 .9rem/1.2 'Inter',system-ui,sans-serif;text-align:center;text-decoration:none;cursor:pointer;transition:border-color .15s,background .15s}
.dhc-primary{border:0;color:#03110f;background:#00E8DA;box-shadow:0 0 16px rgba(0,232,218,.35)}
.dhc-date{flex:1 1 100%;min-height:44px;padding:0 12px;border:1px solid #23232a;border-radius:12px;background:#131317;color:#fff;color-scheme:dark;font:16px 'Inter',system-ui,sans-serif}
.dhc-form{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #23232a}
.dhc-input{flex:1;min-width:0;min-height:44px;padding:0 16px;border:1px solid #23232a;border-radius:999px;background:#131317;color:#fff;font:16px/1.2 'Inter',system-ui,sans-serif;outline:none}
.dhc-input:focus{border-color:#00E8DA}
.dhc-input::placeholder{color:#6c6e75}
.dhc-send{flex:none;width:44px;height:44px;display:grid;place-items:center;padding:0;border:0;border-radius:50%;background:linear-gradient(135deg,#00E8DA,#0038FF);color:#fff;cursor:pointer}
.dhc-send:disabled{opacity:.45;cursor:default}
@media (hover:hover){
  .dhc-launch:hover{transform:translateY(-2px)}
  .dhc-x:hover,.dhc-restart:hover{color:#fff}
  .dhc-chip:hover{border-color:#00E8DA;background:rgba(0,232,218,.1)}
  .dhc-primary:hover{background:#4ff2e8}
}
@media (max-width:860px){
  .dhc{--dhc-s:56px;--dhc-b:14px}
  @supports (height:1dvh){
    /* phone copy sits at clamp(56px,12dvh,110px) and drifts down up to 2vh as it enters: stay under that floor */
    .dhc{--dhc-floor:calc(clamp(56px,12dvh,110px) - 2vh);--dhc-s:clamp(44px,calc(var(--dhc-floor) - 22px),56px);--dhc-b:clamp(4px,calc(var(--dhc-floor) - var(--dhc-s) - 6px),14px)}
  }
  .dhc-launch{right:14px;width:var(--dhc-s);height:var(--dhc-s);bottom:calc(var(--dhc-b) + env(safe-area-inset-bottom,0px))}
  .dhc-pill{display:none}
  .dhc-bubble{right:calc(24px + var(--dhc-s));bottom:calc(var(--dhc-b) + env(safe-area-inset-bottom,0px));max-width:calc(100vw - 38px - var(--dhc-s))}
  .dhc-bubble__t{padding:4px 2px 4px 12px;font-size:.8rem}
  .dhc-panel{inset:0;width:auto;height:auto;max-height:none;border:0;border-radius:0;box-shadow:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) 0 env(safe-area-inset-left,0px)}
  .dhc-form{padding-bottom:calc(10px + env(safe-area-inset-bottom,0px))}
}
@media (max-width:380px){
  .dhc-head{gap:6px;padding-left:10px}
  .dhc-head img{width:32px;height:32px}
  .dhc-title strong{font-size:.95rem}
  .dhc-title span{display:none}
  .dhc-restart{padding:0 4px}
}
@media (prefers-reduced-motion:reduce){
  .dhc-panel,.dhc-bubble{animation:none}
  .dhc-typing i{animation:none;opacity:.7}
  .dhc-launch,.dhc-pill,.dhc-bubble,.dhc-chip{transition:none}
}`;
  const style = el('style'); style.id = 'dhc-css'; style.textContent = css;
  document.head.appendChild(style);
  document.body.appendChild(root);
  st.log.forEach(draw);
  controls();
  queue();

  window.TQChat = { open: () => open(), close };
})();
