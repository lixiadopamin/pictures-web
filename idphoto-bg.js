/**
 * 证件照换底 - 基于色域范围的背景替换（前端轻量方案）
 * 将像素色彩在「背景色域」内的替换为目标色（红/蓝/白）
 */
(function (global) {
  'use strict';

  var ID_PHOTO_SIZES = {
    '1inch': { w: 295, h: 413 },
    '2inch': { w: 413, h: 626 }
  };

  var BG_COLORS = {
    red: '#c41e3a',
    blue: '#3b5998',
    white: '#ffffff'
  };

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  function hexToRgb(hex) {
    var m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
  }

  /**
   * 替换背景色：将靠近「背景样本色」的像素替换为目标色
   * @param {HTMLCanvasElement} canvas - 输出画布
   * @param {HTMLImageElement} img - 源图
   * @param {Object} opts
   * @param {string} opts.targetColor - 目标背景色 #hex
   * @param {number} opts.tolerance - 色相容差 0~1，默认 0.15
   * @param {number} opts.saturation - 视为背景的最大饱和度，默认 0.4
   */
  function replaceBackground(canvas, img, opts) {
    opts = opts || {};
    var targetHex = opts.targetColor || '#ffffff';
    var tolerance = opts.tolerance !== undefined ? opts.tolerance : 0.15;
    var maxSat = opts.saturation !== undefined ? opts.saturation : 0.4;
    var targetRgb = hexToRgb(targetHex);
    if (!targetRgb) return;

    var c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    var ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    var data = ctx.getImageData(0, 0, c.width, c.height);
    var d = data.data;

    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
      var hsl = rgbToHsl(r, g, b);
      var sNorm = hsl.s / 100;
      var lNorm = hsl.l / 100;
      if (sNorm <= maxSat || lNorm >= 0.92 || lNorm <= 0.1) {
        d[i] = targetRgb.r;
        d[i + 1] = targetRgb.g;
        d[i + 2] = targetRgb.b;
      }
    }
    ctx.putImageData(data, 0, 0);

    var out = canvas.getContext('2d');
    canvas.width = opts.width || img.width;
    canvas.height = opts.height || img.height;
    out.drawImage(c, 0, 0, opts.width || img.width, opts.height || img.height);
  }

  function getSize(key) {
    return ID_PHOTO_SIZES[key] || ID_PHOTO_SIZES['1inch'];
  }

  global.IdphotoBg = {
    replaceBackground: replaceBackground,
    getSize: getSize,
    BG_COLORS: BG_COLORS
  };

})(typeof window !== 'undefined' ? window : this);
