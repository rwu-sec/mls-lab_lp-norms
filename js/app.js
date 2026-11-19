/**
 * app.js
 * Main controller connecting navigation tabs, shared sample/uploaded image state,
 * and the three interactive lab modules (PerceptibilityLab, LocalizationLab, GeometryViz).
 */

document.addEventListener('DOMContentLoaded', () => {
  let currentImage = SampleImages.getPreset('beagle');

  // Initialize all interactive modules
  PerceptibilityLab.init(currentImage);
  LocalizationLab.init(currentImage);
  GeometryViz.init();

  // Tab Navigation
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const imageToolbar = document.getElementById('global-image-bar');

  navTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;

      navTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      tabPanes.forEach((pane) => {
        pane.classList.toggle('active', pane.id === `tab-${targetId}`);
      });

      // Show shared image picker banner on the two image-based tabs
      if (imageToolbar) {
        imageToolbar.style.display =
          targetId === 'perceptibility' || targetId === 'localization' ? 'flex' : 'none';
      }

      if (targetId === 'geometry') {
        // Resize canvases once visible so DPI & dimensions are exact
        requestAnimationFrame(() => {
          GeometryViz.resizeCanvases();
          GeometryViz.render();
        });
      }
    });
  });

  // Shared Sample Image Selector
  const selectImage = document.getElementById('select-sample-image');
  const inputUpload = document.getElementById('input-upload-image');
  const currentImgBadge = document.getElementById('current-image-badge');

  function applyImage(imgObj) {
    currentImage = imgObj;
    if (currentImgBadge) {
      currentImgBadge.textContent = `${imgObj.name} (${imgObj.width}×${imgObj.height})`;
    }
    PerceptibilityLab.setImage(imgObj);
    LocalizationLab.setImage(imgObj);
  }

  selectImage.addEventListener('change', () => {
    const val = selectImage.value;
    if (val === 'custom') return;
    applyImage(SampleImages.getPreset(val));
  });

  inputUpload.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const customImg = await SampleImages.loadUploadedFile(file);
      // Add or select custom option
      let opt = selectImage.querySelector('option[value="custom"]');
      if (!opt) {
        opt = document.createElement('option');
        opt.value = 'custom';
        selectImage.appendChild(opt);
      }
      opt.textContent = `Uploaded: ${file.name}`;
      selectImage.value = 'custom';
      applyImage(customImg);
    } catch (err) {
      console.error('Failed to load custom image:', err);
    }
  });
});
