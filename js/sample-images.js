/**
 * sample-images.js
 * Procedural, self-contained RGB test images inspired by the course slides
 * (mls-chap04-2.pdf: Beagle on grass, Stop Sign, Satellite Stadium, MNIST Digit '3')
 * plus support for uploading any custom local image.
 *
 * Course Material: Machine Learning Security (Prof. Dr. Stephan Kleber,
 * in cooperation with Prof. Dr. Frank Kargl, Ulm University)
 * Copyright (c) 2026 Prof. Dr. Stephan Kleber
 * SPDX-License-Identifier: MIT
 */

const SampleImages = (() => {
  const SIZE = 160;

  // Deterministic PRNG (Mulberry32) so sample textures are consistent
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

  function createCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  /**
   * 1. Beagle on Grass (inspired by Slide 19 - Ozbulak et al. 2020)
   */
  function generateBeagle() {
    const c = createCanvas(SIZE, SIZE);
    const ctx = c.getContext('2d');
    const rand = mulberry32(101);

    // Rich grass background with vertical gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, SIZE);
    bgGrad.addColorStop(0, '#2d5a27');
    bgGrad.addColorStop(0.5, '#3b7330');
    bgGrad.addColorStop(1, '#264d21');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Grass blades texture
    for (let i = 0; i < 650; i++) {
      const x = rand() * SIZE;
      const y = rand() * SIZE;
      const len = 4 + rand() * 8;
      const g = Math.floor(85 + rand() * 75);
      const r = Math.floor(35 + rand() * 35);
      const b = Math.floor(25 + rand() * 25);
      ctx.strokeStyle = `rgb(${r},${g},${b})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 4, y - len);
      ctx.stroke();
    }

    // Shadow under dog
    ctx.fillStyle = 'rgba(12, 28, 10, 0.45)';
    ctx.beginPath();
    ctx.ellipse(82, 126, 40, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (black saddle + tan flanks + white chest)
    ctx.fillStyle = '#26211e';
    ctx.beginPath();
    ctx.ellipse(86, 100, 34, 22, -0.08, 0, Math.PI * 2);
    ctx.fill();

    // Tan rear & shoulder
    ctx.fillStyle = '#b97a45';
    ctx.beginPath();
    ctx.ellipse(106, 104, 18, 16, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // White chest & front legs
    ctx.fillStyle = '#f1ede6';
    ctx.beginPath();
    ctx.ellipse(66, 103, 17, 19, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Legs
    ctx.fillRect(55, 110, 8, 18);
    ctx.fillRect(68, 112, 8, 17);
    ctx.fillRect(102, 112, 8, 16);
    ctx.fillRect(113, 108, 7, 17);

    // Tail (white tip)
    ctx.strokeStyle = '#f1ede6';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(118, 92);
    ctx.quadraticCurveTo(130, 78, 126, 68);
    ctx.stroke();

    // Head (tan)
    ctx.fillStyle = '#c4834b';
    ctx.beginPath();
    ctx.ellipse(62, 74, 17, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Floppy dark brown ears
    ctx.fillStyle = '#5c381f';
    ctx.beginPath();
    ctx.ellipse(47, 79, 6, 13, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(76, 80, 6, 13, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // White blaze & muzzle
    ctx.fillStyle = '#f5f2eb';
    ctx.beginPath();
    ctx.ellipse(61, 80, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(59, 62, 4, 15);

    // Nose & Eyes
    ctx.fillStyle = '#181412';
    ctx.beginPath();
    ctx.ellipse(61, 79, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(54, 71, 2.5, 0, Math.PI * 2);
    ctx.arc(68, 71, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye catchlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(53.3, 70.3, 0.8, 0, Math.PI * 2);
    ctx.arc(67.3, 70.3, 0.8, 0, Math.PI * 2);
    ctx.fill();

    return {
      id: 'beagle',
      name: 'Beagle on Grass (Slide 19)',
      cleanLabel: 'Beagle',
      advLabel: 'Ostrich',
      width: SIZE,
      height: SIZE,
      data: ctx.getImageData(0, 0, SIZE, SIZE).data,
      pixelated: false
    };
  }

  /**
   * 2. Stop Sign (inspired by Slide 11 - Autonomous Driving / One-Pixel Attack)
   */
  function generateStopSign() {
    const c = createCanvas(SIZE, SIZE);
    const ctx = c.getContext('2d');

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, SIZE * 0.72);
    sky.addColorStop(0, '#3b82c4');
    sky.addColorStop(1, '#93c5fd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Soft clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(32, 34, 16, 0, Math.PI * 2);
    ctx.arc(48, 30, 20, 0, Math.PI * 2);
    ctx.arc(64, 35, 14, 0, Math.PI * 2);
    ctx.fill();

    // Distant horizon / trees / road
    ctx.fillStyle = '#365336';
    ctx.fillRect(0, 108, SIZE, 20);
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(0, 128, SIZE, 32);

    // Metal pole
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(76, 112, 8, 48);
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(81, 112, 3, 48);

    // Helper for octagon
    function drawOctagon(cx, cy, r) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 8) + (i * Math.PI) / 4;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    // Outer red octagon
    drawOctagon(80, 72, 48);
    ctx.fillStyle = '#b91c1c';
    ctx.fill();

    // White border ring
    drawOctagon(80, 72, 43);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Inner bright red fill
    drawOctagon(80, 72, 40);
    ctx.fillStyle = '#dc2626';
    ctx.fill();

    // STOP text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('STOP', 80, 73);

    return {
      id: 'stopsign',
      name: 'Stop Sign (Traffic Classifier)',
      cleanLabel: 'Stop Sign',
      advLabel: 'Speed Limit 80',
      width: SIZE,
      height: SIZE,
      data: ctx.getImageData(0, 0, SIZE, SIZE).data,
      pixelated: false
    };
  }

  /**
   * 3. Satellite Stadium (inspired by Slide 8 - HopSkipJumpAttack on Satellite Images)
   */
  function generateStadium() {
    const c = createCanvas(SIZE, SIZE);
    const ctx = c.getContext('2d');
    const rand = mulberry32(303);

    // Urban asphalt background
    ctx.fillStyle = '#4b5052';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Roads & parking grid
    ctx.fillStyle = '#62686b';
    ctx.fillRect(118, 0, 18, SIZE);
    ctx.fillRect(0, 128, SIZE, 16);

    // Subtle city blocks / rooftops
    for (let i = 0; i < 45; i++) {
      const x = rand() * SIZE;
      const y = rand() * SIZE;
      const w = 6 + rand() * 14;
      const h = 6 + rand() * 14;
      const v = Math.floor(70 + rand() * 45);
      ctx.fillStyle = `rgb(${v},${v - 2},${v - 5})`;
      ctx.fillRect(x, y, w, h);
    }

    // Outer stadium concrete ring
    ctx.fillStyle = '#8b9296';
    ctx.beginPath();
    ctx.ellipse(68, 72, 54, 48, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Tiered seating bowl
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.ellipse(68, 72, 46, 40, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    for (let r = 34; r <= 44; r += 3.5) {
      ctx.beginPath();
      ctx.ellipse(68, 72, r, r * 0.87, -0.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Baseball field green turf
    ctx.fillStyle = '#3f7d36';
    ctx.beginPath();
    ctx.ellipse(70, 70, 31, 26, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Dirt infield diamond
    ctx.fillStyle = '#b89668';
    ctx.beginPath();
    ctx.moveTo(62, 85);
    ctx.lineTo(80, 78);
    ctx.lineTo(74, 61);
    ctx.lineTo(56, 68);
    ctx.closePath();
    ctx.fill();

    // Inner grass diamond
    ctx.fillStyle = '#4c9141';
    ctx.beginPath();
    ctx.moveTo(63, 81);
    ctx.lineTo(75, 76);
    ctx.lineTo(71, 65);
    ctx.lineTo(59, 70);
    ctx.closePath();
    ctx.fill();

    // Pitcher mound
    ctx.fillStyle = '#c4a478';
    ctx.beginPath();
    ctx.arc(67, 73, 2.5, 0, Math.PI * 2);
    ctx.fill();

    return {
      id: 'stadium',
      name: 'Satellite Stadium (Slide 8)',
      cleanLabel: 'Stadium',
      advLabel: 'Airplane',
      width: SIZE,
      height: SIZE,
      data: ctx.getImageData(0, 0, SIZE, SIZE).data,
      pixelated: false
    };
  }

  /**
   * 4. MNIST Handwritten Digit '3' (inspired by Slides 3-4 - Simple Evasion Attack)
   * Rendered at 28x28 and upscaled cleanly to 160x160? Even better: native 28x28 so L0 pixel counts are exact MNIST pixels!
   */
  function generateMnist3() {
    const W = 28;
    const c = createCanvas(W, W);
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, W, W);

    // Draw clean anti-aliased handwritten '3'
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(9, 7);
    ctx.bezierCurveTo(15, 4, 21, 7, 19, 11.5);
    ctx.bezierCurveTo(18, 13.5, 14, 14, 12.5, 14);
    ctx.bezierCurveTo(16, 14, 21, 15.5, 20, 20);
    ctx.bezierCurveTo(19, 23.5, 12, 24.5, 8.5, 21.5);
    ctx.stroke();

    return {
      id: 'mnist3',
      name: "MNIST Digit '3' (28×28, Slide 4)",
      cleanLabel: 'Digit 3',
      advLabel: 'Digit 7',
      width: W,
      height: W,
      data: ctx.getImageData(0, 0, W, W).data,
      pixelated: true
    };
  }

  const cache = {};

  function getPreset(id) {
    if (!cache[id]) {
      if (id === 'beagle') cache[id] = generateBeagle();
      else if (id === 'stopsign') cache[id] = generateStopSign();
      else if (id === 'stadium') cache[id] = generateStadium();
      else if (id === 'mnist3') cache[id] = generateMnist3();
      else cache[id] = generateBeagle();
    }
    return cache[id];
  }

  /**
   * Load a user-uploaded image file and center-crop/resize to 160x160
   */
  function loadUploadedFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const c = createCanvas(SIZE, SIZE);
          const ctx = c.getContext('2d');
          // Center-crop square
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2;
          const sy = (img.height - side) / 2;
          ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
          const customObj = {
            id: 'custom',
            name: file.name || 'Custom Image',
            cleanLabel: 'Original Class',
            advLabel: 'Adversarial Class',
            width: SIZE,
            height: SIZE,
            data: ctx.getImageData(0, 0, SIZE, SIZE).data,
            pixelated: false
          };
          cache['custom'] = customObj;
          resolve(customObj);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return {
    getPreset,
    loadUploadedFile
  };
})();
