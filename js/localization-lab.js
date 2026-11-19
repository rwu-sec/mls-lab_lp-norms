/**
 * localization-lab.js
 * Tab 2: Spatial Localization & Metric Paradox (Slide 19 — Ozbulak et al., 2020).
 * Compares No Localization, Center, Frame, and Random spatial perturbation patterns
 * side-by-side to demonstrate how L0, L2, and Linf disagree with human perception.
 */

const LocalizationLab = (() => {
  const PATTERNS = ['none', 'center', 'frame', 'random'];

  const MODE_INSIGHTS = {
    slide19_realistic:
      '<strong>Slide 19 (Ozbulak et al., 2020) — Equal Attack Goal:</strong> Notice the paradox! <strong>No Localization</strong> alters ~99% of pixels (<em>L₀ ≈ 0.99</em>) with a large <em>L₂</em>, yet its tiny <em>L∞</em> makes it very hard to spot. Meanwhile, <strong>Frame</strong> alters only ~18% of pixels (low <em>L₀</em>), but pushing the classifier from the border requires a much larger <em>L₂</em> and <em>L∞</em>, making the border frame visibly stand out!',
    match_l2:
      '<strong>Constant L₂ Energy Experiment:</strong> All four images have the <em>exact same L₂ norm</em>! Yet <strong>No Localization</strong> spreads that energy across 100% of pixels (tiny <em>L∞</em>, nearly invisible), whereas <strong>Center</strong>, <strong>Frame</strong>, and <strong>Random</strong> pack the same energy into ~18% of pixels—forcing <em>L∞</em> ~2.4× higher and making the distortion immediately noticeable. Equal <em>L₂</em> does <strong>not</strong> mean equal perceptibility!',
    match_linf:
      '<strong>Constant L∞ Bound Experiment:</strong> All four images share the <em>exact same L∞ max pixel change</em>. Notice how <strong>No Localization</strong> has ~5.5× higher <em>L₀</em> and ~2.4× higher <em>L₂</em> than the localized patterns, even though every single altered pixel changes by the same maximum bound!'
  };

  let state = {
    imgObj: null,
    matchMode: 'slide19_realistic',
    intensity: 0.55,
    showDiff: false
  };

  let els = {};

  function init(initialImg) {
    state.imgObj = initialImg;

    els = {
      modePills: document.querySelectorAll('#tab-localization .loc-mode-pill'),
      intensitySlider: document.getElementById('loc-intensity-slider'),
      intensityVal: document.getElementById('loc-intensity-val'),
      showDiffCheck: document.getElementById('loc-show-diff'),
      insightBox: document.getElementById('loc-insight-box')
    };

    els.modePills.forEach((pill) => {
      pill.addEventListener('click', () => {
        els.modePills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        state.matchMode = pill.dataset.mode;
        render();
      });
    });

    els.intensitySlider.addEventListener('input', () => {
      state.intensity = parseInt(els.intensitySlider.value, 10) / 100;
      els.intensityVal.textContent = `${els.intensitySlider.value}%`;
      render();
    });

    els.showDiffCheck.addEventListener('change', () => {
      state.showDiff = els.showDiffCheck.checked;
      render();
    });

    render();
  }

  function setImage(imgObj) {
    state.imgObj = imgObj;
    PATTERNS.forEach((pat) => {
      const box = document.getElementById(`loc-box-${pat}`);
      if (box) box.classList.toggle('pixelated', !!imgObj.pixelated);
    });
    render();
  }

  function classifyLevel(val, minVal, maxVal) {
    if (maxVal - minVal < 1e-4) return '';
    const ratio = (val - minVal) / (maxVal - minVal);
    if (ratio >= 0.72) return 'high';
    if (ratio <= 0.28) return 'low';
    return 'med';
  }

  function render() {
    if (!state.imgObj) return;
    const img = state.imgObj;

    const results = {};
    PATTERNS.forEach((pat) => {
      results[pat] = NormsCore.generateLocalizedPerturbation(
        img,
        pat,
        state.matchMode,
        state.intensity
      );
    });

    // Compute min/max across the 4 patterns for relative color coding
    const l0Vals = PATTERNS.map((p) => results[p].metrics.l0Fraction);
    const l2Vals = PATTERNS.map((p) => results[p].metrics.l2);
    const linfVals = PATTERNS.map((p) => results[p].metrics.linf);

    const minL0 = Math.min(...l0Vals), maxL0 = Math.max(...l0Vals);
    const minL2 = Math.min(...l2Vals), maxL2 = Math.max(...l2Vals);
    const minLinf = Math.min(...linfVals), maxLinf = Math.max(...linfVals);

    PATTERNS.forEach((pat) => {
      const { data, metrics } = results[pat];
      const canvas = document.getElementById(`loc-canvas-${pat}`);
      if (state.showDiff) {
        NormsCore.renderDiffHeatmap(canvas, img.data, data, img.width, img.height, 6);
      } else {
        NormsCore.renderRGBA(canvas, data, img.width, img.height);
      }

      const elL0 = document.getElementById(`loc-l0-${pat}`);
      const elL2 = document.getElementById(`loc-l2-${pat}`);
      const elLinf = document.getElementById(`loc-linf-${pat}`);

      elL0.textContent = metrics.l0Fraction.toFixed(2);
      elL0.className = `mini-norm-val ${classifyLevel(metrics.l0Fraction, minL0, maxL0)}`;

      elL2.textContent = metrics.l2.toFixed(2);
      elL2.className = `mini-norm-val ${classifyLevel(metrics.l2, minL2, maxL2)}`;

      elLinf.textContent = metrics.linf.toFixed(2);
      elLinf.className = `mini-norm-val ${classifyLevel(metrics.linf, minLinf, maxLinf)}`;
    });

    els.insightBox.innerHTML = MODE_INSIGHTS[state.matchMode];
  }

  return {
    init,
    setImage,
    render
  };
})();
