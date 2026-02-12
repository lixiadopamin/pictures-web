/**
 * 图片工具箱 - 核心脚本
 * 模块：裁剪、压缩、转换、拼图
 */

(function () {
  'use strict';

  /* ========== 模块切换逻辑 ========== */
  const moduleCards = document.querySelectorAll('.module-card');
  const modulePanels = document.querySelectorAll('.module-panel');

  function switchModule(moduleId) {
    var card = document.querySelector('.module-card[data-module="' + moduleId + '"]');
    if (!card) return;
    moduleCards.forEach(function (c) {
      c.classList.remove('active');
      c.setAttribute('aria-pressed', 'false');
    });
    modulePanels.forEach(function (p) {
      var isActive = p.getAttribute('data-module') === moduleId;
      p.hidden = !isActive;
      if (isActive) p.classList.add('active');
      else p.classList.remove('active');
    });
    card.classList.add('active');
    card.setAttribute('aria-pressed', 'true');
  }

  moduleCards.forEach(function (card) {
    card.addEventListener('click', function () {
      switchModule(card.getAttribute('data-module'));
    });
  });

  if (window.location.hash) {
    var m = window.location.hash.slice(1);
    if (['crop','compress','convert','collage','listing'].indexOf(m) >= 0) {
      switchModule(m);
    }
  }
  window.addEventListener('hashchange', function () {
    var m = window.location.hash.slice(1);
    if (m && ['crop','compress','convert','collage','listing'].indexOf(m) >= 0) {
      switchModule(m);
    }
  });

  /* ========== 工具函数 ========== */
  function formatSize(bytes) {
    if (!bytes) return '--';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function createObjectURL(blob) {
    return URL.createObjectURL(blob);
  }

  function revokeObjectURL(url) {
    if (url && url.startsWith && url.startsWith('blob:')) URL.revokeObjectURL(url);
  }

  /**
   * 使用 Data URL 触发下载，减少 Windows「Internet 安全设置」拦截
   * （Blob URL 下载易被标记为来自网络，导致本地无法打开）
   */
  function downloadBlobAsFile(blob, filename) {
    const fr = new FileReader();
    fr.onload = function () {
      const a = document.createElement('a');
      a.href = fr.result;
      a.download = filename;
      a.click();
    };
    fr.readAsDataURL(blob);
  }

  function downloadDataUrlAsFile(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  /* ==================== 图片裁剪模块 ==================== */
  const cropUploadSection = document.getElementById('cropUploadSection');
  const cropUploadZone = document.getElementById('cropUploadZone');
  const cropFileInput = document.getElementById('cropFileInput');
  const cropEditorSection = document.getElementById('cropEditorSection');
  const cropResultSection = document.getElementById('cropResultSection');
  const cropCanvas = document.getElementById('cropCanvas');
  const cropConfirmBtn = document.getElementById('cropConfirmBtn');
  const cropResetBtn = document.getElementById('cropResetBtn');
  const cropOriginalPreview = document.getElementById('cropOriginalPreview');
  const cropResultPreview = document.getElementById('cropResultPreview');
  const cropOriginalSize = document.getElementById('cropOriginalSize');
  const cropResultSize = document.getElementById('cropResultSize');
  const cropDownloadBtn = document.getElementById('cropDownloadBtn');
  const cropReCropBtn = document.getElementById('cropReCropBtn');
  const cropReUploadBtn = document.getElementById('cropReUploadBtn');

  const RATIOS = { '1:1': 1, '3:4': 3/4, '4:3': 4/3, '3:5': 3/5, '5:3': 5/3, '9:16': 9/16, '16:9': 16/9 };

  let cropImg = null;
  let cropFile = null;
  let cropData = { x: 0, y: 0, w: 0, h: 0, ratio: 1 };
  let cropScale = 1;
  let cropDragging = false;
  let cropStartX = 0, cropStartY = 0, cropStartDataX = 0, cropStartDataY = 0;
  let cropResultBlob = null;
  let cropResultUrl = null;

  function parseRatio(str) {
    return RATIOS[str] || 1;
  }

  function computeCropRect(imgW, imgH, ratio) {
    let w, h;
    if (ratio >= 1) {
      w = Math.min(imgW, imgH * ratio);
      h = w / ratio;
    } else {
      h = Math.min(imgH, imgW / ratio);
      w = h * ratio;
    }
    const x = (imgW - w) / 2;
    const y = (imgH - h) / 2;
    return { x, y, w, h };
  }

  function drawCropCanvas() {
    if (!cropImg) return;
    const ctx = cropCanvas.getContext('2d');
    const maxW = 560;
    const maxH = 400;
    const imgW = cropImg.width;
    const imgH = cropImg.height;
    cropScale = Math.min(maxW / imgW, maxH / imgH, 1);
    const dispW = imgW * cropScale;
    const dispH = imgH * cropScale;
    cropCanvas.width = dispW;
    cropCanvas.height = dispH;
    ctx.drawImage(cropImg, 0, 0, imgW, imgH, 0, 0, dispW, dispH);

    // 绘制半透明遮罩（裁剪框外变暗）
    const d = cropData;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, dispW, d.y * cropScale);
    ctx.fillRect(0, (d.y + d.h) * cropScale, dispW, dispH - (d.y + d.h) * cropScale);
    ctx.fillRect(0, 0, d.x * cropScale, dispH);
    ctx.fillRect((d.x + d.w) * cropScale, 0, dispW - (d.x + d.w) * cropScale, dispH);

    // 裁剪框边框
    const sx = d.x * cropScale;
    const sy = d.y * cropScale;
    const sw = d.w * cropScale;
    const sh = d.h * cropScale;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.strokeRect(sx, sy, sw, sh);
  }

  function updateCropBox() {
    if (!cropImg) return;
    const r = parseRatio(document.querySelector('.ratio-btn.active')?.dataset?.ratio || '1:1');
    cropData.ratio = r;
    const rect = computeCropRect(cropImg.width, cropImg.height, r);
    cropData.x = rect.x;
    cropData.y = rect.y;
    cropData.w = rect.w;
    cropData.h = rect.h;
    drawCropCanvas();
  }

  function confirmCrop() {
    if (!cropImg || !cropFile) return;
    if (cropOriginalPreview.src && cropOriginalPreview.src.startsWith('blob:')) revokeObjectURL(cropOriginalPreview.src);
    const outW = cropData.w;
    const outH = cropData.h;
    const c = document.createElement('canvas');
    c.width = outW;
    c.height = outH;
    const ctx = c.getContext('2d');
    ctx.drawImage(cropImg, cropData.x, cropData.y, cropData.w, cropData.h, 0, 0, outW, outH);
    const isJpeg = cropScenario === 'store' ? false : /jpe?g/i.test(cropFile.type);
    c.toBlob(function (blob) {
      if (!blob) return;
      if (cropResultUrl) revokeObjectURL(cropResultUrl);
      cropResultBlob = blob;
      cropResultUrl = createObjectURL(blob);
      cropResultPreview.src = cropResultUrl;
      cropResultPreview.hidden = false;
      cropResultSize.textContent = '大小：' + formatSize(blob.size);
      cropOriginalPreview.src = createObjectURL(cropFile);
      cropOriginalPreview.hidden = false;
      cropOriginalSize.textContent = '大小：' + formatSize(cropFile.size);
      cropEditorSection.hidden = true;
      cropResultSection.hidden = false;
    }, isJpeg ? 'image/jpeg' : 'image/png', 0.95);
  }

  function resetCrop() {
    cropUploadSection.hidden = false;
    cropEditorSection.hidden = true;
    cropResultSection.hidden = true;
    if (cropResultUrl) revokeObjectURL(cropResultUrl);
    if (cropOriginalPreview.src && cropOriginalPreview.src.startsWith('blob:')) revokeObjectURL(cropOriginalPreview.src);
    cropImg = null;
    cropFile = null;
    cropResultBlob = null;
    cropResultUrl = null;
    cropFileInput.value = '';
  }

  /** 删除裁剪结果，返回裁剪编辑区重新调整 */
  function backToCropEditor() {
    cropResultSection.hidden = true;
    cropEditorSection.hidden = false;
    if (cropResultUrl) revokeObjectURL(cropResultUrl);
    cropResultBlob = null;
    cropResultUrl = null;
    cropResultPreview.src = '';
    cropResultPreview.hidden = true;
    cropResultSize.textContent = '--';
    updateCropBox();
  }

  cropUploadZone.addEventListener('click', () => cropFileInput.click());
  cropFileInput.addEventListener('change', function () {
    const f = this.files[0];
    if (!f || !f.type.match(/^image\/(png|jpeg|jpg)$/)) {
      alert('请选择 PNG 或 JPG 格式的图片');
      return;
    }
    cropFile = f;
    const img = new Image();
    img.onload = function () {
      cropImg = img;
      cropUploadSection.hidden = true;
      cropEditorSection.hidden = false;
      cropResultSection.hidden = true;
      document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.ratio-btn[data-ratio="1:1"]')?.classList.add('active');
      updateCropBox();
    };
    img.src = URL.createObjectURL(f);
  });

  cropUploadZone.addEventListener('dragover', e => { e.preventDefault(); cropUploadZone.classList.add('drag-over'); });
  cropUploadZone.addEventListener('dragleave', () => cropUploadZone.classList.remove('drag-over'));
  cropUploadZone.addEventListener('drop', function (e) {
    e.preventDefault();
    cropUploadZone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) cropFileInput.files = e.dataTransfer.files;
    cropFileInput.dispatchEvent(new Event('change'));
  });

  document.querySelectorAll('.ratio-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      updateCropBox();
    });
  });

  function getCropPointerCoords(e) {
    const rect = cropCanvas.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    return { x: (clientX - rect.left) / cropScale, y: (clientY - rect.top) / cropScale };
  }

  function handleCropPointerDown(e) {
    if (!cropImg) return;
    e.preventDefault();
    const coords = getCropPointerCoords(e);
    const d = cropData;
    if (coords.x >= d.x && coords.x <= d.x + d.w && coords.y >= d.y && coords.y <= d.y + d.h) {
      cropDragging = true;
      cropStartX = (e.clientX !== undefined ? e.clientX : e.touches[0].clientX);
      cropStartY = (e.clientY !== undefined ? e.clientY : e.touches[0].clientY);
      cropStartDataX = d.x;
      cropStartDataY = d.y;
    }
  }

  function handleCropPointerMove(e) {
    if (!cropDragging || !cropImg) return;
    e.preventDefault();
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : cropStartX);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : cropStartY);
    const dx = (clientX - cropStartX) / cropScale;
    const dy = (clientY - cropStartY) / cropScale;
    let nx = cropStartDataX + dx;
    let ny = cropStartDataY + dy;
    nx = Math.max(0, Math.min(cropImg.width - cropData.w, nx));
    ny = Math.max(0, Math.min(cropImg.height - cropData.h, ny));
    cropData.x = nx;
    cropData.y = ny;
    drawCropCanvas();
  }

  function handleCropPointerUp() { cropDragging = false; }

  cropCanvas.addEventListener('mousedown', handleCropPointerDown);
  cropCanvas.addEventListener('touchstart', handleCropPointerDown, { passive: false });
  window.addEventListener('mousemove', handleCropPointerMove);
  window.addEventListener('touchmove', handleCropPointerMove, { passive: false });
  window.addEventListener('mouseup', handleCropPointerUp);
  window.addEventListener('touchend', handleCropPointerUp);

  cropConfirmBtn.addEventListener('click', confirmCrop);
  cropResetBtn.addEventListener('click', resetCrop);
  cropReCropBtn.addEventListener('click', backToCropEditor);
  cropReUploadBtn.addEventListener('click', resetCrop);
  cropDownloadBtn.addEventListener('click', function () {
    if (!cropResultBlob || !cropFile) return;
    const ext = /jpe?g/i.test(cropFile.type) ? '.jpg' : '.png';
    const name = cropFile.name.replace(/\.[^.]+$/, '') + '_cropped';
    downloadBlobAsFile(cropResultBlob, name + ext);
  });

  /* ==================== 图片压缩模块 ==================== */
  const uploadSection = document.getElementById('uploadSection');
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const controlsSection = document.getElementById('controlsSection');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityValue = document.getElementById('qualityValue');
  const compressBtn = document.getElementById('compressBtn');
  const resetBtn = document.getElementById('resetBtn');
  const previewSection = document.getElementById('previewSection');
  const originalPreview = document.getElementById('originalPreview');
  const compressedPreview = document.getElementById('compressedPreview');
  const originalSizeEl = document.getElementById('originalSize');
  const compressedSizeEl = document.getElementById('compressedSize');
  const compressionRatioEl = document.getElementById('compressionRatio');
  const downloadSection = document.getElementById('downloadSection');
  const downloadBtn = document.getElementById('downloadBtn');

  let originalFile = null;
  let originalImage = null;
  let compressedBlob = null;
  let compressedUrl = null;

  function handleFileSelect(file) {
    if (!file || !file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      alert('请选择 PNG 或 JPG 格式的图片');
      return;
    }
    originalFile = file;
    uploadSection.hidden = true;
    controlsSection.hidden = false;
    previewSection.hidden = false;
    if (originalPreview.src && originalPreview.src.startsWith('blob:')) revokeObjectURL(originalPreview.src);
    originalPreview.src = createObjectURL(file);
    originalPreview.hidden = false;
    originalSizeEl.textContent = '大小：' + formatSize(file.size);
    compressedPreview.hidden = true;
    compressedSizeEl.textContent = '--';
    compressionRatioEl.hidden = true;
    downloadSection.hidden = true;
    if (compressedUrl) { revokeObjectURL(compressedUrl); compressedUrl = null; compressedBlob = null; }
    const img = new Image();
    img.onload = function () {
      originalImage = img;
      URL.revokeObjectURL(img.src);
    };
    img.onerror = function () { alert('图片加载失败'); };
    img.src = URL.createObjectURL(file);
  }

  uploadZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', function () { handleFileSelect(this.files[0]); });
  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', function (e) {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    handleFileSelect(e.dataTransfer.files[0]);
  });

  qualitySlider.addEventListener('input', function () { qualityValue.textContent = this.value + '%'; });

  compressBtn.addEventListener('click', function () {
    if (!originalFile || !originalImage) { alert('图片仍在加载，请稍候'); return; }
    const quality = parseInt(qualitySlider.value, 10) / 100;
    const isJpeg = /^image\/jpe?g$/.test(originalFile.type);
    const c = document.createElement('canvas');
    let w = originalImage.width, h = originalImage.height;
    if (!isJpeg) {
      w = Math.round(w * quality); h = Math.round(h * quality);
      if (w < 1) w = 1; if (h < 1) h = 1;
    }
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(originalImage, 0, 0, w, h);
    c.toBlob(function (blob) {
      if (!blob) return;
      if (compressedUrl) revokeObjectURL(compressedUrl);
      compressedBlob = blob;
      compressedUrl = createObjectURL(blob);
      compressedPreview.src = compressedUrl;
      compressedPreview.hidden = false;
      compressedSizeEl.textContent = '大小：' + formatSize(blob.size);
      compressionRatioEl.innerHTML = '压缩后约为原来的 <strong>' + (blob.size / originalFile.size * 100).toFixed(1) + '%</strong>';
      compressionRatioEl.hidden = false;
      downloadSection.hidden = false;
    }, isJpeg ? 'image/jpeg' : 'image/png', isJpeg ? quality : undefined);
  });

  resetBtn.addEventListener('click', function () {
    uploadSection.hidden = false;
    controlsSection.hidden = true;
    previewSection.hidden = true;
    downloadSection.hidden = true;
    if (compressedUrl) revokeObjectURL(compressedUrl);
    if (originalPreview.src && originalPreview.src.startsWith('blob:')) revokeObjectURL(originalPreview.src);
    originalFile = null; originalImage = null; compressedBlob = null; compressedUrl = null;
    fileInput.value = '';
  });

  downloadBtn.addEventListener('click', function () {
    if (!compressedBlob) return;
    downloadBlobAsFile(compressedBlob, originalFile.name.replace(/\.[^.]+$/, '') + '_compressed' + (/jpe?g/i.test(originalFile.type) ? '.jpg' : '.png'));
  });

  /* ==================== 格式转换模块 ==================== */
  const convertUploadSection = document.getElementById('convertUploadSection');
  const convertUploadZone = document.getElementById('convertUploadZone');
  const convertFileInput = document.getElementById('convertFileInput');
  const convertControlsSection = document.getElementById('convertControlsSection');
  const convertPreview = document.getElementById('convertPreview');
  const convertBtn = document.getElementById('convertBtn');
  const convertResetBtn = document.getElementById('convertResetBtn');

  let convertFile = null;
  let convertImageData = null;
  let convertSelectedFormat = 'png';

  convertUploadZone.addEventListener('click', () => convertFileInput.click());
  convertFileInput.addEventListener('change', function () {
    const f = this.files[0];
    if (!f) return;
    const type = f.type;
    const isPdf = type === 'application/pdf';
    const isSvg = type === 'image/svg+xml' || /\.svg$/i.test(f.name);
    const isImage = type.match(/^image\/(png|jpeg|jpg)$/);

    if (!isImage && !isSvg && !isPdf) {
      alert('请选择 JPG、PNG、SVG 或 PDF 文件');
      return;
    }
    convertFile = f;
    convertUploadSection.hidden = true;
    convertControlsSection.hidden = false;
    document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
    const first = isPdf ? 'png' : (isSvg ? 'png' : 'jpg');
    document.querySelector('.format-btn[data-format="' + first + '"]')?.classList.add('active');
    convertSelectedFormat = first;

    if (isImage) {
      const img = new Image();
      img.onload = function () {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        convertImageData = { type: 'image', img: img, canvas: c };
        convertPreview.src = URL.createObjectURL(f);
        convertPreview.hidden = false;
      };
      img.src = URL.createObjectURL(f);
    } else if (isSvg) {
      const reader = new FileReader();
      reader.onload = function () {
        const img = new Image();
        img.onload = function () {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth || 500;
          c.height = img.naturalHeight || 500;
          c.getContext('2d').drawImage(img, 0, 0);
          convertImageData = { type: 'svg', img: img, canvas: c };
          convertPreview.src = URL.createObjectURL(f);
          convertPreview.hidden = false;
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(reader.result)));
      };
      reader.readAsText(f);
    } else if (isPdf && typeof pdfjsLib !== 'undefined') {
      pdfjsLib.getDocument({ url: URL.createObjectURL(f) }).promise.then(function (pdf) {
        return pdf.getPage(1);
      }).then(function (page) {
        const scale = 2;
        const viewport = page.getViewport({ scale: scale });
        const c = document.createElement('canvas');
        c.width = viewport.width;
        c.height = viewport.height;
        const ctx = c.getContext('2d');
        page.render({ canvasContext: ctx, viewport: viewport });
        convertImageData = { type: 'pdf', canvas: c };
        convertPreview.src = c.toDataURL('image/png');
        convertPreview.hidden = false;
      }).catch(function () {
        alert('PDF 解析失败，请尝试其他文件');
      });
    } else if (isPdf) {
      alert('PDF 转图片需要加载额外库，请刷新页面重试');
    }
  });

  convertUploadZone.addEventListener('dragover', e => { e.preventDefault(); convertUploadZone.classList.add('drag-over'); });
  convertUploadZone.addEventListener('dragleave', () => convertUploadZone.classList.remove('drag-over'));
  convertUploadZone.addEventListener('drop', function (e) {
    e.preventDefault();
    convertUploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) {
      convertFileInput.files = e.dataTransfer.files;
      convertFileInput.dispatchEvent(new Event('change'));
    }
  });

  document.querySelectorAll('.format-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      convertSelectedFormat = this.dataset.format;
    });
  });

  convertBtn.addEventListener('click', function () {
    if (!convertImageData || !convertFile) { alert('请先上传文件'); return; }
    const fmt = convertSelectedFormat;
    const base = convertFile.name.replace(/\.[^.]+$/, '');
    const canvas = convertImageData.canvas;
    const ctx = canvas.getContext('2d');

    if (fmt === 'jpg' || fmt === 'png') {
      const dataUrl = canvas.toDataURL(fmt === 'jpg' ? 'image/jpeg' : 'image/png', fmt === 'jpg' ? 0.92 : 1);
      downloadDataUrlAsFile(dataUrl, base + '_converted.' + fmt);
    } else if (fmt === 'svg') {
      canvas.toBlob(function (blob) {
        const fr = new FileReader();
        fr.onload = function () {
          const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + canvas.width + '" height="' + canvas.height + '"><image href="' + fr.result + '" width="100%" height="100%"/></svg>';
          const a = document.createElement('a');
          a.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
          a.download = base + '_converted.svg';
          a.click();
        };
        fr.readAsDataURL(blob);
      }, 'image/png');
    } else if (fmt === 'pdf' && typeof jspdf !== 'undefined' && jspdf.jsPDF) {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jspdf.jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(dataUrl, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(base + '_converted.pdf');
    }
  });

  convertResetBtn.addEventListener('click', function () {
    convertUploadSection.hidden = false;
    convertControlsSection.hidden = true;
    convertFile = null;
    convertImageData = null;
    convertFileInput.value = '';
  });

  /* ==================== 图片拼图模块 ==================== */
  const collageUploadSection = document.getElementById('collageUploadSection');
  const collageUploadZone = document.getElementById('collageUploadZone');
  const collageFileInput = document.getElementById('collageFileInput');
  const collageThumbnails = document.getElementById('collageThumbnails');
  const collageControlsSection = document.getElementById('collageControlsSection');
  const collageCanvas = document.getElementById('collageCanvas');
  const collageDownloadBtn = document.getElementById('collageDownloadBtn');
  const collageResetBtn = document.getElementById('collageResetBtn');

  let collageImages = [];
  let collageLayout = 'vertical';

  function renderCollage() {
    const n = collageImages.length;
    if (n < 2 || n > 4) return;
    const layout = collageLayout;
    const imgs = collageImages;
    const totalW = 600;
    const totalH = 400;
    const gap = 4;
    let cols = 1, rows = 1;

    if (layout === 'vertical') {
      cols = 1;
      rows = n;
    } else if (layout === 'horizontal') {
      cols = n;
      rows = 1;
    } else {
      cols = n <= 2 ? 2 : 2;
      rows = Math.ceil(n / 2);
    }

    const cellW = (totalW - gap * (cols - 1)) / cols;
    const cellH = (totalH - gap * (rows - 1)) / rows;

    collageCanvas.width = totalW;
    collageCanvas.height = totalH;
    const ctx = collageCanvas.getContext('2d');
    ctx.fillStyle = '#f5f5f7';
    ctx.fillRect(0, 0, totalW, totalH);

    for (let i = 0; i < n; i++) {
      const img = imgs[i];
      let x, y;
      if (layout === 'vertical') {
        x = 0;
        y = i * (cellH + gap);
      } else if (layout === 'horizontal') {
        x = i * (cellW + gap);
        y = 0;
      } else {
        x = (i % cols) * (cellW + gap);
        y = Math.floor(i / cols) * (cellH + gap);
      }
      const scale = Math.min(cellW / img.width, cellH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const dx = x + (cellW - drawW) / 2;
      const dy = y + (cellH - drawH) / 2;
      ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, drawW, drawH);
    }
  }

  collageUploadZone.addEventListener('click', () => collageFileInput.click());
  collageFileInput.addEventListener('change', function () {
    const files = Array.from(this.files).filter(f => f.type.match(/^image\/(png|jpeg|jpg)$/));
    if (files.length < 2 || files.length > 4) {
      alert('请选择 2～4 张图片');
      return;
    }
    collageImages = [];
    collageThumbnails.innerHTML = '';
    let loaded = 0;
    files.forEach(function (f, i) {
      const img = new Image();
      img.onload = function () {
        collageImages.push(img);
        const div = document.createElement('div');
        div.className = 'collage-thumb-item';
        const thumb = document.createElement('img');
        thumb.src = URL.createObjectURL(f);
        thumb.alt = '缩略图';
        div.appendChild(thumb);
        collageThumbnails.appendChild(div);
        loaded++;
        if (loaded === files.length) {
          collageUploadSection.hidden = true;
          collageControlsSection.hidden = false;
          collageLayout = 'vertical';
          document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
          document.querySelector('.layout-btn[data-layout="vertical"]').classList.add('active');
          renderCollage();
        }
      };
      img.src = URL.createObjectURL(f);
    });
  });

  collageUploadZone.addEventListener('dragover', e => { e.preventDefault(); collageUploadZone.classList.add('drag-over'); });
  collageUploadZone.addEventListener('dragleave', () => collageUploadZone.classList.remove('drag-over'));
  collageUploadZone.addEventListener('drop', function (e) {
    e.preventDefault();
    collageUploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
      collageFileInput.files = e.dataTransfer.files;
      collageFileInput.dispatchEvent(new Event('change'));
    }
  });

  document.querySelectorAll('.layout-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      collageLayout = this.dataset.layout;
      renderCollage();
    });
  });

  collageDownloadBtn.addEventListener('click', function () {
    if (collageImages.length < 2) return;
    const dataUrl = collageCanvas.toDataURL('image/png', 1);
    downloadDataUrlAsFile(dataUrl, 'collage_' + Date.now() + '.png');
  });

  collageResetBtn.addEventListener('click', function () {
    collageUploadSection.hidden = false;
    collageControlsSection.hidden = true;
    collageImages = [];
    collageThumbnails.innerHTML = '';
    collageFileInput.value = '';
  });

})();
