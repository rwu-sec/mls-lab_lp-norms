# Student Lab Tutorial: Exploring Adversarial Imperceptibility with $L_p$ Norms

**Estimated Duration:** 30 minutes (4 phases: 18 min hands-on exploration + 4 × 3 min group/pair discussions)  
**Prerequisites:** Open [`index.html`](index.html) in a modern web browser (Chrome, Firefox, Edge, or Safari). No installation or internet connection required.  
**Course Material:** *Machine Learning Security* — Lecturer: **Prof. Dr. Stephan Kleber** (lecture designed in cooperation with **Prof. Dr. Frank Kargl**, Ulm University) · Chapter 04-2 (Slides 15–19)  
**License:** Open Source ([MIT License](LICENSE)) — Copyright © 2026 Prof. Dr. Stephan Kleber

---

## ⏱️ Pacing Overview

| Phase | Topic & Lab Tab | Hands-On | Discussion | Total |
| :--- | :--- | :---: | :---: | :---: |
| **Phase 1** | Decision Boundary Trade-Off: $L_\infty$ vs. $L_2$ (*Perceptibility Lab*) | 5 min | 3 min | 8 min |
| **Phase 2** | Sparsity & Outliers: $L_1$ and $L_0$ (*Perceptibility Lab — 4-Way Compare*) | 5 min | 3 min | 8 min |
| **Phase 3** | The Metric Paradox: Spatial Localization (*Spatial Patterns — Slide 19*) | 4 min | 3 min | 7 min |
| **Phase 4** | Geometric Intuition & Why Not $L_4$? (*2D Unit Balls & Geometry*) | 4 min | 3 min | 7 min |
| **Total** | | **18 min** | **12 min** | **30 min** |

---

## Phase 1: The Imperceptibility Trade-Off — $L_\infty$ vs. $L_2$ (8 min)

**Tab:** `🖼️ Perceptibility Lab` (Single-Norm Deep Dive)  
**Goal:** Observe how $L_\infty$ and $L_2$ distribute perturbations across pixels and how perturbation size trades off against classifier confidence near the decision boundary.

### Hands-On Tasks (5 min)
1. **Inspect the standard $L_\infty$ bound ($\epsilon = 8/255$):**
   - [ ] Ensure the active image is **Beagle on Grass (Slide 19)** and the constrained norm is **`L∞`**.
   - [ ] Click the **`ε = 8/255 (Slide 16)`** preset button.
   - [ ] Press and hold on **Panel 2 (Perturbed Image $x'$)** to toggle back and forth with the clean original $x$. Can you spot any difference?
   - [ ] Look at **Live $L_p$ Norm Measurements**: note the values of **$L_\infty$**, **$L_2$**, and **$L_0$** (especially the percentage of altered pixels!).
2. **Explore the decision boundary trade-off (Slide 15):**
   - [ ] Drag the **Max Pixel Change $\epsilon$** slider slowly from `0` up to `40/255`.
   - [ ] Watch the **Classifier Confidence Bar** below the images: find the $\epsilon$ where the classifier sits right on the **50:50 Decision Boundary** (amber status), and compare it to where it reaches **>95% adversarial confidence**.
   - [ ] Switch the test image at the top to **Stop Sign (Traffic Classifier)** and repeat the peek test at `ε = 8/255` vs. `ε = 20/255`.
3. **Compare with the $L_2$ (Euclidean) norm:**
   - [ ] Switch the constrained norm pill to **`L₂`** and test presets `L₂ = 2.0`, `L₂ = 6.0`, and `L₂ = 14.0`.
   - [ ] Compare **Panel 3 (Perturbation Heatmap $|x' - x|$)** under `L₂` vs. `L∞`: where does `L₂` concentrate its energy compared to `L∞`?

### 💬 Discussion Checkpoint (3 min)
Share your observations with your neighbor or group:
1. Under $L_\infty$ at $\epsilon = 8/255$, **$L_0$ is 100%** (every pixel in the image was modified), yet the image looks clean. Why does changing *every* pixel stay imperceptible here?
2. What is the practical risk of placing an adversarial example right at the **50:50 decision boundary** vs. pushing it far past the boundary?
3. How does the spatial pattern in the **difference heatmap** differ between $L_\infty$ and $L_2$?

---

## Phase 2: Sparsity & Outliers — $L_1$ and $L_0$ Attacks (8 min)

**Tab:** `🖼️ Perceptibility Lab` (Single-Norm + 4-Way Side-by-Side)  
**Goal:** Discover why $L_1$ is avoided for imperceptible attacks, how $L_0$ enables One-Pixel/Few-Pixel attacks, and how all four norms compare side-by-side.

### Hands-On Tasks (5 min)
1. **Observe $L_1$ sparsity artifacts:**
   - [ ] Stay on **Stop Sign** (or **Beagle on Grass**), switch the norm pill to **`L₁`**, and test `L₁ = 120` and `L₁ = 250`.
   - [ ] Look closely at both the perturbed image and the heatmap. Notice how few pixels changed ($L_0$) compared to how strongly they changed ($L_\infty$).
2. **Test the $L_0$ (One-Pixel / Few-Pixel) attack:**
   - [ ] Switch the norm pill to **`L₀`** and click through **`1-Pixel`**, **`3-Pixel`**, **`5-Pixel`**, and **`100-Pixel`**.
   - [ ] Switch the test image to **MNIST Digit '3' (28×28)** and try `1-Pixel`, `3-Pixel`, and `5-Pixel`. Check the **$L_\infty$** metric when only 1 or 3 pixels are changed!
3. **Compare all four norms at once:**
   - [ ] Switch the top-right toggle in the visual card to **`4-Way Side-by-Side`**.
   - [ ] Test on **Stop Sign** and **Beagle on Grass** while moving the **Overall Attack Strength** slider between `20%` and `55%`.
   - [ ] Toggle **`Show Amplified Perturbation Heatmaps (6×)`** on and off to match what you see visually with where each norm puts its budget.

### 💬 Discussion Checkpoint (3 min)
Share your observations with your neighbor or group:
1. Why is the **$L_1$ norm** generally considered **unsuitable** for generating imperceptible adversarial images, even when its $L_2$ distance is smaller than an $L_\infty$ attack?
2. Under **$L_0$**, the $L_\infty$ norm spikes to nearly `1.0` (`255/255`). In what real-world or research scenarios is an $L_0$ constraint still useful?
3. Did you notice a difference in perceptibility between a textured image (**Beagle on Grass**) and a flat/high-contrast image (**Stop Sign** or **MNIST '3'**)? Why?

---

## Phase 3: The Metric Paradox — Spatial Localization (7 min)

**Tab:** `🧩 Spatial Patterns (Slide 19)`  
**Goal:** Reproduce the core finding of *Ozbulak et al. (2020)* (Slide 19): no single $L_p$ norm reliably predicts human visual perceptibility across different spatial perturbation layouts.

### Hands-On Tasks (4 min)
1. **Reproduce Slide 19 (Equal Attack Goal):**
   - [ ] Select **Beagle on Grass (Slide 19)** at the top.
   - [ ] In **`Slide 19: Equal Attack Goal`** mode (intensity ~`55%`), visually inspect all four panels: **1. No Localization**, **2. Center**, **3. Frame**, and **4. Random**.
   - [ ] Compare the color-coded **$L_0$**, **$L_2$**, and **$L_\infty$** numbers underneath each image. Which panel has the *highest* $L_0$? Which has the *highest* $L_2$ and $L_\infty$?
2. **Run the Constant-$L_2$ Paradox Experiment:**
   - [ ] Switch the mode pill to **`Hold L₂ Constant`** and set intensity to ~`65%`.
   - [ ] Verify that all four images report the **exact same $L_2$ value**. Now judge with your own eyes: which image looks the cleanest, and which looks the most distorted?
   - [ ] Check **`Reveal Perturbation Mask (6× Amplified)`** to see why the $L_\infty$ values diverge so sharply even though $L_2$ is identical.
3. **Compare with Constant-$L_\infty$:**
   - [ ] Switch to **`Hold L∞ Constant`** and note how $L_0$ and $L_2$ drop for the localized masks while $L_\infty$ stays identical.

### 💬 Discussion Checkpoint (3 min)
Share your observations with your neighbor or group:
1. In **`Hold L₂ Constant`** mode, all four perturbations have the exact same Euclidean ($L_2$) distance—yet they look completely different. Which pattern was easiest to spot, and why?
2. In **`Slide 19: Equal Attack Goal`**, **No Localization** has $L_0 \approx 1.00$ while **Frame** has $L_0 \approx 0.19$. If an automated benchmark only checked $L_0$, which attack would it falsely rank as "more imperceptible"?
3. Based on this experiment, why should adversarial robustness evaluations report **more than one metric** (or perceptual metrics alongside $L_p$ norms)?

---

## Phase 4: 2D Geometry & Why We Skip $p = 1.5$ and $p = 4$ (7 min)

**Tab:** `📐 2D Unit Balls & Geometry` (and optionally `📚 Theory & Course Notes`)  
**Goal:** Connect the visual behavior from Phases 1–3 to the 2D geometry of $L_p$ unit balls intersecting a decision boundary, and see why practitioners rarely use $1 < p < 2$ or $p > 2$.

### Hands-On Tasks (4 min)
1. **Watch the optimal perturbation $x'$ move with $p$:**
   - [ ] Make sure **`Show Draggable Decision Boundary & Loss Contours`** is checked.
   - [ ] Drag the red decision boundary line so it sits at an asymmetric angle (not 45° and not vertical/horizontal—for example, tilted at ~25°–35°).
   - [ ] Click through the exponent pills in order: **`L₀` → `L₁` → `L₂` → `L₄` → `L∞`** and watch the green optimal point **`x′`** and the **Pixel 1 ($\Delta x_1$) / Pixel 2 ($\Delta x_2$)** readouts.
   - [ ] Notice where **`x′`** lands for **`L₁`** (one coordinate drops to `0.000`!) vs. **`L₂`** (orthogonal projection) vs. **`L∞`** (`|Δx₁| = |Δx₂|`, right at the square's corner!).
2. **Test "Why not $L_{1.5}$ or $L_4$?" (Slides 16 & 18):**
   - [ ] Check **`Overlay L₄ Squircle (p = 4)`** alongside the **`Overlay L∞ Square`** and **`Overlay L₂ Circle`**.
   - [ ] Slowly drag the **Continuous Exponent $p$** slider from `p = 2` up to `p → ∞`.
   - [ ] Inspect the **Slide 18 Convergence Plot** below the canvas: compare the norm value at $L_1$, $L_2$, $L_4$, and the dashed $L_\infty$ asymptote.

### 💬 Discussion Checkpoint (3 min)
Wrap up with your group using what you observed across all four phases:
1. Looking at the 2D shapes, explain in one sentence **why $L_1$ produces sparse perturbations** (changing few pixels a lot) while **$L_\infty$ produces dense, uniform perturbations** (changing every pixel by the same small amount).
2. Looking at the **$L_4$ overlay** and the **convergence plot**, why don't adversarial attacks use $L_3$, $L_4$, or $L_{10}$ in practice?
3. **Final synthesis:** If you were designing a stealthy adversarial attack on an image classifier tomorrow, which $L_p$ norm would you choose—and what limitation of that norm would you still need to watch out for?

---

## 🌟 Optional Bonus (If You Finish Early)
- Go back to **`🖼️ Perceptibility Lab`**, click **`📁 Upload Image`**, and load a photo of your choice (e.g., a portrait, a landscape, or a screenshot with text).
- Find the largest $\epsilon$ under $L_\infty$ and the largest $L_2$ budget where you *cannot* distinguish $x'$ from $x$ using the **Hold to peek Original** button. Compare your thresholds with a classmate!

---

*Course material for **Machine Learning Security** by **Prof. Dr. Stephan Kleber** (designed in cooperation with **Prof. Dr. Frank Kargl**, Ulm University). Open source under the [MIT License](LICENSE). Copyright © 2026 Prof. Dr. Stephan Kleber.*
