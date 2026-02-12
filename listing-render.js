/**
 * 上架图生成器 - 画布渲染逻辑
 * drawMockup: 样机合成，object-fit:cover 精确填充
 */

(function (global) {
  'use strict';

  /**
   * 将用户截图按 object-fit:cover 填充到样机屏幕区域
   * @param {CanvasRenderingContext2D} ctx
   * @param {HTMLImageElement} img - 用户上传的截图
   * @param {Object} destRect - 目标区域 {x,y,w,h} 像素
   * @param {number} screenRatio - 屏幕宽高比 (w/h)
   */
  function drawScreenshotCover(ctx, img, destRect, screenRatio) {
    if (!img || !img.complete) return;
    var dw = destRect.w;
    var dh = destRect.h;
    var sw = img.width;
    var sh = img.height;
    var imgRatio = sw / sh;

    var sx, sy, sW, sH;
    if (imgRatio > screenRatio) {
      sH = sh;
      sW = sh * screenRatio;
      sx = (sw - sW) / 2;
      sy = 0;
    } else {
      sW = sw;
      sH = sw / screenRatio;
      sx = 0;
      sy = (sh - sH) / 2;
    }
    ctx.drawImage(img, sx, sy, sW, sH, destRect.x, destRect.y, dw, dh);
  }

  /**
   * 绘制样机：背景 + 设备壳（可选 PNG）+ 屏幕内截图
   * @param {HTMLCanvasElement} canvas
   * @param {Object} opts
   * @param {Object} opts.background - { type, color, from?, to?, angle? }
   * @param {HTMLImageElement} opts.frameImg - 样机壳子 PNG，可选
   * @param {Object} opts.screenRect - 屏幕区域相对壳子 {x,y,w,h} 0~1
   * @param {number} opts.screenRatio - 屏幕宽高比
   * @param {HTMLImageElement} opts.screenshot - 用户截图
   * @param {Object} opts.frameLayout - 壳子在图中的布局 {x,y,w,h} 像素
   */
  function drawMockup(canvas, opts) {
    var ctx = canvas.getContext('2d');
    var cw = canvas.width;
    var ch = canvas.height;

    /* 1. 背景层 */
    var bg = opts.background || { type: 'solid', color: '#ffffff' };
    if (bg.type === 'gradient') {
      var angle = (bg.angle || 0) * Math.PI / 180;
      var dx = Math.cos(angle) * cw;
      var dy = Math.sin(angle) * ch;
      var g = ctx.createLinearGradient(0, 0, dx, dy);
      g.addColorStop(0, bg.from || '#667eea');
      g.addColorStop(1, bg.to || '#764ba2');
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = bg.color || '#ffffff';
    }
    ctx.fillRect(0, 0, cw, ch);

    var layout = opts.frameLayout || { x: cw * 0.1, y: ch * 0.1, w: cw * 0.8, h: ch * 0.8 };
    var sr = opts.screenRect || { x: 0.1, y: 0.15, w: 0.8, h: 0.7 };
    var screenRatio = opts.screenRatio || 9 / 19.5;

    /* 2. 屏幕内容层（先画，再画壳子盖住边缘） */
    var destRect = {
      x: layout.x + layout.w * sr.x,
      y: layout.y + layout.h * sr.y,
      w: layout.w * sr.w,
      h: layout.h * sr.h
    };
    if (opts.screenshot) {
      drawScreenshotCover(ctx, opts.screenshot, destRect, screenRatio);
    }

    /* 3. 样机壳子层 */
    if (opts.frameImg && opts.frameImg.complete) {
      ctx.drawImage(opts.frameImg, layout.x, layout.y, layout.w, layout.h);
    } else {
      /* 无壳子图时：绘制圆角矩形模拟设备边框 */
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      roundRect(ctx, layout.x, layout.y, layout.w, layout.h, 24);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      roundRect(ctx, layout.x, layout.y, layout.w, layout.h, 24);
      ctx.fill();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * 完整渲染：背景 + 文本 + 样机
   */
  function renderListing(canvas, state) {
    var ctx = canvas.getContext('2d');
    var cw = canvas.width;
    var ch = canvas.height;

    /* 1. 背景 */
    var bg = state.background || { type: 'solid', color: '#ffffff' };
    if (bg.type === 'gradient') {
      var angle = (bg.angle || 0) * Math.PI / 180;
      var dx = Math.cos(angle) * cw;
      var dy = Math.sin(angle) * ch;
      var g = ctx.createLinearGradient(0, 0, dx, dy);
      g.addColorStop(0, bg.from || '#667eea');
      g.addColorStop(1, bg.to || '#764ba2');
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = bg.color || '#ffffff';
    }
    ctx.fillRect(0, 0, cw, ch);

    /* 2. 样机 + 截图（先画，文本在上层） */
    var mc = state.mockupConfig || {};
    var layout = computeMockupLayout(cw, ch, pos);
    drawMockup(canvas, {
      background: null,
      frameImg: state.frameImg,
      screenRect: mc.screenRect || { x: 0.08, y: 0.12, w: 0.84, h: 0.72 },
      screenRatio: mc.screenRatio || 9 / 19.5,
      screenshot: state.screenshotImage,
      frameLayout: layout
    });

    /* 3. 文本层（最上层） */
    var title = state.title || '';
    var subtitle = state.subtitle || '';
    var titleColor = state.titleColor || '#1d1d1f';
    var subtitleColor = state.subtitleColor || '#6e6e73';
    if (title || subtitle) {
      ctx.save();
      ctx.textAlign = 'center';
      var textY, gap = 8;
      if (pos === 'top') textY = ch * 0.12;
      else if (pos === 'bottom') textY = ch * 0.88;
      else textY = ch / 2;
      var fontSize = Math.min(cw, ch) * 0.04;
      ctx.font = 'bold ' + fontSize + 'px sans-serif';
      ctx.fillStyle = titleColor;
      ctx.fillText(title, cw / 2, textY);
      ctx.font = (fontSize * 0.5) + 'px sans-serif';
      ctx.fillStyle = subtitleColor;
      ctx.fillText(subtitle, cw / 2, textY + fontSize + gap);
      ctx.restore();
    }
  }

  function computeMockupLayout(cw, ch, textPos) {
    var pad = 0.08;
    var maxW = cw * (1 - pad * 2);
    var maxH = ch * (1 - pad * 2);
    if (textPos === 'top' || textPos === 'bottom') {
      maxH *= 0.65;
    }
    var scale = Math.min(maxW / 400, maxH / 800, 1.2);
    var w = 400 * scale;
    var h = 800 * scale;
    var x = (cw - w) / 2;
    var y = (ch - h) / 2;
    if (textPos === 'top') y = ch * 0.35;
    if (textPos === 'bottom') y = ch * 0.08;
    return { x: x, y: y, w: w, h: h };
  }

  global.ListingRender = {
    drawMockup: drawMockup,
    drawScreenshotCover: drawScreenshotCover,
    renderListing: renderListing
  };

})(typeof window !== 'undefined' ? window : this);
