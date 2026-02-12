/**
 * 证件照换底 + Favicon 生成 - UI 绑定
 */
(function () {
  'use strict';

  if (typeof IdphotoBg === 'undefined') return;

  var tabs = document.querySelectorAll('#panelIdphoto .idphoto-tabs .scenario-tab');
  var idphotoContent = document.getElementById('idphotoTabContent');
  var faviconContent = document.getElementById('faviconTabContent');
  var idphotoBgSection = document.getElementById('idphotoBgSection');
  var idphotoUploadZone = document.getElementById('idphotoUploadZone');
  var idphotoFileInput = document.getElementById('idphotoFileInput');
  var idphotoControls = document.getElementById('idphotoControls');
  var idphotoCanvas = document.getElementById('idphotoCanvas');
  var idphotoDownloadBtn = document.getElementById('idphotoDownloadBtn');
  var idphotoBgColors = document.getElementById('idphotoBgColors');
  var faviconUploadZone = document.getElementById('faviconUploadZone');
  var faviconFileInput = document.getElementById('faviconFileInput');
  var faviconControls = document.getElementById('faviconControls');
  var faviconCanvas = document.getElementById('faviconCanvas');
  var faviconDownloadBtn = document.getElementById('faviconDownloadBtn');

  var idphotoImg = null;
  var idphotoSize = '1inch';
  var idphotoBgColor = 'white';
  var faviconImg = null;
  var faviconSize = 32;

  /* 证件照 Tab */
  tabs[0].addEventListener('click', function () {
    tabs.forEach(function (t) { t.classList.remove('active'); });
    this.classList.add('active');
    idphotoContent.hidden = false;
    faviconContent.hidden = true;
  });
  tabs[1].addEventListener('click', function () {
    tabs.forEach(function (t) { t.classList.remove('active'); });
    this.classList.add('active');
    idphotoContent.hidden = true;
    faviconContent.hidden = false;
  });

  /* 证件照换底 */
  Object.keys(IdphotoBg.BG_COLORS).forEach(function (key) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bg-color-btn' + (key === idphotoBgColor ? ' active' : '');
    btn.style.background = IdphotoBg.BG_COLORS[key];
    btn.dataset.color = key;
    btn.title = key === 'red' ? '红底' : key === 'blue' ? '蓝底' : '白底';
    btn.addEventListener('click', function () {
      idphotoBgColor = key;
      idphotoBgColors.querySelectorAll('.bg-color-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.color === key);
      });
      if (idphotoImg) renderIdphoto();
    });
    idphotoBgColors.appendChild(btn);
  });

  document.querySelectorAll('#idphotoBgSection .size-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      idphotoSize = this.dataset.size;
      document.querySelectorAll('#idphotoBgSection .size-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.size === idphotoSize);
      });
      if (idphotoImg) renderIdphoto();
    });
  });

  idphotoUploadZone.addEventListener('click', function () { idphotoFileInput.click(); });
  idphotoFileInput.addEventListener('change', function () {
    var f = this.files[0];
    if (!f || !f.type.match(/^image\//)) return;
    var img = new Image();
    img.onload = function () {
      idphotoImg = img;
      idphotoControls.hidden = false;
      renderIdphoto();
    };
    img.src = URL.createObjectURL(f);
  });

  function renderIdphoto() {
    if (!idphotoImg) return;
    var size = IdphotoBg.getSize(idphotoSize);
    IdphotoBg.replaceBackground(idphotoCanvas, idphotoImg, {
      targetColor: IdphotoBg.BG_COLORS[idphotoBgColor],
      width: size.w,
      height: size.h,
      tolerance: 0.12,
      saturation: 0.35
    });
  }

  idphotoDownloadBtn.addEventListener('click', function () {
    if (!idphotoImg) return;
    renderIdphoto();
    var a = document.createElement('a');
    a.href = idphotoCanvas.toDataURL('image/png', 1);
    a.download = 'idphoto_' + idphotoSize + '_' + idphotoBgColor + '.png';
    a.click();
  });

  /* Favicon */
  faviconUploadZone.addEventListener('click', function () { faviconFileInput.click(); });
  faviconFileInput.addEventListener('change', function () {
    var f = this.files[0];
    if (!f || !f.type.match(/^image\//)) return;
    var img = new Image();
    img.onload = function () {
      faviconImg = img;
      faviconControls.hidden = false;
      renderFavicon();
    };
    img.src = URL.createObjectURL(f);
  });

  document.querySelectorAll('.favicon-size-btns .format-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      faviconSize = parseInt(this.dataset.size, 10);
      document.querySelectorAll('.favicon-size-btns .format-btn').forEach(function (b) {
        b.classList.toggle('active', parseInt(b.dataset.size, 10) === faviconSize);
      });
      if (faviconImg) renderFavicon();
    });
  });

  function renderFavicon() {
    if (!faviconImg) return;
    var c = faviconCanvas;
    c.width = faviconSize;
    c.height = faviconSize;
    var ctx = c.getContext('2d');
    ctx.drawImage(faviconImg, 0, 0, faviconSize, faviconSize);
  }

  faviconDownloadBtn.addEventListener('click', function () {
    if (!faviconImg) return;
    renderFavicon();
    var a = document.createElement('a');
    a.href = faviconCanvas.toDataURL('image/png', 1);
    a.download = 'favicon_' + faviconSize + '.png';
    a.click();
  });

})();
