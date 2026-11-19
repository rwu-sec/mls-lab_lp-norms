# Lₚ Norms & Adversarial Imperceptibility: Interactive Browser Lab

An interactive, zero-dependency educational JavaScript lab demonstrating how **$L_0$, $L_1$, $L_2$, and $L_\infty$ norms** measure and shape the visual perceptibility of adversarial perturbations—aligned with **MLS Chapter 04-2 (Slides 15–19)** and *Ozbulak et al. (2020)*.

## 🚀 How to Run Locally

No build tools, npm packages, or server installations are required!
Simply open `index.html` directly in any modern browser:

- Double-click **`index.html`** to open it in Chrome, Firefox, Edge, or Safari, or
- Serve it locally via Python or Node:
  ```bash
  # Python 3
  python -m http.server 8000

  # Or Node
  npx serve .
  ```
  Then navigate to `http://localhost:8000`.

---

## 🕹️ Interactive Tabs & Pedagogical Goals

1. **🖼️ Perceptibility Lab (Slides 15–17)**:
   - Explore norm-constrained perturbations on built-in course-inspired scenes (**Beagle on Grass**, **Stop Sign**, **Satellite Stadium**, **MNIST Digit '3'**) or **upload your own local image**.
   - Switch between **Single-Norm Deep Dive** (Original, Perturbed with press-and-hold *Peek Original*, and Amplified Heatmap $|x' - x|$) and **4-Way Side-by-Side Comparison** ($L_\infty, L_2, L_1, L_0$).
   - Includes quick course presets such as **$\epsilon = 8/255$** (Slide 16 standard $L_\infty$ threshold) and **1-Pixel / 3-Pixel / 5-Pixel** $L_0$ attacks (Slide 11 & 17).
   - Live **Decision Boundary Trade-Off Bar** (Slide 15) showing Clean → Fragile Boundary (50:50) → High-Confidence Misclassification.

2. **🧩 Spatial Patterns (Slide 19 — Ozbulak et al., 2020)**:
   - Side-by-side comparison of **No Localization**, **Center**, **Frame**, and **Random** spatial perturbation masks.
   - Switch between **Slide 19: Equal Attack Goal**, **Hold $L_2$ Constant**, and **Hold $L_\infty$ Constant** to observe how $L_0$, $L_2$, and $L_\infty$ can strongly disagree with human visual perception.

3. **📐 2D Unit Balls & Geometry (Slides 15–18)**:
   - Interactive 2D feature-space visualizer with continuous exponent slider ($p \to 0$ through $0.5, 1, 1.5, 2, 4, \infty$) and toggleable reference unit-ball overlays.
   - **Draggable Decision Boundary & Loss Contours** solving analytically for the exact minimum-$L_p$-norm adversarial perturbation $v^*$—visually proving why $L_1$ yields sparse axis-aligned spikes, $L_2$ yields orthogonal balance, and $L_\infty$ yields equal uniform shifts at the square's corners.
   - Live **Slide 18 Convergence Plot** showing $\|v\|_p$ converging rapidly to $\|v\|_\infty$ for $p > 2$.

4. **📚 Theory & Course Notes**:
   - Concise summary of all formulas, norm comparison table, and explanations of why $1 < p < 2$ and $p > 2$ are rarely used in practice.

---

## 📁 Project Structure

```
LpNorms/
├── index.html                  # Main 4-tab interactive interface
├── README.md                   # Documentation & pedagogical guide
├── css/
│   └── style.css               # Dark theme & responsive layout (matching HopSkipJump)
└── js/
    ├── sample-images.js        # Procedural offline test images + custom image upload loader
    ├── norms-core.js           # Lp norm calculations, perturbation generators & spatial masks
    ├── perceptibility-lab.js   # Tab 1: Single-norm & 4-way side-by-side perceptibility lab
    ├── localization-lab.js     # Tab 2: Slide 19 spatial localization & metric paradox lab
    ├── geometry-viz.js         # Tab 3: Interactive 2D Lp unit balls & p -> inf convergence chart
    └── app.js                  # Tab navigation & shared image state controller
```
