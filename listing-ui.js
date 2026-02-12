/**
 * 上架图生成器 - UI 绑定与状态同步
 * 切换模板时保留用户输入的文案和截图
 */
(function () {
  'use strict';

  if (typeof ListingState === 'undefined' || typeof ListingRender === 'undefined') return;

  var LS = ListingState;
  var LR = ListingRender;
  var templates = LS.TEMPLATES;
  var bgPresets = LS.BACKGROUND_PRESETS;
  var canvasPresets = LS.CANVAS_PRESETS;

  var canvas = document.getElementById('listingCanvas');
  var templateContainer = document.getElementById('listingTemplates');
  var bgContainer = document.getElementById('listingBgPresets');
  var titleInput = document.getElementById('listingTitleInput');
  var subtitleInput = document.getElementById('listingSubtitleInput');
  var mockupSelect = document.getElementById('listingMockupSelect');
  var sizeSelect = document.getElementById('listingSizeSelect');
  var uploadBtn = document.getElementById('listingUploadBtn');
  var screenshotInput = document.getElementById('listingScreenshotInput');
  var downloadBtn = document.getElementById('listingDownloadBtn');

  function renderTemplates() {
    templateContainer.innerHTML = '';
    templates.forEach(function (t) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'template-thumb' + (LS.current.templateId === t.id ? ' active' : '');
      btn.dataset.id = t.id;
      btn.textContent = t.name;
      btn.addEventListener('click', function () {
        LS.current.templateId = t.id;
        var tpl = LS.getTemplate(t.id);
        LS.current.mockupDevice = tpl.mockup;
        LS.current.backgroundKey = tpl.bg;
        mockupSelect.value = tpl.mockup;
        templateContainer.querySelectorAll('.template-thumb').forEach(function (b) {
          b.classList.toggle('active', b.dataset.id === t.id);
        });
        updateBgSelection(tpl.bg);
        render();
      });
      templateContainer.appendChild(btn);
    });
  }

  function renderBgPresets() {
    bgContainer.innerHTML = '';
    Object.keys(bgPresets).forEach(function (key) {
      var p = bgPresets[key];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bg-preset-thumb' + (LS.current.backgroundKey === key ? ' active' : '');
      btn.dataset.key = key;
      btn.style.background = p.type === 'gradient'
        ? 'linear-gradient(135deg, ' + p.from + ', ' + p.to + ')'
        : (p.color || '#fff');
      btn.title = key;
      btn.addEventListener('click', function () {
        LS.current.backgroundKey = key;
        updateBgSelection(key);
        render();
      });
      bgContainer.appendChild(btn);
    });
  }

  function updateBgSelection(key) {
    bgContainer.querySelectorAll('.bg-preset-thumb').forEach(function (b) {
      b.classList.toggle('active', b.dataset.key === key);
    });
  }

  function renderSizeOptions() {
    sizeSelect.innerHTML = '';
    Object.keys(canvasPresets).forEach(function (key) {
      var p = canvasPresets[key];
      var opt = document.createElement('option');
      opt.value = key;
      opt.textContent = p.name + ' (' + p.w + '×' + p.h + ')';
      if (key === LS.current.canvasPreset) opt.selected = true;
      sizeSelect.appendChild(opt);
    });
  }

  function render() {
    var preset = LS.getCanvasPreset(LS.current.canvasPreset);
    var w = preset.w;
    var h = preset.h;
    var scale = 1;
    if (w > 600 || h > 800) {
      scale = Math.min(600 / w, 800 / h, 1);
    }
    canvas.width = w;
    canvas.height = h;
    var state = LS.getRenderState();
    state.background = LS.getBackground(LS.current.backgroundKey);
    state.mockupConfig = LS.getMockupConfig(LS.current.mockupDevice);
    state.screenshotImage = LS.userInput.screenshotImage;
    state.titleColor = LS.current.titleColor || '#1d1d1f';
    state.subtitleColor = LS.current.subtitleColor || '#6e6e73';
    LR.renderListing(canvas, state);
    canvas.style.width = (w * scale) + 'px';
    canvas.style.height = (h * scale) + 'px';
  }

  function syncFromInputs() {
    LS.userInput.title = titleInput.value.trim();
    LS.userInput.subtitle = subtitleInput.value.trim();
    LS.current.mockupDevice = mockupSelect.value;
    LS.current.canvasPreset = sizeSelect.value;
  }

  /* 事件绑定 */
  titleInput.addEventListener('input', function () { syncFromInputs(); render(); });
  subtitleInput.addEventListener('input', function () { syncFromInputs(); render(); });
  mockupSelect.addEventListener('change', function () { syncFromInputs(); render(); });
  sizeSelect.addEventListener('change', function () { syncFromInputs(); render(); });

  uploadBtn.addEventListener('click', function () { screenshotInput.click(); });
  screenshotInput.addEventListener('change', function () {
    var f = this.files[0];
    if (!f || !f.type.match(/^image\//)) return;
    var img = new Image();
    img.onload = function () {
      LS.userInput.screenshotImage = img;
      render();
    };
    img.src = URL.createObjectURL(f);
  });

  downloadBtn.addEventListener('click', function () {
    syncFromInputs();
    var preset = LS.getCanvasPreset(LS.current.canvasPreset);
    canvas.width = preset.w;
    canvas.height = preset.h;
    render();
    canvas.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'listing_' + preset.w + 'x' + preset.h + '_' + Date.now() + '.png';
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png', 1);
  });

  /* 初始化 */
  renderTemplates();
  renderBgPresets();
  renderSizeOptions();
  render();

})();
