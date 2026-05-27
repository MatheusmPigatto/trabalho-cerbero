/* Cérebro que Salva Vidas — Site Scripts */

(function() {
  // ===== NAV: scroll-based dark mode, progress bar, active section =====
  const topbar = document.querySelector('.topbar');
  const progressBar = document.querySelector('.progress-bar');
  const hero = document.querySelector('.hero');
  const navLinks = [...document.querySelectorAll('.nav-link[data-target]')];
  const sections = [...document.querySelectorAll('[data-nav-section]')];

  function updateNav() {
    const scrollY = window.scrollY;
    const heroH = hero ? hero.offsetHeight : 0;

    // Dark mode nav over hero
    if (scrollY < heroH - 80) {
      topbar.classList.add('dark-mode');
    } else {
      topbar.classList.remove('dark-mode');
    }

    // Progress bar
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const p = Math.max(0, Math.min(1, scrollY / docH));
    progressBar.style.width = (p * 100) + '%';

    // Active section
    const probe = scrollY + window.innerHeight * 0.35;
    let current = sections[0];
    for (const s of sections) {
      if (s.offsetTop <= probe) current = s;
    }
    const currentId = current ? current.getAttribute('data-nav-section') : '';
    navLinks.forEach(a => {
      a.classList.toggle('active', a.getAttribute('data-target') === currentId);
    });
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  window.addEventListener('resize', updateNav);
  updateNav();

  // Smooth scroll for nav links
  document.querySelectorAll('.nav-link[data-target]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.getAttribute('data-target');
      const el = document.getElementById(id);
      if (!el) return;
      window.scrollTo({ top: el.offsetTop - 72, behavior: 'smooth' });
      // Close mobile menu
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // ===== HAMBURGER MENU =====
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('open');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  // ===== HERO BRAIN =====
  const REGIONS = window.BrainViz ? window.BrainViz.REGIONS : {};
  const REGION_DESC = {
    frontal: 'Funções executivas, raciocínio, personalidade, motor voluntário e linguagem expressiva. É a região mais associada à identidade.',
    parietal: 'Sensibilidade somática, percepção espacial e integração sensorial.',
    temporal: 'Audição, memória e compreensão da linguagem; reconhecimento de rostos e objetos.',
    occipital: 'Processamento visual primário — interpretação da informação dos olhos.',
    cerebelo: 'Coordenação motora, equilíbrio, postura e aprendizagem de movimentos.',
    tronco: 'Comando das funções vitais: respiração, frequência cardíaca e reflexos. Seu silêncio é o achado central da morte encefálica.',
  };

  // Mount hero brain
  const heroBrainEl = document.getElementById('brain-canvas');
  let heroBrain = null;
  if (heroBrainEl && window.BrainViz) {
    heroBrain = window.BrainViz.mount(heroBrainEl);
    // Slow auto-rotate in hero
    heroBrain.setRotation(0.3, -0.08);
  }

  // Mount interactive brain section
  const interBrainEl = document.getElementById('brain-canvas-interactive');
  let interBrain = null;
  if (interBrainEl && window.BrainViz) {
    interBrain = window.BrainViz.mount(interBrainEl);
    interBrain.setRotation(0, -0.06);

    const readout = document.getElementById('region-readout');
    const readoutName = readout ? readout.querySelector('.readout-name') : null;
    const readoutDesc = readout ? readout.querySelector('.readout-desc') : null;
    const legendBtns = [...document.querySelectorAll('.legend-btn')];

    function setReadout(r) {
      if (!readout) return;
      if (!r) {
        readout.classList.add('empty');
        if (readoutName) readoutName.textContent = 'Passe o cursor sobre o cérebro';
        if (readoutDesc) readoutDesc.textContent = 'Clique em qualquer região para ver sua descrição.';
        legendBtns.forEach(b => b.classList.remove('active'));
        return;
      }
      readout.classList.remove('empty');
      if (readoutName) readoutName.textContent = REGIONS[r] ? REGIONS[r].label : r;
      if (readoutDesc) readoutDesc.textContent = REGION_DESC[r] || '';
      legendBtns.forEach(b => b.classList.toggle('active', b.dataset.r === r));
    }

    interBrain.on('hover', (r) => { if (r) setReadout(r); });
    interBrain.on('click', (r) => { interBrain.setRegion(r); setReadout(r); });

    legendBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const r = btn.dataset.r;
        interBrain.setRegion(r);
        setReadout(r);
      });
      btn.addEventListener('mouseenter', () => setReadout(btn.dataset.r));
    });
  }

  // ===== SCROLL-LINKED BRAIN ANIMATION =====
  // Hero brain slowly rotates as user scrolls through content
  function updateBrainScroll() {
    if (!heroBrain) return;
    const scrollY = window.scrollY;
    const heroH = hero ? hero.offsetHeight : 800;
    const p = Math.min(1, scrollY / heroH);
    // Rotate brain based on scroll
    heroBrain.setRotation(0.3 + p * 1.5, -0.08 + p * 0.04);
  }
  window.addEventListener('scroll', updateBrainScroll, { passive: true });

  // ===== INTERSECTION OBSERVER for fade-in animations =====
  const fadeEls = document.querySelectorAll('.fade-in');
  if (fadeEls.length) {
    const fadeObs = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('visible');
          fadeObs.unobserve(en.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    fadeEls.forEach(el => fadeObs.observe(el));
  }
})();
