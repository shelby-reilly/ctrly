/* ─────────────────────────────────────────────────────────────────────────── *
 * CTRL+Y — Interactions & Animations
 * ─────────────────────────────────────────────────────────────────────────── */

'use strict';

/* ── UTILITY ──────────────────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = (a, b) => Math.random() * (b - a) + a;


/* ══════════════════════════════════════════════════════════════════════════ *
 * NAVIGATION — transparent → frosted on scroll
 * ══════════════════════════════════════════════════════════════════════════ */
(function initNav() {
  const nav = $('#nav');
  const toggle = $('.nav-toggle');
  const mobile = $('.nav-mobile');
  let isOpen = false;

  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toggle?.addEventListener('click', () => {
    isOpen = !isOpen;
    mobile?.classList.toggle('open', isOpen);
    const spans = $$('span', toggle);
    if (isOpen) {
      spans[0].style.cssText = 'transform:rotate(45deg) translate(4.5px,4.5px)';
      spans[1].style.opacity = '0';
      spans[2].style.cssText = 'transform:rotate(-45deg) translate(4.5px,-4.5px)';
    } else {
      spans.forEach(s => (s.style.cssText = ''));
    }
  });

  $$('.nav-mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      isOpen = false;
      mobile?.classList.remove('open');
      $$('span', toggle).forEach(s => (s.style.cssText = ''));
    });
  });
})();


/* ══════════════════════════════════════════════════════════════════════════ *
 * HERO CANVAS — operational grid + scanner + pings
 * ══════════════════════════════════════════════════════════════════════════ */
(function initHeroCanvas() {
  const canvas = $('#hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, nodes, mouse = { x: -999, y: -999 };
  const SPACING = 70;
  const NODE_RADIUS = 1.2;
  const MAX_DIST = 110;
  const pings = [];

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    buildNodes();
  }

  function buildNodes() {
    nodes = [];
    const cols = Math.ceil(W / SPACING) + 2;
    const rows = Math.ceil(H / SPACING) + 2;
    const offX = (W % SPACING) / 2;
    const offY = (H % SPACING) / 2;
    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        nodes.push({
          x: offX + c * SPACING,
          y: offY + r * SPACING,
          baseX: offX + c * SPACING,
          baseY: offY + r * SPACING,
          phase: rand(0, Math.PI * 2),
          speed: rand(0.003, 0.008),
          bright: rand(0.15, 0.55),
        });
      }
    }
  }

  function spawnPing() {
    if (pings.length > 5) return;
    pings.push({
      x: rand(W * 0.2, W * 0.8),
      y: rand(H * 0.2, H * 0.8),
      r: 0,
      maxR: rand(60, 140),
      alpha: 0.7,
      speed: rand(0.8, 1.6),
    });
  }

  let scanY = 0;
  let scanAlpha = 0;
  let scanDir = 1;
  let scanSpeed = 0.4;
  let t = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    t += 0.01;

    // Update nodes with subtle float
    nodes.forEach(n => {
      n.phase += n.speed;
      const dx = n.x - mouse.x;
      const dy = n.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const influence = Math.max(0, 1 - dist / 180);
      const push = influence * 18;
      n.x = lerp(n.x, n.baseX + (dx / (dist + 1)) * push, 0.05);
      n.y = lerp(n.y, n.baseY + (dy / (dist + 1)) * push, 0.05);
    });

    // Draw connections
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > MAX_DIST) continue;
        const alpha = (1 - d / MAX_DIST) * 0.07;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(107, 157, 200, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }

    // Draw nodes
    nodes.forEach(n => {
      const pulse = 0.5 + 0.5 * Math.sin(n.phase);
      const alpha = n.bright * (0.5 + 0.5 * pulse);
      ctx.beginPath();
      ctx.arc(n.x, n.y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(107, 157, 200, ${alpha})`;
      ctx.fill();
    });

    // Scan line
    scanY += scanSpeed * scanDir;
    if (scanY > H + 40) { scanY = -40; }
    const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
    scanGrad.addColorStop(0, 'rgba(107, 157, 200, 0)');
    scanGrad.addColorStop(0.5, 'rgba(107, 157, 200, 0.06)');
    scanGrad.addColorStop(1, 'rgba(107, 157, 200, 0)');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, scanY - 30, W, 60);

    // Pings
    for (let i = pings.length - 1; i >= 0; i--) {
      const p = pings[i];
      p.r += p.speed;
      p.alpha = 0.7 * (1 - p.r / p.maxR);
      if (p.alpha <= 0 || p.r >= p.maxR) { pings.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(107, 157, 200, ${p.alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      // Center dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(107, 157, 200, ${p.alpha * 2})`;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  // HUD coordinate counter
  function animateHudCoords() {
    const el = $('#hud-coords');
    if (!el) return;
    const coords = [
      '38.8951° N / 77.0369° W',
      '34.0522° N / 118.2437° W',
      '40.7128° N / 74.0060° W',
      '47.6062° N / 122.3321° W',
      '29.7604° N / 95.3698° W',
    ];
    let idx = 0;
    setInterval(() => {
      idx = (idx + 1) % coords.length;
      el.style.opacity = '0';
      setTimeout(() => {
        el.textContent = coords[idx];
        el.style.transition = 'opacity 0.4s';
        el.style.opacity = '0.9';
      }, 200);
    }, 4000);
  }

  window.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  window.addEventListener('mouseleave', () => { mouse.x = -999; mouse.y = -999; });

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  draw();
  animateHudCoords();

  setInterval(spawnPing, 2200);
  setTimeout(() => { spawnPing(); spawnPing(); }, 600);
})();


/* ══════════════════════════════════════════════════════════════════════════ *
 * CTA CANVAS — subtle radial grid
 * ══════════════════════════════════════════════════════════════════════════ */
(function initCtaCanvas() {
  const canvas = $('#cta-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, t = 0;

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    t += 0.005;

    // Radial rings
    const cx = W * 0.8, cy = H * 0.5;
    for (let i = 1; i <= 8; i++) {
      const r = i * 80 + Math.sin(t + i * 0.4) * 6;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(107, 157, 200, ${0.04 + (0.03 * (1 - i / 8))})`;
      ctx.lineWidth = 0.75;
      ctx.stroke();
    }

    // Rotating crosshair
    const rot = t * 0.3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(-200, 0); ctx.lineTo(200, 0);
    ctx.moveTo(0, -200); ctx.lineTo(0, 200);
    ctx.strokeStyle = 'rgba(107, 157, 200, 0.04)';
    ctx.lineWidth = 0.75;
    ctx.stroke();
    ctx.restore();

    requestAnimationFrame(draw);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  draw();
})();


/* ══════════════════════════════════════════════════════════════════════════ *
 * SCROLL REVEAL — IntersectionObserver
 * ══════════════════════════════════════════════════════════════════════════ */
(function initReveal() {
  const els = $$('.reveal');
  if (!els.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  els.forEach(el => io.observe(el));
})();


/* ══════════════════════════════════════════════════════════════════════════ *
 * COUNTER ANIMATION — stat numbers count up on scroll
 * ══════════════════════════════════════════════════════════════════════════ */
(function initCounters() {
  const counters = $$('[data-count]');
  if (!counters.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseInt(el.dataset.count, 10);
        const duration = 1600;
        const start = performance.now();
        io.unobserve(el);

        function tick(now) {
          const elapsed = now - start;
          const progress = clamp(elapsed / duration, 0, 1);
          // Ease out expo
          const eased = 1 - Math.pow(1 - progress, 4);
          el.textContent = Math.round(eased * target);
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach(c => io.observe(c));
})();


/* ══════════════════════════════════════════════════════════════════════════ *
 * SMOOTH ANCHOR SCROLL
 * ══════════════════════════════════════════════════════════════════════════ */
(function initSmoothScroll() {
  const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 68;
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id === '#') return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();


/* ══════════════════════════════════════════════════════════════════════════ *
 * PARALLAX — subtle depth on scroll
 * ══════════════════════════════════════════════════════════════════════════ */
(function initParallax() {
  const hero = $('#hero');
  if (!hero) return;
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        const sy = window.scrollY;
        const heroContent = $('.hero-content');
        const heroBadge = $('.hero-badge');
        if (heroContent && sy < window.innerHeight) {
          heroContent.style.transform = `translateY(${sy * 0.15}px)`;
          heroContent.style.opacity = `${1 - (sy / window.innerHeight) * 1.5}`;
        }
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
})();


/* ══════════════════════════════════════════════════════════════════════════ *
 * CARD TILT — 3D tilt on mouse move for work/cap cards
 * ══════════════════════════════════════════════════════════════════════════ */
(function initTilt() {
  const cards = $$('.work-card, .cap-card');
  const MAX_TILT = 6;

  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      const rx = -dy * MAX_TILT;
      const ry = dx * MAX_TILT;
      card.style.transform = `translateY(-3px) perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();


/* ══════════════════════════════════════════════════════════════════════════ *
 * HERO HEADLINE — staggered word reveal
 * ══════════════════════════════════════════════════════════════════════════ */
(function initHeroReveal() {
  // Trigger hero reveals immediately (they're above the fold)
  setTimeout(() => {
    $$('#hero .reveal').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 90);
    });
  }, 200);
})();


/* ══════════════════════════════════════════════════════════════════════════ *
 * NAV ACTIVE STATE — highlight current section in nav
 * ══════════════════════════════════════════════════════════════════════════ */
(function initNavActive() {
  const sections = $$('section[id]');
  const navLinks = $$('.nav-link');
  if (!sections.length || !navLinks.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const id = e.target.id;
        navLinks.forEach(link => {
          const href = link.getAttribute('href');
          if (href === `#${id}`) {
            link.style.color = 'var(--text-1)';
          } else {
            link.style.color = '';
          }
        });
      });
    },
    { threshold: 0.4 }
  );

  sections.forEach(s => io.observe(s));
})();


/* ══════════════════════════════════════════════════════════════════════════ *
 * IMAGE LAZY LOAD fallback — show placeholder tint if image fails
 * ══════════════════════════════════════════════════════════════════════════ */
(function initImageFallback() {
  $$('img[loading="lazy"]').forEach(img => {
    img.addEventListener('error', () => {
      img.style.background = 'rgba(107, 157, 200, 0.05)';
      img.style.minHeight = '100%';
    });
  });
})();


/* ══════════════════════════════════════════════════════════════════════════ *
 * CONTACT FORM — async submit via Formspree, show inline success state
 * ══════════════════════════════════════════════════════════════════════════ */
(function initContactForm() {
  const form = document.getElementById('contact-form');
  const success = document.getElementById('form-success');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('.form-submit');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Sending…';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        form.style.display = 'none';
        success.style.display = 'flex';
      } else {
        btn.querySelector('span').textContent = 'Try again';
        btn.disabled = false;
      }
    } catch {
      btn.querySelector('span').textContent = 'Try again';
      btn.disabled = false;
    }
  });
})();
