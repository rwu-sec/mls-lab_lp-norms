/**
 * norms-core.js
 * Mathematical engine for Lp norms (L0, L1, L2, Lp, Linf), adversarial perturbation
 * generation under norm constraints, spatial localization masks (Ozbulak et al., 2020),
 * and simulated decision-boundary confidence.
 */

const NormsCore = (() => {
  // Deterministic PRNG for reproducible spatial patterns
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp255(v) {
    return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
  }

  /**
   * Compute a deterministic, image-dependent pseudo-gradient field g in [-1, 1]
   * representing the direction that pushes the image across a classifier's decision boundary.
   * Combines image edge saliency + structured sinusoidal adversarial ripples + high-freq noise.
   */
  const gradCache = new WeakMap();

  function getAdversarialGradient(imgObj) {
    if (gradCache.has(imgObj.data)) {
      return gradCache.get(imgObj.data);
    }

    const { width: W, height: H, data } = imgObj;
    const totalPixels = W * H;
    const grad = new Float32Array(totalPixels * 3);
    const saliency = new Float32Array(totalPixels);
    const rand = mulberry32(421337 + W * 31);

    // 1. Compute luminance for edge detection
    const lum = new Float32Array(totalPixels);
    for (let p = 0; p < totalPixels; p++) {
      const idx = p * 4;
      lum[p] = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;
    }

    // 2. Build structured adversarial gradient per pixel & channel
    let maxSal = 1e-6;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        const xl = Math.max(0, x - 1);
        const xr = Math.min(W - 1, x + 1);
        const yu = Math.max(0, y - 1);
        const yd = Math.min(H - 1, y + 1);

        const gx = lum[y * W + xr] - lum[y * W + xl];
        const gy = lum[yd * W + x] - lum[yu * W + x];
        const edge = Math.sqrt(gx * gx + gy * gy);

        // Structured adversarial wave (mimics CNN conv filter sensitivity)
        const wave1 = Math.sin(x * 0.42 + y * 0.31) * Math.cos(x * 0.19 - y * 0.47);
        const wave2 = Math.sin((x + y) * 0.65);
        const centerDist = Math.hypot((x / W) - 0.5, (y / H) - 0.5);
        const centerWeight = Math.exp(-centerDist * centerDist * 3.5);

        // Saliency favors object edges + central subject
        const sal = 0.25 + 1.8 * edge + 0.65 * centerWeight + 0.25 * rand();
        saliency[p] = sal;
        if (sal > maxSal) maxSal = sal;

        for (let c = 0; c < 3; c++) {
          const n = (rand() * 2 - 1) * 0.55;
          const phase = c * 2.094; // 120 deg channel phase shift
          const dir = 0.45 * Math.sin(x * 0.37 - y * 0.29 + phase) + 0.3 * wave1 + 0.15 * wave2 + n;
          grad[p * 3 + c] = dir * sal;
        }
      }
    }

    // Normalize saliency to [0, 1] and rank pixels by saliency descending
    const rankedPixels = new Uint32Array(totalPixels);
    for (let p = 0; p < totalPixels; p++) {
      saliency[p] /= maxSal;
      rankedPixels[p] = p;
    }
    rankedPixels.sort((a, b) => saliency[b] - saliency[a]);

    // Precompute L2 norm of full gradient
    let gradL2Sq = 0;
    for (let i = 0; i < grad.length; i++) {
      gradL2Sq += grad[i] * grad[i];
    }
    const gradL2 = Math.sqrt(gradL2Sq) || 1;

    const result = { grad, saliency, rankedPixels, gradL2 };
    gradCache.set(imgObj.data, result);
    return result;
  }

  /**
   * Compute all Lp metrics between original and adversarial RGBA Uint8ClampedArrays.
   * Distances are computed in standard ML [0, 1] pixel range (matching Slide 19 / Ozbulak et al.)
   * as well as 8-bit [0, 255] for Linf (matching Slide 16's 8/255).
   */
  function computeNormMetrics(origData, advData) {
    const totalPixels = origData.length / 4;
    let l0Pixels = 0;
    let l0Channels = 0;
    let l1Sum = 0;
    let l2SumSq = 0;
    let l4Sum = 0;
    let linfMax = 0;

    for (let p = 0; p < totalPixels; p++) {
      const idx = p * 4;
      let pixelChanged = false;
      for (let c = 0; c < 3; c++) {
        const diff255 = Math.abs(advData[idx + c] - origData[idx + c]);
        if (diff255 > 0) {
          pixelChanged = true;
          l0Channels++;
          const d = diff255 / 255;
          l1Sum += d;
          const d2 = d * d;
          l2SumSq += d2;
          l4Sum += d2 * d2;
          if (d > linfMax) linfMax = d;
        }
      }
      if (pixelChanged) l0Pixels++;
    }

    return {
      totalPixels,
      l0Pixels,
      l0Fraction: l0Pixels / totalPixels,
      l0Channels,
      l1: l1Sum,
      l2: Math.sqrt(l2SumSq),
      l4: Math.pow(l4Sum, 0.25),
      linf: linfMax,
      linf255: Math.round(linfMax * 255)
    };
  }

  /**
   * Compute simulated classifier confidence (Clean vs Adversarial)
   * Demonstrates Slide 15's trade-off: Clean (99%) -> Decision Boundary (50:50) -> Misclassified (99%)
   */
  function computeClassifierConfidence(imgObj, advData, normType) {
    const { origData } = { origData: imgObj.data };
    const { grad, gradL2 } = getAdversarialGradient(imgObj);
    const totalPixels = origData.length / 4;

    // Dot product of actual perturbation with adversarial gradient direction
    let dot = 0;
    let l0Pixels = 0;
    let l1 = 0;
    let l2Sq = 0;
    for (let p = 0; p < totalPixels; p++) {
      const idx = p * 4;
      let changed = false;
      for (let c = 0; c < 3; c++) {
        const d = (advData[idx + c] - origData[idx + c]) / 255;
        if (d !== 0) {
          changed = true;
          l1 += Math.abs(d);
          l2Sq += d * d;
          dot += d * grad[p * 3 + c];
        }
      }
      if (changed) l0Pixels++;
    }

    // Scale sensitivity so typical imperceptible thresholds (e.g. Linf ~ 5-8/255, L2 ~ 3-6, L0 ~ 3-5 px)
    // smoothly cross the 50% decision boundary into misclassification!
    const scaleFactor = Math.sqrt(totalPixels / (160 * 160));
    const alignedScore = Math.abs(dot) / (gradL2 * 1.15 * Math.max(0.35, scaleFactor));

    // Also give sparse high-contrast attacks (L0/L1) realistic logit leverage on vulnerable pixels
    let sparseBoost = 0;
    if (normType === 'l0' && l0Pixels > 0) {
      sparseBoost = Math.log2(1 + l0Pixels) * 2.35 * Math.min(1, Math.sqrt(l2Sq) / 0.6);
    } else if (normType === 'l1') {
      sparseBoost = (l1 / (28 * Math.max(0.25, scaleFactor))) * 1.25;
    }

    // Clean logit margin starts at +4.6 (~99% clean confidence)
    // Perturbation pushes margin across 0 (50% boundary) toward -4.6 (~99% adversarial)
    const cleanMargin = 4.6;
    const shift = alignedScore * 1.35 + sparseBoost;
    const logit = cleanMargin - shift;

    const cleanProb = 1 / (1 + Math.exp(-logit));
    const advProb = 1 - cleanProb;
    const isFooled = advProb >= 0.5;
    const nearBoundary = Math.abs(advProb - 0.5) < 0.12;

    return {
      cleanProb,
      advProb,
      isFooled,
      nearBoundary,
      margin: -logit // positive means past the decision boundary
    };
  }

  /**
   * Generate a norm-constrained adversarial image for Tab 1 (Perceptibility Lab).
   * @param {Object} imgObj - Sample image object
   * @param {string} normType - 'linf' | 'l2' | 'l1' | 'l0'
   * @param {number} param - Norm-specific budget:
   *   - linf: epsilon in [0, 64] (8-bit levels, e.g., 8 means 8/255)
   *   - l2:   target L2 budget in [0, 35] (in [0, 1] pixel scale)
   *   - l1:   target L1 budget in [0, 450] (sparse concentrated budget)
   *   - l0:   exact number of altered pixels k in [0, 500]
   */
  function generateNormPerturbation(imgObj, normType, param) {
    const { width: W, height: H, data: orig } = imgObj;
    const totalPixels = W * H;
    const out = new Uint8ClampedArray(orig);
    const { grad, rankedPixels, gradL2 } = getAdversarialGradient(imgObj);

    if (param <= 0) {
      return {
        data: out,
        metrics: computeNormMetrics(orig, out),
        confidence: computeClassifierConfidence(imgObj, out, normType)
      };
    }

    if (normType === 'linf') {
      // L-infinity (FGSM / PGD style): every pixel shifts by up to +/- eps (uniformly spread)
      const eps255 = param; // e.g., 8 out of 255
      for (let p = 0; p < totalPixels; p++) {
        const idx = p * 4;
        for (let c = 0; c < 3; c++) {
          const g = grad[p * 3 + c];
          const step = g >= 0 ? eps255 : -eps255;
          out[idx + c] = clamp255(orig[idx + c] + step);
        }
      }
    } else if (normType === 'l2') {
      // L2 (Euclidean / C&W / L2-PGD style): smooth energy-bounded perturbation proportional to gradient
      // Scale factor so ||delta||_2 ≈ param (in [0, 1] range)
      const scale255 = (param / gradL2) * 255;
      for (let p = 0; p < totalPixels; p++) {
        const idx = p * 4;
        for (let c = 0; c < 3; c++) {
          const step = grad[p * 3 + c] * scale255;
          out[idx + c] = clamp255(orig[idx + c] + step);
        }
      }
    } else if (normType === 'l1') {
      // L1 (Manhattan / Sparse style): encourages sparsity -> large, noticeable changes
      // concentrated in a moderate subset of high-saliency pixels (Slide 17)
      const targetL1 = param;
      // Moderate sparse subset (~0.4% to 1.8% of image) so changes are visibly high-contrast
      const activeCount = Math.min(
        totalPixels,
        Math.max(4, Math.floor(totalPixels * (0.004 + 0.014 * Math.min(1, targetL1 / 350))))
      );
      // Average per-channel change needed on those active pixels
      const perChannel = (targetL1 / (activeCount * 3)) * 255;
      for (let i = 0; i < activeCount; i++) {
        const p = rankedPixels[i];
        const idx = p * 4;
        // Weight slightly by rank so top pixels get strong visible shifts
        const rankWeight = 1.45 - 0.9 * (i / activeCount);
        for (let c = 0; c < 3; c++) {
          const sign = grad[p * 3 + c] >= 0 ? 1 : -1;
          // Push away from clipping edge if needed so the change is actually realized
          let delta = sign * perChannel * rankWeight;
          if (orig[idx + c] + delta > 255 || orig[idx + c] + delta < 0) {
            delta = -delta;
          }
          out[idx + c] = clamp255(orig[idx + c] + delta);
        }
      }
    } else if (normType === 'l0') {
      // L0 (Count of altered pixels / One-Pixel & Few-Pixel Attack):
      // Only exact k pixels are modified, with maximum adversarial contrast!
      const k = Math.min(totalPixels, Math.max(0, Math.round(param)));
      // Pick well-spaced high-saliency pixels so 1-pixel / 3-pixel / 5-pixel attacks are clearly visible
      const stride = Math.max(1, Math.floor(totalPixels / Math.max(k * 7, 40)));
      const chosen = new Set();
      let cursor = 0;
      while (chosen.size < k && cursor < totalPixels) {
        const p = rankedPixels[(cursor * stride) % totalPixels];
        chosen.add(p);
        cursor++;
      }
      // Fallback fill if stride collided
      for (let i = 0; chosen.size < k && i < totalPixels; i++) {
        chosen.add(rankedPixels[i]);
      }

      for (const p of chosen) {
        const idx = p * 4;
        // Push each channel to the extreme opposite side of [0, 255] for maximal perturbation
        for (let c = 0; c < 3; c++) {
          out[idx + c] = orig[idx + c] > 127 ? 0 : 255;
        }
      }
    }

    return {
      data: out,
      metrics: computeNormMetrics(orig, out),
      confidence: computeClassifierConfidence(imgObj, out, normType)
    };
  }

  /**
   * Generate the 4 spatial localization patterns from Slide 19 (Ozbulak et al., 2020):
   * 'none' (No localization), 'center' (Center patch), 'frame' (Outer border frame), 'random' (Random subset)
   */
  function buildSpatialMask(W, H, pattern) {
    const total = W * H;
    const mask = new Uint8Array(total);
    if (pattern === 'none') {
      mask.fill(1);
      return mask;
    }

    if (pattern === 'center') {
      // Center square covering ~18% of pixels (sqrt(0.18) ≈ 0.424 of width/height)
      const halfW = Math.round(W * 0.215);
      const halfH = Math.round(H * 0.215);
      const cx = Math.floor(W / 2);
      const cy = Math.floor(H / 2);
      for (let y = cy - halfH; y < cy + halfH; y++) {
        for (let x = cx - halfW; x < cx + halfW; x++) {
          if (x >= 0 && x < W && y >= 0 && y < H) {
            mask[y * W + x] = 1;
          }
        }
      }
      return mask;
    }

    if (pattern === 'frame') {
      // Outer border frame covering ~18% of pixels (border width ≈ 0.048 * W)
      const bw = Math.max(2, Math.round(W * 0.048));
      const bh = Math.max(2, Math.round(H * 0.048));
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (x < bw || x >= W - bw || y < bh || y >= H - bh) {
            mask[y * W + x] = 1;
          }
        }
      }
      return mask;
    }

    if (pattern === 'random') {
      // Randomly scattered ~18% of pixels (deterministic seed)
      const rand = mulberry32(998877);
      for (let i = 0; i < total; i++) {
        if (rand() < 0.18) mask[i] = 1;
      }
      return mask;
    }

    mask.fill(1);
    return mask;
  }

  /**
   * Generate localized perturbation for Tab 2 (Slide 19 comparison)
   * @param {Object} imgObj
   * @param {string} pattern - 'none' | 'center' | 'frame' | 'random'
   * @param {string} matchMode - 'match_l2' | 'match_linf' | 'slide19_realistic'
   * @param {number} intensity - slider in [0.1, 1.0]
   */
  function generateLocalizedPerturbation(imgObj, pattern, matchMode, intensity) {
    const { width: W, height: H, data: orig } = imgObj;
    const totalPixels = W * H;
    const mask = buildSpatialMask(W, H, pattern);
    const { grad } = getAdversarialGradient(imgObj);
    const out = new Uint8ClampedArray(orig);

    // Compute masked gradient L2 norm & max
    let maskedL2Sq = 0;
    let maskedMax = 1e-6;
    for (let p = 0; p < totalPixels; p++) {
      if (!mask[p]) continue;
      for (let c = 0; c < 3; c++) {
        const g = grad[p * 3 + c];
        maskedL2Sq += g * g;
        if (Math.abs(g) > maskedMax) maskedMax = Math.abs(g);
      }
    }
    const maskedL2 = Math.sqrt(maskedL2Sq) || 1;
    const scaleDim = Math.sqrt(totalPixels / (160 * 160));

    let scale255 = 0;
    if (matchMode === 'match_l2') {
      // Hold L2 constant across all 4 patterns!
      // Target L2 scales with intensity (e.g., 2.0 to 18.0 on 160x160)
      const targetL2 = intensity * 16.0 * scaleDim;
      scale255 = (targetL2 / maskedL2) * 255;
    } else if (matchMode === 'match_linf') {
      // Hold Linf constant across all 4 patterns!
      const targetLinf255 = intensity * 48; // up to 48/255
      scale255 = targetLinf255 / maskedMax;
    } else {
      // 'slide19_realistic': mimics Ozbulak et al. Slide 19 table where all 4 fool the classifier:
      // No localization needs tiny Linf (~0.02-0.12) across 99% pixels -> moderate-high L2
      // Center focuses on subject -> low L0 (~0.18), low L2, small Linf
      // Frame is far from subject -> low L0 (~0.18), high L2 & high Linf needed to fool classifier!
      // Random -> low L0 (~0.18), moderate L2 & Linf
      const multipliers = {
        none: 9.5,
        center: 4.5,
        frame: 14.5,
        random: 7.0
      };
      const targetL2 = intensity * (multipliers[pattern] || 8.0) * scaleDim;
      scale255 = (targetL2 / maskedL2) * 255;
    }

    for (let p = 0; p < totalPixels; p++) {
      if (!mask[p]) continue;
      const idx = p * 4;
      for (let c = 0; c < 3; c++) {
        let delta = grad[p * 3 + c] * scale255;
        // For match_linf ensure uniform sign-clipped appearance
        if (matchMode === 'match_linf') {
          const cap = intensity * 48;
          delta = Math.max(-cap, Math.min(cap, delta));
        }
        out[idx + c] = clamp255(orig[idx + c] + delta);
      }
    }

    return {
      data: out,
      metrics: computeNormMetrics(orig, out)
    };
  }

  /**
   * Render an amplified absolute difference heatmap |adv - orig| * amp onto a canvas
   */
  function renderDiffHeatmap(canvas, origData, advData, width, height, amp = 6) {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(width, height);
    const dst = imgData.data;

    for (let i = 0; i < origData.length; i += 4) {
      const dr = Math.abs(advData[i] - origData[i]);
      const dg = Math.abs(advData[i + 1] - origData[i + 1]);
      const db = Math.abs(advData[i + 2] - origData[i + 2]);
      const mag = Math.min(255, ((dr + dg + db) / 3) * amp);

      // Vivid dark-navy -> cyan -> pink/yellow heatmap
      if (mag < 1) {
        dst[i] = 9;
        dst[i + 1] = 13;
        dst[i + 2] = 22;
      } else if (mag < 90) {
        const t = mag / 90;
        dst[i] = Math.round(9 + t * 47);
        dst[i + 1] = Math.round(13 + t * 176);
        dst[i + 2] = Math.round(22 + t * 226);
      } else if (mag < 180) {
        const t = (mag - 90) / 90;
        dst[i] = Math.round(56 + t * 188);
        dst[i + 1] = Math.round(189 - t * 126);
        dst[i + 2] = Math.round(248 - t * 154);
      } else {
        const t = (mag - 180) / 75;
        dst[i] = Math.round(244 + t * 11);
        dst[i + 1] = Math.round(63 + t * 180);
        dst[i + 2] = Math.round(94 - t * 40);
      }
      dst[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Helper to paint an RGBA Uint8ClampedArray onto a canvas
   */
  function renderRGBA(canvas, data, width, height) {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const imgData = new ImageData(new Uint8ClampedArray(data), width, height);
    ctx.putImageData(imgData, 0, 0);
  }

  return {
    computeNormMetrics,
    computeClassifierConfidence,
    generateNormPerturbation,
    generateLocalizedPerturbation,
    renderDiffHeatmap,
    renderRGBA
  };
})();
