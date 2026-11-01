// Scroll reveal and the "vision grid" background: a faint grid with a few detection boxes
// that drift, lock on, and relabel, a quiet nod to object detection.
(function () {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js'); // sections only start hidden once this script is running

  document.getElementById('year').textContent = new Date().getFullYear();

  // ---------- reveal on scroll ----------
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' }); // any part in view: tall sections on short screens never reach a ratio
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  // ---------- vision grid canvas ----------
  const canvas = document.getElementById('vision');
  const ctx = canvas.getContext('2d');
  const LABELS = ['person', 'robot_arm', 'sensor', 'pipeline', 'signal', 'object', 'gripper', 'frame', 'keypoint', 'camera'];
  const GRID = 48;
  let w = 0, h = 0, dpr = 1, boxes = [];

  const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  const rand = (a, b) => a + Math.random() * (b - a);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = w < 640 ? 3 : 6;
    boxes = Array.from({ length: count }, newBox);
  }

  function newBox() {
    const bw = rand(70, 180), bh = rand(60, 150);
    const x = rand(0, Math.max(1, w - bw)), y = rand(0, Math.max(1, h - bh));
    return {
      x, y, w: bw, h: bh,
      tx: x, ty: y, tw: bw, th: bh,
      label: LABELS[Math.floor(Math.random() * LABELS.length)],
      conf: rand(0.82, 0.99),
      alpha: 0, life: rand(5, 11), age: 0,
    };
  }

  function retarget(b) {
    b.tw = rand(70, 180); b.th = rand(60, 150);
    b.tx = Math.min(Math.max(0, b.x + rand(-120, 120)), Math.max(0, w - b.tw));
    b.ty = Math.min(Math.max(0, b.y + rand(-90, 90)), Math.max(0, h - b.th));
    b.conf = rand(0.82, 0.99);
  }

  function drawGrid(gridColor) {
    ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0.5; x < w; x += GRID) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0.5; y < h; y += GRID) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
  }

  function drawBox(b, color) {
    const c = Math.min(14, b.w / 4, b.h / 4);
    ctx.globalAlpha = b.alpha * 0.55;
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath();
    // corner brackets
    ctx.moveTo(b.x, b.y + c); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x + c, b.y);
    ctx.moveTo(b.x + b.w - c, b.y); ctx.lineTo(b.x + b.w, b.y); ctx.lineTo(b.x + b.w, b.y + c);
    ctx.moveTo(b.x + b.w, b.y + b.h - c); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.lineTo(b.x + b.w - c, b.y + b.h);
    ctx.moveTo(b.x + c, b.y + b.h); ctx.lineTo(b.x, b.y + b.h); ctx.lineTo(b.x, b.y + b.h - c);
    ctx.stroke();
    // faint full outline
    ctx.globalAlpha = b.alpha * 0.12;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    // label
    ctx.globalAlpha = b.alpha * 0.6;
    ctx.fillStyle = color;
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillText(`${b.label} ${b.conf.toFixed(2)}`, b.x, b.y - 5);
    ctx.globalAlpha = 1;
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const gridColor = css('--grid'), boxColor = css('--box');
    ctx.clearRect(0, 0, w, h);
    drawGrid(gridColor);
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      b.age += dt;
      const k = 1 - Math.pow(0.04, dt); // ease toward target
      b.x += (b.tx - b.x) * k; b.y += (b.ty - b.y) * k; b.w += (b.tw - b.w) * k; b.h += (b.th - b.h) * k;
      if (Math.random() < dt * 0.35) retarget(b);
      const fadeIn = Math.min(1, b.age / 1.2), fadeOut = Math.min(1, (b.life - b.age) / 1.2);
      b.alpha = Math.max(0, Math.min(fadeIn, fadeOut));
      if (b.age >= b.life) boxes[i] = newBox();
      drawBox(b, boxColor);
    }
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  if (reduceMotion) {
    drawGrid(css('--grid'));
  } else {
    requestAnimationFrame(frame);
  }
})();
