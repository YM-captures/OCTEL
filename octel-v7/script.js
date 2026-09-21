(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer:fine)').matches;

  document.body.classList.add('loading');

  // ---------- IMAGE FALLBACKS ----------
  const applyFallback = img => {
    const fallback = img.dataset.fallback;
    if (!fallback || img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = '1';
    img.src = fallback;
  };
  $$('img[data-fallback]').forEach(img => {
    img.addEventListener('error', () => applyFallback(img), { once: true });
    if (img.complete && img.naturalWidth === 0) applyFallback(img);
  });


  // ---------- REMOTE MEDIA HARDENING ----------
  $$('img').forEach(img => {
    if (/^https?:/.test(img.currentSrc || img.src)) img.referrerPolicy = 'no-referrer';
    const markLoaded = () => img.classList.add('media-loaded');
    if (img.complete && img.naturalWidth > 0) markLoaded();
    else img.addEventListener('load', markLoaded, { once:true });
  });

  // ---------- PRELOADER ----------
  const preloader = $('#preloader');
  const preloaderPct = $('#preloaderPct');
  const preloaderTrack = $('.intro-line i');
  const heroVideo = $('.hero-video');
  let pageLoaded = document.readyState === 'complete';
  let videoReady = heroVideo ? heroVideo.readyState >= 2 : true;
  const startedAt = performance.now();
  addEventListener('load', () => { pageLoaded = true; });
  heroVideo?.addEventListener('loadeddata', () => { videoReady = true; }, { once: true });

  const finishPreloader = () => {
    if (!preloader || preloader.classList.contains('is-out')) return;
    if (preloaderPct) preloaderPct.textContent = '100';
    if (preloaderTrack) preloaderTrack.style.transform = 'scaleX(1)';
    preloader.classList.add('is-out');
    setTimeout(() => {
      preloader.remove();
      document.body.classList.remove('loading');
      document.body.classList.add('ready');
      heroVideo?.play?.().catch(() => {});
    }, 1320);
  };

  if (reduced) {
    preloader?.remove();
    document.body.classList.remove('loading');
    document.body.classList.add('ready');
  } else {
    const loaderLoop = now => {
      const elapsed = now - startedAt;
      const mediaFactor = (pageLoaded && videoReady) ? 1 : pageLoaded ? .92 : .82;
      const timed = Math.min(96, (elapsed / 22) * mediaFactor);
      const progress = clamp(timed, 0, 96);
      if (preloaderPct) preloaderPct.textContent = String(Math.floor(progress)).padStart(2, '0');
      if (preloaderTrack) preloaderTrack.style.transform = `scaleX(${progress / 100})`;
      if (((pageLoaded && videoReady) && elapsed > 2150) || elapsed > 5000) {
        finishPreloader();
        return;
      }
      requestAnimationFrame(loaderLoop);
    };
    requestAnimationFrame(loaderLoop);
  }

  // ---------- DATES / NOVARESA ----------
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const arrivalDefault = new Date(today); arrivalDefault.setDate(today.getDate() + 1);
  const departureDefault = new Date(today); departureDefault.setDate(today.getDate() + 2);

  $$('[name="arrival"]').forEach(el => { el.min = iso(today); if (!el.value) el.value = iso(arrivalDefault); });
  $$('[name="departure"]').forEach(el => { el.min = iso(arrivalDefault); if (!el.value) el.value = iso(departureDefault); });
  const sync = (name, value, source) => $$(`[name="${name}"]`).forEach(el => { if (el !== source) el.value = value; });
  $$('[name="arrival"]').forEach(el => el.addEventListener('change', () => {
    if (!el.value) return;
    sync('arrival', el.value, el);
    const next = new Date(`${el.value}T12:00:00`); next.setDate(next.getDate() + 1);
    $$('[name="departure"]').forEach(dep => {
      dep.min = iso(next);
      if (!dep.value || dep.value <= el.value) dep.value = iso(next);
    });
  }));
  $$('[name="departure"]').forEach(el => el.addEventListener('change', () => sync('departure', el.value, el)));
  $$('[data-novaresa-form]').forEach(form => form.addEventListener('submit', e => {
    e.preventDefault();
    const arrival = $('[name="arrival"]', form)?.value;
    const departure = $('[name="departure"]', form)?.value;
    if (!arrival || !departure || departure <= arrival) return;
    const url = new URL('https://www.novaresa.net/firm.php');
    url.searchParams.set('id_firm', '88');
    url.searchParams.set('date_from', arrival);
    url.searchParams.set('date_to', departure);
    window.open(url.toString(), '_blank', 'noopener');
  }));

  // ---------- MENU ----------
  const menu = $('#menuPanel');
  const menuToggle = $('#menuToggle');
  const menuClose = $('#menuClose');
  const menuVisual = $('#menuVisual');
  if (menuVisual) menuVisual.addEventListener('error', () => { menuVisual.src = 'assets/portet-garonne.jpg'; });
  let menuSwapTimer;
  const setMenu = open => {
    menu?.classList.toggle('open', open);
    menu?.setAttribute('aria-hidden', String(!open));
    menuToggle?.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  };
  menuToggle?.addEventListener('click', () => setMenu(true));
  menuClose?.addEventListener('click', () => setMenu(false));
  $$('.menu-nav a').forEach(link => {
    link.addEventListener('click', () => setMenu(false));
    link.addEventListener('mouseenter', () => {
      const src = link.dataset.menuImage;
      if (!src || !menuVisual || menuVisual.getAttribute('src') === src) return;
      clearTimeout(menuSwapTimer);
      menuVisual.style.opacity = '0';
      menuSwapTimer = setTimeout(() => {
        menuVisual.src = src;
        menuVisual.style.opacity = '1';
      }, 160);
    });
  });

  // ---------- BOOKING DRAWER ----------
  const drawer = $('#bookingDrawer');
  const setBooking = open => {
    drawer?.classList.toggle('open', open);
    drawer?.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('booking-open', open);
  };
  $$('[data-open-booking]').forEach(btn => btn.addEventListener('click', () => setBooking(true)));
  $$('[data-close-booking]').forEach(btn => btn.addEventListener('click', () => setBooking(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); setBooking(false); } });

  // ---------- REVEALS ----------
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.10, rootMargin: '0px 0px -7%' });
  $$('.reveal,.image-reveal').forEach(el => revealObserver.observe(el));

  // ---------- HEADER ----------
  const header = $('#siteHeader');
  const themed = $$('[data-header-tone]');
  let previousY = scrollY;
  const updateHeaderTheme = y => {
    const probe = (header?.offsetHeight || 80) * .65;
    let tone = 'light';
    for (const section of themed) {
      const r = section.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { tone = section.dataset.headerTone || 'light'; break; }
    }
    header?.classList.toggle('tone-light', tone === 'light');
    header?.classList.toggle('tone-dark', tone === 'dark');
    header?.classList.toggle('scrolled', y > 36);
    header?.classList.toggle('at-top', y < 30);
    const dy = y - previousY;
    if (Math.abs(dy) > 5 && y > 320) header?.classList.toggle('header-hidden', dy > 0);
    if (y < 220 || dy < -8) header?.classList.remove('header-hidden');
    previousY = y;
  };

  // ---------- HORIZONTAL JOURNEY ----------
  const journey = $('.journey');
  const journeyTrack = $('#journeyTrack');
  const journeyProgress = $('.journey-progress i');
  const cardImages = $$('[data-card-parallax]');
  let journeyMax = 0;
  let journeyCurrent = 0;
  let journeyTarget = 0;
  let horizontalEnabled = false;
  const measureJourney = () => {
    if (!journey || !journeyTrack) return;
    horizontalEnabled = innerWidth > 900 && !reduced;
    if (!horizontalEnabled) {
      journey.style.height = '';
      journeyTrack.style.transform = '';
      journeyCurrent = journeyTarget = 0;
      return;
    }
    journeyMax = Math.max(0, journeyTrack.scrollWidth - innerWidth);
    journey.style.height = `${innerHeight + journeyMax}px`;
  };

  // ---------- SMOOTH PARALLAX ENGINE ----------
  const progress = $('.scroll-progress i');
  const parallaxImages = $$('[data-parallax-img]');
  const parallaxNodes = $$('[data-parallax]');
  let smoothY = scrollY;
  let targetY = scrollY;
  let rafId = 0;
  let viewportH = innerHeight;

  const animate = () => {
    targetY = scrollY;
    smoothY = reduced ? targetY : lerp(smoothY, targetY, .085);
    const max = Math.max(1, document.documentElement.scrollHeight - viewportH);
    if (progress) progress.style.transform = `scaleX(${targetY / max})`;
    updateHeaderTheme(targetY);

    if (!reduced && heroVideo) {
      const p = clamp(smoothY / viewportH, 0, 1);
      heroVideo.style.transform = `translate3d(0,${p * 42}px,0) scale(${1.035 + p * .045})`;
    }

    if (horizontalEnabled && journey && journeyTrack) {
      const start = journey.offsetTop;
      const range = Math.max(1, journey.offsetHeight - viewportH);
      const p = clamp((smoothY - start) / range, 0, 1);
      journeyTarget = -journeyMax * p;
      journeyCurrent = lerp(journeyCurrent, journeyTarget, .10);
      journeyTrack.style.transform = `translate3d(${journeyCurrent}px,0,0)`;
      if (journeyProgress) journeyProgress.style.transform = `scaleX(${p})`;
      cardImages.forEach((img, i) => {
        const drift = (p - .5) * (22 + i * 3);
        img.style.setProperty('--journey-drift', `${drift}px`);
      });
    }

    if (!reduced) {
      parallaxImages.forEach(img => {
        const parent = img.parentElement;
        if (!parent) return;
        const r = parent.getBoundingClientRect();
        if (r.bottom < -220 || r.top > viewportH + 220) return;
        const speed = Number(img.dataset.parallaxImg || .05);
        const offset = (r.top + r.height / 2 - viewportH / 2) * speed;
        img.style.transform = `translate3d(0,${-offset}px,0) scale(1.085)`;
      });
      parallaxNodes.forEach(el => {
        if (el.classList.contains('hero-booking') && innerWidth <= 900) return;
        const r = el.getBoundingClientRect();
        if (r.bottom < -180 || r.top > viewportH + 180) return;
        const speed = Number(el.dataset.parallax || 0);
        const offset = (r.top + r.height / 2 - viewportH / 2) * speed;
        if (el.classList.contains('hero-copy')) {
          el.style.transform = `translate(-50%,calc(-50% + ${offset}px))`;
        } else if (el.classList.contains('hero-booking')) {
          el.style.transform = `translateX(-50%) translateY(${offset}px)`;
        } else {
          el.style.transform = `translate3d(0,${offset}px,0)`;
        }
      });
    }
    rafId = requestAnimationFrame(animate);
  };

  addEventListener('resize', () => {
    viewportH = innerHeight;
    measureJourney();
  }, { passive: true });
  addEventListener('load', () => { measureJourney(); setTimeout(measureJourney, 700); });
  measureJourney();
  rafId = requestAnimationFrame(animate);

  // ---------- POINTER PARALLAX INSIDE IMAGES ----------
  if (finePointer && !reduced) {
    $$('.interactive-media').forEach(media => {
      const img = $('img', media);
      if (!img || img.hasAttribute('data-parallax-img')) return;
      media.addEventListener('mousemove', e => {
        const r = media.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - .5;
        const ny = (e.clientY - r.top) / r.height - .5;
        if (img.hasAttribute('data-card-parallax')) {
          img.style.setProperty('--hover-x', `${nx * -12}px`);
          img.style.setProperty('--hover-y', `${ny * -10}px`);
        } else {
          img.style.transform = `translate3d(${nx * -12}px,${ny * -10}px,0) scale(1.07)`;
        }
      });
      media.addEventListener('mouseleave', () => {
        if (img.hasAttribute('data-card-parallax')) {
          img.style.setProperty('--hover-x', '0px');
          img.style.setProperty('--hover-y', '0px');
        } else img.style.transform = '';
      });
    });
  }

  // ---------- CUSTOM CURSOR ----------
  const cursor = $('.cursor');
  const cursorText = $('.cursor span');
  if (cursor && finePointer && !reduced) {
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    const cursorLoop = () => {
      cx = lerp(cx, tx, .22); cy = lerp(cy, ty, .22);
      cursor.style.left = `${cx}px`; cursor.style.top = `${cy}px`;
      requestAnimationFrame(cursorLoop);
    };
    addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; cursor.style.opacity = '1'; });
    requestAnimationFrame(cursorLoop);
    $$('[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursorText.textContent = el.dataset.cursor || '';
        cursor.classList.add('active');
      });
      el.addEventListener('mouseleave', () => cursor.classList.remove('active'));
    });
    $$('a,button,input').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('link'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('link'));
    });
  }

  // ---------- MAGNETIC BUTTONS ----------
  if (finePointer && !reduced) {
    $$('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate3d(${x * .09}px,${y * .09}px,0)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  // ---------- ANCHOR FOCUS / SMOOTH FALLBACK ----------
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const target = $(id);
    if (!target) return;
    if (!('scrollBehavior' in document.documentElement.style)) {
      e.preventDefault();
      target.scrollIntoView();
    }
  }));

  // Cleanup in bfcache scenarios
  addEventListener('pagehide', () => cancelAnimationFrame(rafId));
})();
