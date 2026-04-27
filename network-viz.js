/* ─── CTRL+Y Global Network Visualization ──────────────────────────────────── */

(function () {
  'use strict';

  // ── Config ─────────────────────────────────────────────────────────────────
  const C = {
    bg:           '#060C14',
    mapDot:       'rgba(107,157,200,0.13)',
    mapDotBright: 'rgba(107,157,200,0.28)',
    grid:         'rgba(107,157,200,0.045)',
    gridBright:   'rgba(107,157,200,0.10)',
    arc:          'rgba(107,157,200,0.35)',
    arcGlow:      'rgba(107,157,200,0.12)',
    node:         '#6B9DC8',
    nodeGlow:     'rgba(107,157,200,0.5)',
    nodePulse:    'rgba(107,157,200,0.08)',
    signal:       '#a5c8e8',
    signalGlow:   'rgba(165,200,232,0.8)',
    amber:        '#E8A320',
    amberGlow:    'rgba(232,163,32,0.4)',
    scanLine:     'rgba(107,157,200,0.025)',
    text:         'rgba(107,157,200,0.7)',
  };

  // ── Continent polygons [lng, lat] ─────────────────────────────────────────
  // Simplified but recognizable continent outlines
  const LAND = [
    // North America
    [[-168,72],[-140,72],[-100,73],[-78,73],[-68,68],[-64,63],[-53,47],[-60,46],
     [-67,45],[-70,42],[-76,35],[-80,32],[-81,25],[-90,30],[-97,26],[-117,32],
     [-124,37],[-130,54],[-141,60],[-141,68],[-156,72],[-168,72]],
    // Greenland
    [[-44,60],[-44,73],[-32,83],[-16,82],[0,76],[-18,70],[-44,60]],
    // South America
    [[-77,8],[-80,2],[-72,-2],[-50,-2],[-36,-4],[-35,-9],[-40,-20],
     [-48,-28],[-52,-33],[-58,-38],[-65,-43],[-68,-54],[-58,-52],
     [-48,-27],[-38,-10],[-50,-2],[-72,-2],[-80,2],[-77,8]],
    // Europe west
    [[-9,37],[3,37],[5,40],[3,43],[-2,43],[-8,44],[-6,38],[-9,37]],
    // Europe north + Scandinavia
    [[-2,43],[2,51],[8,54],[10,55],[14,55],[18,54],[24,57],[28,65],
     [30,70],[18,71],[14,62],[8,55],[5,52],[-4,56],[-6,58],[-6,50],[-2,43]],
    // Africa
    [[-5,36],[37,37],[43,11],[40,15],[37,22],[33,23],[32,22],[37,11],
     [42,11],[55,-21],[34,-26],[24,-35],[18,-35],[16,-29],[13,-23],[8,-5],
     [2,5],[0,6],[-3,5],[-8,5],[-15,10],[-17,14],[-17,20],[-13,22],[-8,35],[-5,36]],
    // Asia main
    [[26,42],[30,41],[36,37],[40,37],[44,40],[48,37],[50,28],[55,26],
     [60,22],[66,22],[72,22],[78,8],[80,12],[84,14],[88,24],[92,22],
     [98,10],[104,4],[110,8],[115,4],[120,4],[122,8],[122,10],[120,12],
     [118,16],[120,24],[122,32],[122,40],[130,46],[136,46],[140,42],
     [142,46],[140,50],[136,52],[128,52],[122,52],[108,54],[102,58],
     [92,62],[82,68],[60,74],[44,70],[32,69],[32,65],[26,60],[26,42]],
    // Australia
    [[114,-22],[120,-20],[130,-14],[136,-12],[136,-16],[142,-12],[148,-18],
     [150,-24],[154,-28],[154,-32],[152,-38],[148,-40],[144,-38],[140,-36],
     [136,-30],[130,-32],[122,-34],[114,-34],[114,-22]],
    // Japan (tiny but iconic)
    [[130,31],[130,34],[133,33],[136,36],[138,38],[141,40],[141,43],
     [143,44],[141,43],[141,40],[138,38],[134,34],[130,34],[130,31]],
    // UK (simplified)
    [[-5,50],[-3,50],[2,51],[0,54],[-2,58],[-5,58],[-6,56],[-5,50]],
    // Iceland
    [[-24,63],[-14,63],[-13,65],[-24,66],[-24,63]],
    // New Zealand
    [[172,-44],[174,-40],[176,-37],[178,-38],[174,-46],[172,-44]],
  ];

  // ── Operational nodes [lng, lat, label, status] ───────────────────────────
  const NODES = [
    { id:'nyc', lng:-74.0, lat:40.7,  label:'New York',   status:'ACTIVE',   type:'primary',   data:'6 Assets' },
    { id:'lon', lng:-0.1,  lat:51.5,  label:'London',     status:'ACTIVE',   type:'primary',   data:'Mesh Sync' },
    { id:'dxb', lng:55.3,  lat:25.2,  label:'Dubai Hub',  status:'RELAY',    type:'secondary', data:'Relay Online' },
    { id:'sin', lng:103.8, lat:1.3,   label:'Singapore',  status:'ACTIVE',   type:'primary',   data:'Route Locked' },
    { id:'tok', lng:139.7, lat:35.7,  label:'Tokyo',      status:'STANDBY',  type:'secondary', data:'Latency 18ms' },
    { id:'syd', lng:151.2, lat:-33.9, label:'Sydney',     status:'ACTIVE',   type:'primary',   data:'Feed Live' },
    { id:'gru', lng:-46.6, lat:-23.5, label:'São Paulo',  status:'ACTIVE',   type:'secondary', data:'Signal 98%' },
    { id:'nbo', lng:36.8,  lat:-1.3,  label:'Nairobi',    status:'RELAY',    type:'secondary', data:'Alt 320m' },
  ];

  // Arc connections between node IDs
  const ARCS = [
    ['nyc','lon'], ['lon','dxb'], ['dxb','sin'], ['sin','tok'],
    ['tok','syd'], ['nyc','gru'], ['lon','nbo'], ['nbo','sin'],
    ['nyc','tok'], ['syd','sin'], ['gru','lon'],
  ];

  // ── State ──────────────────────────────────────────────────────────────────
  let canvas, ctx, W, H, DPR, raf;
  let mouse = { x: 0.5, y: 0.5 };
  let smoothMouse = { x: 0.5, y: 0.5 };
  let hoveredNode = null;
  let t = 0;
  let dotCache = [];        // pre-computed dot positions
  let projectedNodes = [];  // nodes with screen coords
  let visible = false;
  let entryProgress = 0;    // 0→1 on scroll reveal

  // ── Mercator projection ───────────────────────────────────────────────────
  function project(lng, lat, w, h, parallaxX = 0, parallaxY = 0) {
    const x = ((lng + 180) / 360) * w + parallaxX;
    const sinLat = Math.sin((lat * Math.PI) / 180);
    const yMerc = Math.log((1 + sinLat) / (1 - sinLat)) / 2;
    const y = h / 2 - (yMerc / (2 * Math.PI)) * h * 1.5 + parallaxY;
    // Offset map slightly down so it doesn't clip at top
    return { x: x * 0.88 + w * 0.06, y: y * 0.84 + h * 0.12 };
  }

  // ── Build dot cache from continent polygons ────────────────────────────────
  function buildDotCache(w, h) {
    dotCache = [];
    // Draw filled continents to an offscreen canvas
    const off = document.createElement('canvas');
    off.width  = Math.floor(w);
    off.height = Math.floor(h);
    const octx = off.getContext('2d');
    octx.fillStyle = '#fff';

    for (const poly of LAND) {
      if (poly.length < 3) continue;
      octx.beginPath();
      const p0 = project(poly[0][0], poly[0][1], w, h);
      octx.moveTo(p0.x, p0.y);
      for (let i = 1; i < poly.length; i++) {
        const p = project(poly[i][0], poly[i][1], w, h);
        octx.lineTo(p.x, p.y);
      }
      octx.closePath();
      octx.fill();
    }

    // Sample every N pixels — adaptive density
    const step = Math.max(6, Math.floor(w / 140));
    const data = octx.getImageData(0, 0, off.width, off.height).data;
    for (let y = 0; y < off.height; y += step) {
      for (let x = 0; x < off.width; x += step) {
        const idx = (y * off.width + x) * 4;
        if (data[idx] > 128) {
          // tiny randomness so dots don't look like a perfect grid
          dotCache.push({
            x: x + (Math.random() - 0.5) * step * 0.4,
            y: y + (Math.random() - 0.5) * step * 0.4,
          });
        }
      }
    }
  }

  // ── Bezier arc control point ───────────────────────────────────────────────
  function arcControl(x1, y1, x2, y2, curvature = 0.35) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    return {
      cx: mx - dy * curvature,
      cy: my - len * curvature * 0.5,
    };
  }

  // ── Point on quadratic bezier ──────────────────────────────────────────────
  function bezierPoint(t, x1, y1, cx, cy, x2, y2) {
    const mt = 1 - t;
    return {
      x: mt * mt * x1 + 2 * mt * t * cx + t * t * x2,
      y: mt * mt * y1 + 2 * mt * t * cy + t * t * y2,
    };
  }

  // ── Draw animated grid ─────────────────────────────────────────────────────
  function drawGrid(px, py) {
    const cols = 24, rows = 14;
    const cw = W / cols, rh = H / rows;

    // Shift grid slightly with parallax
    const ox = (smoothMouse.x - 0.5) * px * 0.3;
    const oy = (smoothMouse.y - 0.5) * py * 0.3;

    ctx.save();
    ctx.translate(ox, oy);

    // Vertical lines
    for (let i = 0; i <= cols; i++) {
      const x = i * cw;
      const bright = (Math.sin(t * 0.3 + i * 0.4) + 1) / 2;
      ctx.strokeStyle = bright > 0.85
        ? C.gridBright
        : C.grid;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    // Horizontal lines
    for (let j = 0; j <= rows; j++) {
      const y = j * rh;
      const bright = (Math.sin(t * 0.25 + j * 0.6) + 1) / 2;
      ctx.strokeStyle = bright > 0.85
        ? C.gridBright
        : C.grid;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Coordinate labels at intersections (sparse)
    ctx.fillStyle = 'rgba(107,157,200,0.18)';
    ctx.font = `${Math.max(8, W * 0.007)}px "JetBrains Mono", monospace`;
    for (let i = 2; i <= cols; i += 6) {
      for (let j = 2; j <= rows; j += 4) {
        const lng = Math.round(((i / cols) * 360 - 180));
        const lat = Math.round((90 - (j / rows) * 180));
        ctx.fillText(`${lat}°`, i * cw + 3, j * rh - 3);
      }
    }

    ctx.restore();
  }

  // ── Draw world map dots ────────────────────────────────────────────────────
  function drawMap(parallaxX, parallaxY) {
    const ox = (smoothMouse.x - 0.5) * parallaxX;
    const oy = (smoothMouse.y - 0.5) * parallaxY;

    const r = Math.max(1, W * 0.0015);

    for (const d of dotCache) {
      // Subtle per-dot shimmer
      const shimmer = (Math.sin(t * 0.4 + d.x * 0.02 + d.y * 0.03) + 1) / 2;
      const alpha = 0.08 + shimmer * 0.12;
      ctx.fillStyle = `rgba(107,157,200,${(alpha * entryProgress).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(d.x + ox, d.y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Draw arc connections ───────────────────────────────────────────────────
  function drawArcs(arcPX, arcPY) {
    const ox = (smoothMouse.x - 0.5) * arcPX;
    const oy = (smoothMouse.y - 0.5) * arcPY;

    for (let ai = 0; ai < ARCS.length; ai++) {
      const [aId, bId] = ARCS[ai];
      const a = projectedNodes.find(n => n.id === aId);
      const b = projectedNodes.find(n => n.id === bId);
      if (!a || !b) continue;

      const x1 = a.sx + ox, y1 = a.sy + oy;
      const x2 = b.sx + ox, y2 = b.sy + oy;
      const { cx, cy } = arcControl(x1, y1, x2, y2, 0.3);

      // Glow pass
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = C.arcGlow;
      ctx.strokeStyle = `rgba(107,157,200,${(0.12 * entryProgress).toFixed(3)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2, y2);
      ctx.stroke();
      ctx.restore();

      // Arc line
      ctx.strokeStyle = `rgba(107,157,200,${(0.22 * entryProgress).toFixed(3)})`;
      ctx.lineWidth = 0.75;
      ctx.setLineDash([4, 8]);
      ctx.lineDashOffset = -t * 12;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Traveling signal dot
      const phase = ((t * 0.0006 + ai * 0.17) % 1 + 1) % 1;
      const sp = bezierPoint(phase, x1, y1, cx, cy, x2, y2);

      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = C.signalGlow;
      ctx.fillStyle = `rgba(165,200,232,${(0.9 * entryProgress).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Trailing glow for signal
      for (let tr = 1; tr <= 4; tr++) {
        const tp = Math.max(0, phase - tr * 0.018);
        const trp = bezierPoint(tp, x1, y1, cx, cy, x2, y2);
        ctx.fillStyle = `rgba(165,200,232,${((0.18 - tr * 0.04) * entryProgress).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(trp.x, trp.y, 2.5 - tr * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ── Draw nodes ────────────────────────────────────────────────────────────
  function drawNodes(nodePX, nodePY) {
    const ox = (smoothMouse.x - 0.5) * nodePX;
    const oy = (smoothMouse.y - 0.5) * nodePY;

    for (const node of projectedNodes) {
      const x = node.sx + ox;
      const y = node.sy + oy;
      const isHovered = hoveredNode === node.id;
      const isPrimary = node.type === 'primary';
      const r = isPrimary ? (isHovered ? 6 : 4.5) : (isHovered ? 4.5 : 3.5);

      // Pulse rings
      const pulseCount = isPrimary ? 3 : 2;
      for (let p = 0; p < pulseCount; p++) {
        const phase = ((t * 0.0008 + p * 0.33 + node.id.charCodeAt(0) * 0.01) % 1);
        const pr = r + phase * (isPrimary ? 28 : 20);
        const alpha = (1 - phase) * 0.18 * entryProgress;
        ctx.strokeStyle = isPrimary
          ? `rgba(107,157,200,${alpha.toFixed(3)})`
          : `rgba(107,157,200,${(alpha * 0.7).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, pr, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Glow halo
      if (isHovered || isPrimary) {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
        grad.addColorStop(0, `rgba(107,157,200,${(isHovered ? 0.35 : 0.2) * entryProgress})`);
        grad.addColorStop(1, 'rgba(107,157,200,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Node fill
      ctx.save();
      ctx.shadowBlur = isHovered ? 20 : 10;
      ctx.shadowColor = C.nodeGlow;
      if (node.status === 'RELAY') {
        ctx.fillStyle = `rgba(232,163,32,${(0.9 * entryProgress).toFixed(3)})`;
        ctx.shadowColor = C.amberGlow;
      } else if (node.status === 'STANDBY') {
        ctx.fillStyle = `rgba(107,157,200,${(0.4 * entryProgress).toFixed(3)})`;
      } else {
        ctx.fillStyle = `rgba(107,157,200,${(0.95 * entryProgress).toFixed(3)})`;
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright core
      ctx.fillStyle = `rgba(220,235,255,${(0.8 * entryProgress).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Coordinate label under node
      if (entryProgress > 0.6) {
        const coordAlpha = (entryProgress - 0.6) / 0.4;
        ctx.fillStyle = `rgba(107,157,200,${(0.45 * coordAlpha).toFixed(3)})`;
        ctx.font = `${Math.max(8, W * 0.007)}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        const coordText = `${Math.abs(node.lat).toFixed(1)}°${node.lat >= 0 ? 'N' : 'S'} ${Math.abs(node.lng).toFixed(1)}°${node.lng >= 0 ? 'E' : 'W'}`;
        ctx.fillText(coordText, x, y + r + 14);
        ctx.textAlign = 'left';
      }

      // Hover tooltip (drawn on canvas for precision)
      if (isHovered && entryProgress > 0.8) {
        drawNodeTooltip(x, y, node, r);
      }
    }
  }

  function drawNodeTooltip(x, y, node, r) {
    const pad = 10, lh = 14;
    const lines = [node.label, `● ${node.status}`, node.data];
    const fw = 130, fh = pad * 2 + lines.length * lh + 4;
    let tx = x + r + 12;
    let ty = y - fh / 2;
    if (tx + fw > W - 20) tx = x - fw - r - 12;
    if (ty < 10) ty = 10;
    if (ty + fh > H - 10) ty = H - fh - 10;

    // Panel
    ctx.save();
    ctx.fillStyle = 'rgba(6,12,20,0.88)';
    ctx.strokeStyle = 'rgba(107,157,200,0.35)';
    ctx.lineWidth = 0.75;
    roundRect(ctx, tx, ty, fw, fh, 6);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = 'rgba(238,245,255,0.9)';
    ctx.font = `500 ${Math.max(10, W * 0.009)}px "Space Grotesk", sans-serif`;
    ctx.fillText(lines[0], tx + pad, ty + pad + 10);

    const statusColor = node.status === 'ACTIVE' ? '#6B9DC8'
                      : node.status === 'RELAY'   ? '#E8A320'
                      : '#4A6480';
    ctx.fillStyle = statusColor;
    ctx.font = `${Math.max(8, W * 0.007)}px "JetBrains Mono", monospace`;
    ctx.fillText(lines[1], tx + pad, ty + pad + 10 + lh + 4);

    ctx.fillStyle = 'rgba(107,157,200,0.6)';
    ctx.fillText(lines[2], tx + pad, ty + pad + 10 + (lh + 4) * 2);

    ctx.restore();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r);
    c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h);
    c.arcTo(x, y + h, x, y + h - r, r);
    c.lineTo(x, y + r);
    c.arcTo(x, y, x + r, y, r);
    c.closePath();
  }

  // ── Scan line ──────────────────────────────────────────────────────────────
  function drawScanLine() {
    const sy = (t * 0.05) % (H * 1.4) - H * 0.2;
    const grad = ctx.createLinearGradient(0, sy - 60, 0, sy + 60);
    grad.addColorStop(0, 'rgba(107,157,200,0)');
    grad.addColorStop(0.5, C.scanLine);
    grad.addColorStop(1, 'rgba(107,157,200,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, sy - 60, W, 120);
  }

  // ── Project nodes to screen ────────────────────────────────────────────────
  function updateProjectedNodes() {
    projectedNodes = NODES.map(n => {
      const p = project(n.lng, n.lat, W, H);
      return { ...n, sx: p.x, sy: p.y };
    });
  }

  // ── Hover detection ────────────────────────────────────────────────────────
  function detectHover(mx, my) {
    const ox = (smoothMouse.x - 0.5) * 18;
    const oy = (smoothMouse.y - 0.5) * 12;
    let found = null;
    for (const n of projectedNodes) {
      const dx = mx - (n.sx + ox);
      const dy = my - (n.sy + oy);
      if (Math.sqrt(dx * dx + dy * dy) < 24) { found = n.id; break; }
    }
    if (found !== hoveredNode) {
      hoveredNode = found;
      canvas.style.cursor = found ? 'crosshair' : 'default';
    }
  }

  // ── Main render loop ───────────────────────────────────────────────────────
  function render() {
    raf = requestAnimationFrame(render);
    if (!visible) return;

    t += 16;

    // Smooth mouse interpolation
    smoothMouse.x += (mouse.x - smoothMouse.x) * 0.06;
    smoothMouse.y += (mouse.y - smoothMouse.y) * 0.06;

    // Entry animation
    if (entryProgress < 1) entryProgress = Math.min(1, entryProgress + 0.008);

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle radial glow at center
    const gx = W * 0.5, gy = H * 0.5;
    const gGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, W * 0.6);
    gGrad.addColorStop(0, `rgba(107,157,200,${(0.04 * entryProgress).toFixed(3)})`);
    gGrad.addColorStop(1, 'rgba(107,157,200,0)');
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, 0, W, H);

    // Layer draw order — parallax amounts (px)
    drawGrid(60, 40);
    drawMap(30, 20);
    drawArcs(20, 14);
    drawNodes(18, 12);
    drawScanLine();

    // Edge vignette
    const vig = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, W*0.75);
    vig.addColorStop(0, 'rgba(6,12,20,0)');
    vig.addColorStop(1, 'rgba(6,12,20,0.7)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Resize ─────────────────────────────────────────────────────────────────
  function resize() {
    const el = canvas.parentElement;
    W = el.offsetWidth;
    H = el.offsetHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(DPR, DPR);
    updateProjectedNodes();
    buildDotCache(W, H);
  }

  // ── Floating cards animation ───────────────────────────────────────────────
  const CARD_DATA = [
    { label:'Drone 12', value:'Active',            icon:'●', color:'active' },
    { label:'Signal',   value:'98%',               icon:'↑', color:'active' },
    { label:'Altitude', value:'320m',              icon:'▲', color:'info'   },
    { label:'Latency',  value:'18ms',              icon:'~', color:'info'   },
    { label:'Assets',   value:'Tracking 6',        icon:'◎', color:'active' },
    { label:'Mesh',     value:'Sync Online',       icon:'✦', color:'active' },
    { label:'Comm',     value:'Relay Established', icon:'↔', color:'relay'  },
    { label:'Route',    value:'Locked',            icon:'◈', color:'active' },
  ];

  function initCards() {
    const container = document.getElementById('nviz-cards');
    if (!container) return;

    CARD_DATA.forEach((d, i) => {
      const el = document.createElement('div');
      el.className = `nviz-card nviz-card--${d.color}`;
      el.style.animationDelay = `${i * 0.35}s`;
      el.innerHTML = `
        <span class="nviz-card-icon">${d.icon}</span>
        <div class="nviz-card-body">
          <span class="nviz-card-label">${d.label}</span>
          <span class="nviz-card-value">${d.value}</span>
        </div>
      `;
      container.appendChild(el);
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('nviz-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resize();
    window.addEventListener('resize', () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      resize();
    });

    // Mouse tracking — relative to canvas section
    const section = document.getElementById('network-viz');
    section.addEventListener('mousemove', e => {
      const rect = section.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) / rect.width;
      mouse.y = (e.clientY - rect.top)  / rect.height;
      // Also detect hover on canvas
      const cr = canvas.getBoundingClientRect();
      detectHover(e.clientX - cr.left, e.clientY - cr.top);
    });
    section.addEventListener('mouseleave', () => {
      mouse.x = 0.5; mouse.y = 0.5; hoveredNode = null;
    });

    // Scroll reveal via IntersectionObserver
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          visible = true;
          entryProgress = 0;
        } else {
          visible = false;
        }
      });
    }, { threshold: 0.1 });
    io.observe(section);

    initCards();
    render();
  }

  // Reduced-motion: skip all animation
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.getElementById('network-viz');
      if (s) { s.style.opacity = '1'; visible = true; entryProgress = 1; }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
