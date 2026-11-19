/**
 * perceptibility-lab.js
 * Tab 1: Interactive Image Perceptibility Lab.
 * Allows students to observe how L_inf, L_2, L_1, and L_0 constrained perturbations
 * affect visual perceptibility, classifier confidence, and all four Lp metrics simultaneously.
 *
 * Course Material: Machine Learning Security (Prof. Dr. Stephan Kleber,
 * in cooperation with Prof. Dr. Frank Kargl, Ulm University)
 * Copyright (c) 2026 Prof. Dr. Stephan Kleber
 * SPDX-License-Identifier: MIT
 */

const PerceptibilityLab = (() => {
  const NORM_CONFIGS = {
    linf: {
      name: 'L∞ Norm (Max Norm)',
      badge: 'L∞',
      sliderLabel: 'Max Pixel Change ε (8-bit)',
      min: 0,
      max: 64,
      step: 1,
      defaultVal: 8,
      formatVal: (v) => `${v}/255 (${(v / 255).toFixed(3)})`,
      presets: [
        { label: 'ε = 4/255', value: 4 },
        { label: 'ε = 8/255 (Slide 16)', value: 8 },
        { label: 'ε = 20/255', value: 20 },
        { label: 'ε = 40/255', value: 40 }
      ],
      insight: (v) =>
        v <= 10
          ? '<strong>L∞ (Max Norm):</strong> Every single pixel changes by at most ε, spreading tiny uniform noise across the whole image. Notice how <strong>L₀ ≈ 1.00</strong> (almost every pixel changed!), yet to the human eye the image looks virtually identical to the original.'
          : '<strong>L∞ (Max Norm):</strong> Even at higher ε, no individual pixel stands out as an outlier—instead, a uniform high-frequency haze or ripple appears evenly across the entire image.'
    },
    l2: {
      name: 'L₂ Norm (Euclidean Norm)',
      badge: 'L₂',
      sliderLabel: 'Total Euclidean Energy ||x′ − x||₂',
      min: 0,
      max: 35,
      step: 0.5,
      defaultVal: 6.0,
      formatVal: (v) => `${Number(v).toFixed(1)}`,
      presets: [
        { label: 'L₂ = 2.0', value: 2 },
        { label: 'L₂ = 6.0', value: 6 },
        { label: 'L₂ = 14.0', value: 14 },
        { label: 'L₂ = 28.0', value: 28 }
      ],
      insight: () =>
        '<strong>L₂ (Euclidean Norm):</strong> Limits the total cumulative squared energy across the image. Slightly larger changes are allowed on high-saliency edges and object contours, compensated by near-zero changes in flat background regions. Widely used in <strong>C&W</strong>, <strong>L₂-PGD</strong>, and <strong>HopSkipJump</strong>.'
    },
    l1: {
      name: 'L₁ Norm (Manhattan Distance)',
      badge: 'L₁',
      sliderLabel: 'Manhattan Budget ||x′ − x||₁',
      min: 0,
      max: 450,
      step: 5,
      defaultVal: 120,
      formatVal: (v) => `${Number(v).toFixed(0)}`,
      presets: [
        { label: 'L₁ = 40', value: 40 },
        { label: 'L₁ = 120', value: 120 },
        { label: 'L₁ = 250', value: 250 },
        { label: 'L₁ = 420', value: 420 }
      ],
      insight: () =>
        '<strong>L₁ (Manhattan Norm):</strong> Encourages <em>sparsity</em> along coordinate axes (the diamond corners in 2D). This concentrates large, high-contrast color/brightness shifts into a moderate subset of pixels—creating noticeable speckled artifacts. As Slide 17 explains, L₁ is generally <strong>avoided for imperceptible attacks</strong>.'
    },
    l0: {
      name: 'L₀ Pseudo-Norm (Altered Pixel Count)',
      badge: 'L₀',
      sliderLabel: 'Exact Number of Altered Pixels (k)',
      min: 0,
      max: 400,
      step: 1,
      defaultVal: 5,
      formatVal: (v) => `${Math.round(v)} px`,
      presets: [
        { label: '1-Pixel', value: 1 },
        { label: '3-Pixel', value: 3 },
        { label: '5-Pixel', value: 5 },
        { label: '100-Pixel', value: 100 }
      ],
      insight: (v) =>
        `<strong>L₀ (Count of Altered Pixels):</strong> Strictly restricts changes to <strong>${Math.round(v)} pixel(s)</strong>, leaving all other pixels 100% untouched—but allows arbitrary extreme color flips on those pixels (so <strong>L∞ spikes to ~1.00</strong>). Used in the famous <strong>One-Pixel / Few-Pixel Attack</strong> (Su et al., 2019).`
    }
  };

  let state = {
    imgObj: null,
    norm: 'linf',
    param: 8,
    amp: 6,
    viewMode: 'single', // 'single' | 'compare4'
    peekingOriginal: false
  };

  let els = {};

  function init(initialImg) {
    state.imgObj = initialImg;

    els = {
      normPills: document.querySelectorAll('#tab-perceptibility .norm-pill'),
      viewPills: document.querySelectorAll('#tab-perceptibility .view-mode-pill'),
      singleView: document.getElementById('percept-single-view'),
      compare4View: document.getElementById('percept-compare4-view'),
      sliderLabel: document.getElementById('percept-slider-label'),
      sliderVal: document.getElementById('percept-slider-val'),
      slider: document.getElementById('percept-slider'),
      presetsRow: document.getElementById('percept-presets'),
      ampSlider: document.getElementById('percept-amp-slider'),
      ampVal: document.getElementById('percept-amp-val'),
      // Canvases (single mode)
      canvasOrig: document.getElementById('p-canvas-orig'),
      canvasAdv: document.getElementById('p-canvas-adv'),
      canvasDiff: document.getElementById('p-canvas-diff'),
      advBox: document.getElementById('p-adv-box'),
      origBox: document.getElementById('p-orig-box'),
      diffBox: document.getElementById('p-diff-box'),
      advTitle: document.getElementById('p-adv-title'),
      diffFooter: document.getElementById('p-diff-footer'),
      // Metrics
      statL0: document.getElementById('p-stat-l0'),
      statL0Sub: document.getElementById('p-stat-l0-sub'),
      statL1: document.getElementById('p-stat-l1'),
      statL2: document.getElementById('p-stat-l2'),
      statLinf: document.getElementById('p-stat-linf'),
      statLinfSub: document.getElementById('p-stat-linf-sub'),
      cardL0: document.getElementById('p-card-l0'),
      cardL1: document.getElementById('p-card-l1'),
      cardL2: document.getElementById('p-card-l2'),
      cardLinf: document.getElementById('p-card-linf'),
      // Confidence
      confStatus: document.getElementById('p-conf-status'),
      confBarClean: document.getElementById('p-conf-bar-clean'),
      confBarAdv: document.getElementById('p-conf-bar-adv'),
      confLabelClean: document.getElementById('p-conf-label-clean'),
      confLabelAdv: document.getElementById('p-conf-label-adv'),
      // Insight
      insightBox: document.getElementById('p-insight-box'),
      // 4-way compare slider
      compareStrengthSlider: document.getElementById('p-compare4-strength'),
      compareStrengthVal: document.getElementById('p-compare4-strength-val'),
      compareShowDiff: document.getElementById('p-compare4-show-diff')
    };

    bindEvents();
    configureSliderForNorm(state.norm);
    render();
  }

  function bindEvents() {
    els.normPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        els.normPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        state.norm = pill.dataset.norm;
        configureSliderForNorm(state.norm);
        render();
      });
    });

    els.viewPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        els.viewPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        state.viewMode = pill.dataset.view;
        els.singleView.style.display = state.viewMode === 'single' ? 'block' : 'none';
        els.compare4View.style.display = state.viewMode === 'compare4' ? 'block' : 'none';
        render();
      });
    });

    els.slider.addEventListener('input', () => {
      state.param = parseFloat(els.slider.value);
      updateSliderDisplay();
      render();
    });

    els.ampSlider.addEventListener('input', () => {
      state.amp = parseInt(els.ampSlider.value, 10);
      els.ampVal.textContent = `${state.amp}×`;
      render();
    });

    // Hold mouse/touch on adversarial image to peek original
    const startPeek = () => {
      state.peekingOriginal = true;
      renderSinglePeek();
    };
    const endPeek = () => {
      if (state.peekingOriginal) {
        state.peekingOriginal = false;
        renderSinglePeek();
      }
    };
    els.advBox.addEventListener('mousedown', startPeek);
    els.advBox.addEventListener('touchstart', startPeek, { passive: true });
    window.addEventListener('mouseup', endPeek);
    window.addEventListener('touchend', endPeek);

    // 4-way compare controls
    els.compareStrengthSlider.addEventListener('input', () => {
      els.compareStrengthVal.textContent = `${els.compareStrengthSlider.value}%`;
      renderCompare4();
    });
    els.compareShowDiff.addEventListener('change', renderCompare4);
  }

  function configureSliderForNorm(norm) {
    const cfg = NORM_CONFIGS[norm];
    els.sliderLabel.textContent = cfg.sliderLabel;
    els.slider.min = cfg.min;
    els.slider.max = cfg.max;
    els.slider.step = cfg.step;
    state.param = cfg.defaultVal;
    els.slider.value = state.param;
    updateSliderDisplay();

    // Rebuild preset buttons
    els.presetsRow.innerHTML = '';
    cfg.presets.forEach((preset) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm';
      btn.textContent = preset.label;
      btn.addEventListener('click', () => {
        state.param = preset.value;
        els.slider.value = preset.value;
        updateSliderDisplay();
        render();
      });
      els.presetsRow.appendChild(btn);
    });
  }

  function updateSliderDisplay() {
    const cfg = NORM_CONFIGS[state.norm];
    els.sliderVal.textContent = cfg.formatVal(state.param);
  }

  function setImage(imgObj) {
    state.imgObj = imgObj;
    // Toggle pixelated rendering for 28x28 MNIST
    [els.origBox, els.advBox, els.diffBox].forEach((box) => {
      if (box) box.classList.toggle('pixelated', !!imgObj.pixelated);
    });
    document.querySelectorAll('#percept-compare4-view .image-canvas-box').forEach((box) => {
      box.classList.toggle('pixelated', !!imgObj.pixelated);
    });
    render();
  }

  let lastAdvData = null;

  function renderSinglePeek() {
    if (!state.imgObj || !lastAdvData) return;
    if (state.peekingOriginal) {
      NormsCore.renderRGBA(els.canvasAdv, state.imgObj.data, state.imgObj.width, state.imgObj.height);
      els.advTitle.textContent = '2. Viewing Original x (Release to see x′)';
    } else {
      NormsCore.renderRGBA(els.canvasAdv, lastAdvData, state.imgObj.width, state.imgObj.height);
      els.advTitle.textContent = `2. Perturbed Image x′ (${NORM_CONFIGS[state.norm].badge})`;
    }
  }

  function render() {
    if (!state.imgObj) return;
    if (state.viewMode === 'compare4') {
      renderCompare4();
      return;
    }

    const img = state.imgObj;
    const res = NormsCore.generateNormPerturbation(img, state.norm, state.param);
    lastAdvData = res.data;

    // 1. Original
    NormsCore.renderRGBA(els.canvasOrig, img.data, img.width, img.height);
    // 2. Adversarial (or peek)
    renderSinglePeek();
    // 3. Amplified difference heatmap
    NormsCore.renderDiffHeatmap(els.canvasDiff, img.data, res.data, img.width, img.height, state.amp);
    els.diffFooter.textContent = `Amplified |x′ − x| (${state.amp}×) — Dark = 0, Cyan → Pink → Yellow = Larger shift`;

    // Update live metrics
    const m = res.metrics;
    els.statL0.textContent = `${m.l0Pixels.toLocaleString()} px`;
    els.statL0Sub.textContent = `${(m.l0Fraction * 100).toFixed(1)}% of ${m.totalPixels.toLocaleString()} pixels`;
    els.statL1.textContent = m.l1.toFixed(1);
    els.statL2.textContent = m.l2.toFixed(2);
    els.statLinf.textContent = m.linf.toFixed(3);
    els.statLinfSub.textContent = `${m.linf255}/255 max channel shift`;

    // Highlight active norm card
    els.cardL0.classList.toggle('active-norm', state.norm === 'l0');
    els.cardL1.classList.toggle('active-norm', state.norm === 'l1');
    els.cardL2.classList.toggle('active-norm', state.norm === 'l2');
    els.cardLinf.classList.toggle('active-norm', state.norm === 'linf');

    // Update classifier confidence bar (Slide 15 decision boundary trade-off)
    const c = res.confidence;
    const cleanPct = (c.cleanProb * 100).toFixed(1);
    const advPct = (c.advProb * 100).toFixed(1);
    els.confBarClean.style.width = `${cleanPct}%`;
    els.confBarAdv.style.width = `${advPct}%`;
    els.confLabelClean.textContent = `${img.cleanLabel}: ${cleanPct}%`;
    els.confLabelAdv.textContent = `${img.advLabel}: ${advPct}%`;

    if (c.nearBoundary) {
      els.confStatus.className = 'status-pill warning';
      els.confStatus.textContent = 'On Decision Boundary (Fragile ~50:50)';
    } else if (c.isFooled) {
      els.confStatus.className = 'status-pill danger';
      els.confStatus.textContent = `Fooled → ${img.advLabel}`;
    } else {
      els.confStatus.className = 'status-pill success';
      els.confStatus.textContent = `Correct → ${img.cleanLabel}`;
    }

    // Update insight callout
    els.insightBox.innerHTML = NORM_CONFIGS[state.norm].insight(state.param);
  }

  function renderCompare4() {
    if (!state.imgObj) return;
    const img = state.imgObj;
    const strengthPct = parseInt(els.compareStrengthSlider.value, 10) / 100; // 0..1
    const showDiff = els.compareShowDiff.checked;
    const dimScale = Math.sqrt((img.width * img.height) / (160 * 160));

    // Calibrated budgets across norms at the chosen visual/attack strength
    const configs = [
      { key: 'linf', param: Math.round(strengthPct * 36) },
      { key: 'l2', param: +(strengthPct * 22 * dimScale).toFixed(1) },
      { key: 'l1', param: Math.round(strengthPct * 320 * dimScale) },
      { key: 'l0', param: Math.max(0, Math.round(strengthPct * (img.pixelated ? 25 : 140))) }
    ];

    configs.forEach(({ key, param }) => {
      const res = NormsCore.generateNormPerturbation(img, key, param);
      const canvas = document.getElementById(`c4-canvas-${key}`);
      if (showDiff) {
        NormsCore.renderDiffHeatmap(canvas, img.data, res.data, img.width, img.height, 6);
      } else {
        NormsCore.renderRGBA(canvas, res.data, img.width, img.height);
      }
      const m = res.metrics;
      document.getElementById(`c4-l0-${key}`).textContent =
        m.l0Pixels < 1000 ? `${m.l0Pixels} px` : `${(m.l0Fraction * 100).toFixed(0)}%`;
      document.getElementById(`c4-l2-${key}`).textContent = m.l2.toFixed(2);
      document.getElementById(`c4-linf-${key}`).textContent = `${m.linf255}/255`;
    });
  }

  return {
    init,
    setImage,
    render
  };
})();
