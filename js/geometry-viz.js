/**
 * geometry-viz.js
 * Tab 3: 2D Feature Space Geometry, Lp Unit Balls & Optimization Contours (Slides 15–18).
 * Interactive draggable decision boundary showing the exact minimum-Lp adversarial
 * perturbation v* and a live "Why not p = 4?" convergence chart.
 */

const GeometryViz = (() => {
  let state = {
    p: 2, // 0 means L0, Infinity means Linf
    showOverlays: {
      l1: true,
      l2: true,
      l4: false,
      linf: true
    },
    showBoundary: true,
    // Decision boundary normal angle & distance from origin (world coords in [-2.2, 2.2])
    boundaryAngle: 0.52, // radians (~30 deg, so |w1| != |w2|, highlighting L1 axis sparsity!)
    boundaryDist: 1.05,
    dragging: false
  };

  let mainCanvas, mainCtx;
  let convCanvas, convCtx;
  let els = {};

  // World coordinate range: [-2.2, 2.2] on both axes
  const WORLD_RANGE = 2.2;

  function init() {
    mainCanvas = document.getElementById('geom-main-canvas');
    mainCtx = mainCanvas.getContext('2d');
    convCanvas = document.getElementById('geom-conv-canvas');
    convCtx = convCanvas.getContext('2d');

    els = {
      pPills: document.querySelectorAll('#tab-geometry .p-pill'),
      pSlider: document.getElementById('geom-p-slider'),
      pVal: document.getElementById('geom-p-val'),
      chkBoundary: document.getElementById('geom-chk-boundary'),
      chkL1: document.getElementById('geom-chk-l1'),
      chkL2: document.getElementById('geom-chk-l2'),
      chkL4: document.getElementById('geom-chk-l4'),
      chkLinf: document.getElementById('geom-chk-linf'),
      // Telemetry
      statV1: document.getElementById('geom-stat-v1'),
      statV2: document.getElementById('geom-stat-v2'),
      statLp: document.getElementById('geom-stat-lp'),
      statLpLabel: document.getElementById('geom-stat-lp-label'),
      statShape: document.getElementById('geom-stat-shape'),
      insightBox: document.getElementById('geom-insight-box')
    };

    bindEvents();
    resizeCanvases();
    window.addEventListener('resize', () => {
      if (document.getElementById('tab-geometry').classList.contains('active')) {
        resizeCanvases();
        render();
      }
    });
    render();
  }

  function resizeCanvases() {
    if (!mainCanvas || !convCanvas) return;
    const dpr = window.devicePixelRatio || 1;

    const mainRect = mainCanvas.parentElement.getBoundingClientRect();
    if (mainRect.width > 0) {
      mainCanvas.width = Math.round(mainRect.width * dpr);
      mainCanvas.height = Math.round(mainRect.height * dpr);
      mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const convRect = convCanvas.getBoundingClientRect();
    if (convRect.width > 0) {
      convCanvas.width = Math.round(convRect.width * dpr);
      convCanvas.height = Math.round(convRect.height * dpr);
      convCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function sliderToP(val) {
    const t = parseFloat(val); // 0 to 100
    if (t <= 1) return 0;
    if (t >= 99) return Infinity;
    if (t <= 20) return 0.2 + ((t - 1) / 19) * 0.8; // 0.2 -> 1.0
    if (t <= 50) return 1.0 + ((t - 20) / 30) * 1.0; // 1.0 -> 2.0
    if (t <= 80) return 2.0 + ((t - 50) / 30) * 2.0; // 2.0 -> 4.0
    return 4.0 + ((t - 80) / 19) * 8.0; // 4.0 -> 12.0
  }

  function pToSlider(p) {
    if (p === 0) return 0;
    if (!isFinite(p)) return 100;
    if (p <= 1) return 1 + ((p - 0.2) / 0.8) * 19;
    if (p <= 2) return 20 + (p - 1) * 30;
    if (p <= 4) return 50 + ((p - 2) / 2) * 30;
    return Math.min(98, 80 + ((p - 4) / 8) * 19);
  }

  function formatP(p) {
    if (p === 0) return 'p → 0 (L₀)';
    if (!isFinite(p)) return 'p → ∞ (L∞)';
    return `p = ${p.toFixed(2).replace(/\.00$/, '')}`;
  }

  function bindEvents() {
    els.pPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        els.pPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const raw = pill.dataset.p;
        state.p = raw === 'inf' ? Infinity : parseFloat(raw);
        els.pSlider.value = pToSlider(state.p);
        els.pVal.textContent = formatP(state.p);
        render();
      });
    });

    els.pSlider.addEventListener('input', () => {
      state.p = sliderToP(els.pSlider.value);
      els.pVal.textContent = formatP(state.p);
      els.pPills.forEach((pill) => {
        const raw = pill.dataset.p;
        const pillP = raw === 'inf' ? Infinity : parseFloat(raw);
        pill.classList.toggle('active', pillP === state.p || (isFinite(pillP) && isFinite(state.p) && Math.abs(pillP - state.p) < 0.03));
      });
      render();
    });

    els.chkBoundary.addEventListener('change', () => {
      state.showBoundary = els.chkBoundary.checked;
      render();
    });
    els.chkL1.addEventListener('change', () => {
      state.showOverlays.l1 = els.chkL1.checked;
      render();
    });
    els.chkL2.addEventListener('change', () => {
      state.showOverlays.l2 = els.chkL2.checked;
      render();
    });
    els.chkL4.addEventListener('change', () => {
      state.showOverlays.l4 = els.chkL4.checked;
      render();
    });
    els.chkLinf.addEventListener('change', () => {
      state.showOverlays.linf = els.chkLinf.checked;
      render();
    });

    // Pointer interaction to drag the decision boundary in 2D
    const getWorldFromEvent = (e) => {
      const rect = mainCanvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      return screenToWorld(px, py, rect.width, rect.height);
    };

    const onDown = (e) => {
      if (!state.showBoundary) return;
      state.dragging = true;
      updateBoundaryFromPoint(getWorldFromEvent(e));
    };

    const onMove = (e) => {
      if (!state.dragging) return;
      e.preventDefault();
      updateBoundaryFromPoint(getWorldFromEvent(e));
    };

    const onUp = () => {
      state.dragging = false;
    };

    mainCanvas.addEventListener('mousedown', onDown);
    mainCanvas.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
  }

  function updateBoundaryFromPoint(pt) {
    const dist = Math.hypot(pt.x, pt.y);
    if (dist < 0.35) return;
    state.boundaryAngle = Math.atan2(pt.y, pt.x);
    state.boundaryDist = Math.max(0.45, Math.min(1.65, dist));
    render();
  }

  function worldToScreen(wx, wy, width, height) {
    const scale = Math.min(width, height) / (WORLD_RANGE * 2);
    return {
      x: width / 2 + wx * scale,
      y: height / 2 - wy * scale,
      scale
    };
  }

  function screenToWorld(sx, sy, width, height) {
    const scale = Math.min(width, height) / (WORLD_RANGE * 2);
    return {
      x: (sx - width / 2) / scale,
      y: (height / 2 - sy) / scale
    };
  }

  /**
   * Compute exact minimum-Lp perturbation v* = (v1, v2) on hyperplane w1*v1 + w2*v2 = b
   */
  function solveMinNormPerturbation(p, angle, dist) {
    const w1 = Math.cos(angle);
    const w2 = Math.sin(angle);
    const b = dist;
    const aw1 = Math.abs(w1);
    const aw2 = Math.abs(w2);

    let v1 = 0;
    let v2 = 0;
    let radius = 0;

    if (!isFinite(p)) {
      // Linf: hits corner of square where |v1| = |v2| = b / (|w1| + |w2|)
      radius = b / (aw1 + aw2);
      v1 = (w1 >= 0 ? 1 : -1) * radius;
      v2 = (w2 >= 0 ? 1 : -1) * radius;
    } else if (p <= 1.001) {
      // L0, L0.5, L1: hits coordinate axis of larger |wi| (sparse!)
      if (aw1 >= aw2) {
        v1 = b / w1;
        v2 = 0;
        radius = p === 0 ? 1 : Math.abs(v1);
      } else {
        v1 = 0;
        v2 = b / w2;
        radius = p === 0 ? 1 : Math.abs(v2);
      }
    } else {
      // 1 < p < Infinity: Hölder dual exponent q = p / (p - 1)
      const q = p / (p - 1);
      const wq = Math.pow(Math.pow(aw1, q) + Math.pow(aw2, q), 1 / q);
      radius = b / wq;
      const wqPowQ = Math.pow(wq, q);
      v1 = (w1 >= 0 ? 1 : -1) * (Math.pow(aw1, q - 1) / wqPowQ) * b;
      v2 = (w2 >= 0 ? 1 : -1) * (Math.pow(aw2, q - 1) / wqPowQ) * b;
    }

    return { v1, v2, radius, w1, w2, b };
  }

  function drawLpBall(ctx, width, height, p, radius, strokeColor, fillColor, lineWidth = 2.5, dashed = false) {
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    if (dashed) ctx.setLineDash([5, 4]);

    if (p === 0) {
      // L0 pseudo-norm: coordinate axes (cross)
      const r = Math.max(radius, 1.0);
      const pL = worldToScreen(-r, 0, width, height);
      const pR = worldToScreen(r, 0, width, height);
      const pT = worldToScreen(0, r, width, height);
      const pB = worldToScreen(0, -r, width, height);
      ctx.beginPath();
      ctx.moveTo(pL.x, pL.y);
      ctx.lineTo(pR.x, pR.y);
      ctx.moveTo(pT.x, pT.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const steps = 240;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 2;
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      let x, y;
      if (!isFinite(p)) {
        const m = Math.max(Math.abs(c), Math.abs(s));
        x = (c / m) * radius;
        y = (s / m) * radius;
      } else {
        const denom = Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), 1 / p);
        x = (c / denom) * radius;
        y = (s / denom) * radius;
      }
      const pt = worldToScreen(x, y, width, height);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    ctx.stroke();
    ctx.restore();
  }

  function render() {
    if (!mainCanvas || !convCanvas) return;
    const rect = mainCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width <= 0 || height <= 0) return;

    const ctx = mainCtx;
    ctx.clearRect(0, 0, width, height);

    // 1. Background subtle grid
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(71, 85, 105, 0.22)';
    ctx.lineWidth = 1;
    for (let g = -2; g <= 2; g += 0.5) {
      const p1 = worldToScreen(g, -WORLD_RANGE, width, height);
      const p2 = worldToScreen(g, WORLD_RANGE, width, height);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const h1 = worldToScreen(-WORLD_RANGE, g, width, height);
      const h2 = worldToScreen(WORLD_RANGE, g, width, height);
      ctx.beginPath();
      ctx.moveTo(h1.x, h1.y);
      ctx.lineTo(h2.x, h2.y);
      ctx.stroke();
    }

    // 2. Decision Boundary & Adversarial Region (if enabled)
    const sol = solveMinNormPerturbation(state.p, state.boundaryAngle, state.boundaryDist);
    if (state.showBoundary) {
      const { w1, w2, b } = sol;
      // Tangent vector along hyperplane
      const tx = -w2;
      const ty = w1;
      const bx = w1 * b;
      const by = w2 * b;

      // Shade adversarial half-space w·v >= b
      const L = 6;
      const pA = worldToScreen(bx - tx * L, by - ty * L, width, height);
      const pB = worldToScreen(bx + tx * L, by + ty * L, width, height);
      const pC = worldToScreen(bx + tx * L + w1 * L, by + ty * L + w2 * L, width, height);
      const pD = worldToScreen(bx - tx * L + w1 * L, by - ty * L + w2 * L, width, height);

      ctx.save();
      ctx.fillStyle = 'rgba(244, 63, 94, 0.14)';
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.lineTo(pC.x, pC.y);
      ctx.lineTo(pD.x, pD.y);
      ctx.closePath();
      ctx.fill();

      // Elliptical loss contours inside adversarial region (echoing Slide 16!)
      const targetX = bx + w1 * 0.55;
      const targetY = by + w2 * 0.55;
      const tc = worldToScreen(targetX, targetY, width, height);
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      for (const r of [0.22, 0.42, 0.62]) {
        ctx.save();
        ctx.translate(tc.x, tc.y);
        ctx.rotate(-state.boundaryAngle);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * tc.scale * 0.65, r * tc.scale * 1.15, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.setLineDash([]);

      // Draw crisp decision boundary line
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();

      // Draggable handle on boundary normal point
      const hPt = worldToScreen(bx, by, width, height);
      ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
      ctx.beginPath();
      ctx.arc(hPt.x, hPt.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // 3. Coordinate axes
    const origin = worldToScreen(0, 0, width, height);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(width, origin.y);
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, height);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 12px "JetBrains Mono", monospace';
    ctx.fillText('Δx₁ (Pixel 1)', width - 108, origin.y - 8);
    ctx.fillText('Δx₂ (Pixel 2)', origin.x + 8, 20);

    // 4. Reference Unit Balls (radius = 1.0)
    if (state.showOverlays.linf) {
      drawLpBall(ctx, width, height, Infinity, 1.0, 'rgba(168, 85, 247, 0.5)', null, 1.5, true);
    }
    if (state.showOverlays.l4) {
      drawLpBall(ctx, width, height, 4, 1.0, 'rgba(236, 72, 153, 0.65)', null, 1.5, true);
    }
    if (state.showOverlays.l2) {
      drawLpBall(ctx, width, height, 2, 1.0, 'rgba(56, 189, 248, 0.5)', null, 1.5, true);
    }
    if (state.showOverlays.l1) {
      drawLpBall(ctx, width, height, 1, 1.0, 'rgba(245, 158, 11, 0.55)', null, 1.5, true);
    }

    // 5. Active Lp Ball (either touching the decision boundary or unit radius = 1.0)
    const activeRadius = state.showBoundary ? (state.p === 0 ? Math.max(Math.abs(sol.v1), Math.abs(sol.v2)) : sol.radius) : 1.0;
    const activeColor =
      state.p === 0 ? '#f43f5e' :
      !isFinite(state.p) ? '#a855f7' :
      Math.abs(state.p - 1) < 0.05 ? '#f59e0b' :
      '#38bdf8';

    drawLpBall(
      ctx,
      width,
      height,
      state.p,
      activeRadius,
      activeColor,
      state.p === 0 ? null : 'rgba(56, 189, 248, 0.11)',
      3.0,
      false
    );

    // 6. Original point x at origin
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText('x (Clean)', origin.x + 8, origin.y + 16);

    // 7. Optimal Perturbation Point v* on Decision Boundary
    if (state.showBoundary) {
      const vPt = worldToScreen(sol.v1, sol.v2, width, height);

      // Vector arrow from origin to v*
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(vPt.x, vPt.y);
      ctx.stroke();

      // Contact point marker
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(vPt.x, vPt.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillText(`x′ (${sol.v1.toFixed(2)}, ${sol.v2.toFixed(2)})`, vPt.x + 10, vPt.y - 8);
    }

    updateTelemetry(sol);
    renderConvergenceChart(sol);
  }

  function updateTelemetry(sol) {
    els.statV1.textContent = sol.v1.toFixed(3);
    els.statV2.textContent = sol.v2.toFixed(3);
    els.statLpLabel.textContent =
      state.p === 0 ? 'L₀ Norm' : !isFinite(state.p) ? 'L∞ Norm' : `L${state.p.toFixed(1).replace(/\.0$/, '')} Norm`;
    els.statLp.textContent = state.p === 0 ? '1 pixel' : sol.radius.toFixed(3);

    let shape = 'Superellipse';
    let insight = '';
    if (state.p === 0) {
      shape = 'Axes Cross (Non-convex)';
      insight = '<strong>L₀ (p → 0):</strong> The ball collapses onto the coordinate axes. Only <strong>one pixel</strong> changes (the one most aligned with the boundary), while the other stays 0. Non-differentiable and non-convex—hard for gradient descent!';
    } else if (state.p < 0.98) {
      shape = 'Astroid / Star (Non-convex)';
      insight = `<strong>p = ${state.p.toFixed(2)} (&lt; 1):</strong> Non-convex star shape. Like L₁ and L₀, the minimum perturbation snaps straight to a coordinate axis (sparse), and optimization is non-convex.`;
    } else if (Math.abs(state.p - 1) <= 0.05) {
      shape = 'Diamond (Convex, Sparse)';
      insight = '<strong>L₁ (Diamond):</strong> Sharp corners lie on the coordinate axes! Notice how the expanding diamond almost always hits the decision boundary at a corner—forcing <strong>one pixel to 0 and dumping the entire change onto the other pixel</strong> (sparsity -> visible artifacts).';
    } else if (state.p < 1.95) {
      shape = 'Rounded Diamond';
      insight = `<strong>1 &lt; p &lt; 2 (p = ${state.p.toFixed(2)}):</strong> As noted on Slide 16, values between 1 and 2 are theoretically valid convex norms, but offer <strong>no practical or perceptual advantage</strong> over L₂ or L∞.`;
    } else if (Math.abs(state.p - 2) <= 0.05) {
      shape = 'Circle (Euclidean)';
      insight = '<strong>L₂ (Circle):</strong> Smooth rotational symmetry! The touching point is the exact <strong>orthogonal projection</strong> onto the boundary—balancing changes proportionally across both pixels without sharp spikes.';
    } else if (isFinite(state.p)) {
      shape = 'Squircle (Approaches Square)';
      insight = `<strong>p = ${state.p.toFixed(1)} (&gt; 2):</strong> Look how rapidly the shape approaches the purple dashed L∞ square! As Slide 18 explains, high powers are dominated by the single largest component, making L₄ practically indistinguishable from L∞—just slower to compute.`;
    } else {
      shape = 'Square (Max Norm)';
      insight = '<strong>L∞ (Square):</strong> Notice where the square touches the decision boundary: right at a <strong>corner</strong> where <em>|Δx₁| = |Δx₂| = ε</em>! That is why L∞ attacks (FGSM / PGD) change <strong>every pixel by the same tiny bound ±ε</strong>.';
    }

    els.statShape.textContent = shape;
    els.insightBox.innerHTML = insight;
  }

  /**
   * Secondary Chart: Plots ||v||_p as p goes from 1 to 12, showing rapid convergence to L_inf (Slide 18)
   */
  function renderConvergenceChart(sol) {
    const rect = convCanvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    if (W <= 0 || H <= 0) return;

    const ctx = convCtx;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, W, H);

    // Use a representative 2D vector (or current L2 solution) so curve is always informative
    const l2Sol = solveMinNormPerturbation(2, state.boundaryAngle, state.boundaryDist);
    const a1 = Math.max(0.25, Math.abs(l2Sol.v1));
    const a2 = Math.max(0.25, Math.abs(l2Sol.v2));
    const linfVal = Math.max(a1, a2);
    const l1Val = a1 + a2;

    const pad = { l: 44, r: 18, t: 22, b: 30 };
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;

    const pMin = 1;
    const pMax = 12;
    const yMin = linfVal * 0.82;
    const yMax = l1Val * 1.08;

    const mapX = (p) => pad.l + ((p - pMin) / (pMax - pMin)) * plotW;
    const mapY = (y) => pad.t + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

    // Axes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, pad.t + plotH);
    ctx.lineTo(pad.l + plotW, pad.t + plotH);
    ctx.stroke();

    // Dashed L_inf asymptote
    const yInf = mapY(linfVal);
    ctx.save();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, yInf);
    ctx.lineTo(pad.l + plotW, yInf);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#c084fc';
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillText(`L∞ = ${linfVal.toFixed(2)}`, pad.l + plotW - 72, yInf - 6);

    // Curve ||v||_p for p in [1, 12]
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 110; i++) {
      const p = pMin + (i / 110) * (pMax - pMin);
      const val = Math.pow(Math.pow(a1, p) + Math.pow(a2, p), 1 / p);
      const x = mapX(p);
      const y = mapY(val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Key markers at p = 1, 2, 4
    const keyPs = [
      { p: 1, label: 'L₁', color: '#f59e0b' },
      { p: 2, label: 'L₂', color: '#38bdf8' },
      { p: 4, label: 'L₄', color: '#ec4899' }
    ];
    keyPs.forEach((kp) => {
      const val = Math.pow(Math.pow(a1, kp.p) + Math.pow(a2, kp.p), 1 / kp.p);
      const x = mapX(kp.p);
      const y = mapY(val);
      ctx.fillStyle = kp.color;
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillText(`${kp.label} (${val.toFixed(2)})`, x + 5, y - 6);
    });

    // X-axis ticks
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    for (const p of [1, 2, 4, 6, 8, 10, 12]) {
      const x = mapX(p);
      ctx.fillText(`p=${p}`, x - 10, pad.t + plotH + 16);
    }

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillText('Slide 18: ||v||ₚ converges rapidly to L∞ for p > 2', pad.l + 4, 14);
  }

  return {
    init,
    resizeCanvases,
    render
  };
})();
