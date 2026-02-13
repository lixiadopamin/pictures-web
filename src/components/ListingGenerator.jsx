import React, { useRef, useEffect, useState, useCallback } from 'react';
import JSZip from 'jszip';

/**
 * 上架图三层架构：背景层 + 样机层 + 文案层
 * 1. 背景层：6 款浅色渐变
 * 2. 样机层：iPhone 16 / 华为 60 Pro
 * 3. 文案层：大标题 24px，小标题 18px（按画布比例缩放）
 */

/** 6 款浅色渐变背景（默认） */
const BACKGROUND_GRADIENTS = [
  { from: '#f8f9fa', to: '#e9ecef', angle: 135, name: '浅灰' },
  { from: '#e3f2fd', to: '#bbdefb', angle: 180, name: '淡蓝' },
  { from: '#fce4ec', to: '#f8bbd9', angle: 90, name: '浅粉' },
  { from: '#e8f5e9', to: '#c8e6c9', angle: 0, name: '淡绿' },
  { from: '#fff3e0', to: '#ffe0b2', angle: 45, name: '浅橙' },
  { from: '#f3e5f5', to: '#e1bee7', angle: 135, name: '淡紫' },
];

/** 样机配置：2 款默认（iPhone 16 + 华为 60 Pro） */
const MOCKUP_CONFIG = {
  'iphone-16': {
    png: '/mockup-iphone15.png',
    svg: '/mockup-iphone15.svg',
    name: 'iPhone 16',
    mockupSize: { w: 390, h: 844 },
    screenRect: { x: 26 / 390, y: 58 / 844, w: 338 / 390, h: 732 / 844 },
    screenRatio: 1170 / 2532,
  },
  'huawei-60-pro': {
    png: '/mockup-android.png',
    svg: '/mockup-android.svg',
    name: '华为 60 Pro',
    mockupSize: { w: 360, h: 800 },
    screenRect: { x: 28 / 360, y: 52 / 800, w: 304 / 360, h: 696 / 800 },
    screenRatio: 1080 / 2400,
  },
};

/** 文案层字体大小（基准 600px 画布宽） */
const TITLE_FONT_SIZE = 24;
const SUBTITLE_FONT_SIZE = 18;

/** 根据编辑图片自动生成的 6 个必传尺寸 */
const EXPORT_SIZES = [
  { key: '1290x2796', w: 1290, h: 2796 },
  { key: '1284x2778', w: 1284, h: 2778 },
  { key: '1179x2556', w: 1179, h: 2556 },
  { key: '1170x2532', w: 1170, h: 2532 },
  { key: '1242x2208', w: 1242, h: 2208 },
  { key: '750x1334', w: 750, h: 1334 },
];

/** 样机选项（2 款默认） */
const DEVICE_OPTIONS = [
  { key: 'iphone-16', label: 'iPhone 16' },
  { key: 'huawei-60-pro', label: '华为 60 Pro' },
];

export default function ListingGenerator() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [bgIndex, setBgIndex] = useState(0);
  const [device, setDevice] = useState('iphone-16');
  const [screenshots, setScreenshots] = useState([]);
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState(0);
  const [mockupImg, setMockupImg] = useState(null);

  const mockupCfg = MOCKUP_CONFIG[device] || MOCKUP_CONFIG['iphone-16'];
  const safeIndex = Math.min(selectedScreenshotIndex, Math.max(0, screenshots.length - 1));
  const currentScreenshot = screenshots[safeIndex]?.img ?? null;

  const renderWidth = 600;
  const renderHeight = 1200;

  /** 按设备加载样机壳子图 */
  useEffect(() => {
    const cfg = mockupCfg;
    const img = new Image();
    img.onerror = () => {
      img.onerror = null;
      img.src = cfg.svg;
    };
    img.onload = () => setMockupImg(img);
    img.src = cfg.png;
  }, [device]);

  /** 1. 背景层：绘制浅色渐变 */
  const drawBackground = useCallback((ctx, cw, ch, index) => {
    const grad = BACKGROUND_GRADIENTS[index] || BACKGROUND_GRADIENTS[0];
    const angle = (grad.angle || 0) * Math.PI / 180;
    const dx = Math.cos(angle) * cw;
    const dy = Math.sin(angle) * ch;
    const g = ctx.createLinearGradient(0, 0, dx, dy);
    g.addColorStop(0, grad.from);
    g.addColorStop(1, grad.to);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);
  }, []);

  const drawScreenshotCover = useCallback((ctx, img, destRect, screenRatio) => {
    if (!img?.complete) return;
    const ratio = screenRatio ?? 1170 / 2532;
    const sw = img.width, sh = img.height;
    const imgRatio = sw / sh;
    let sx, sy, sW, sH;
    if (imgRatio > ratio) {
      sH = sh;
      sW = sh * ratio;
      sx = (sw - sW) / 2;
      sy = 0;
    } else {
      sW = sw;
      sH = sw / ratio;
      sx = 0;
      sy = (sh - sH) / 2;
    }
    ctx.drawImage(img, sx, sy, sW, sH, destRect.x, destRect.y, destRect.w, destRect.h);
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cw = renderWidth;
    const ch = renderHeight;

    ctx.clearRect(0, 0, cw, ch);

    const pad = 0.08;
    const titleAreaH = ch * 0.12;
    const bottomPad = ch * 0.05;
    const maxW = cw * (1 - pad * 2);
    const maxH = ch - titleAreaH - bottomPad;
    const { w: mW, h: mH } = mockupCfg.mockupSize;
    const scale = Math.min(maxW / mW, maxH / mH);
    const frameW = mW * scale;
    const frameH = mH * scale;
    const frameX = (cw - frameW) / 2;
    const frameY = ch - bottomPad - frameH;

    const sr = mockupCfg.screenRect;
    const destRect = {
      x: frameX + frameW * sr.x,
      y: frameY + frameH * sr.y,
      w: frameW * sr.w,
      h: frameH * sr.h,
    };

    /* 1. 背景层 */
    drawBackground(ctx, cw, ch, bgIndex);

    /* 2. 屏幕内容层 */
    if (currentScreenshot) drawScreenshotCover(ctx, currentScreenshot, destRect, mockupCfg.screenRatio);

    /* 3. 样机壳子层 */
    if (mockupImg?.complete) {
      ctx.drawImage(mockupImg, frameX, frameY, frameW, frameH);
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 2;
      roundRect(ctx, frameX, frameY, frameW, frameH, 28);
      ctx.stroke();
    }

    /* 3. 文案层：大标题 24px，小标题 18px（按画布比例缩放） */
    if (title || subtitle) {
      ctx.save();
      ctx.textAlign = 'center';
      const scale = cw / 600;
      const titleSize = TITLE_FONT_SIZE * scale;
      const subtitleSize = SUBTITLE_FONT_SIZE * scale;
      const textY = ch * 0.06;
      ctx.font = `bold ${titleSize}px system-ui, sans-serif`;
      ctx.fillStyle = '#1d1d1f';
      ctx.fillText(title, cw / 2, textY);
      ctx.font = `${subtitleSize}px system-ui, sans-serif`;
      ctx.fillStyle = '#6e6e73';
      ctx.fillText(subtitle, cw / 2, textY + titleSize + 8);
      ctx.restore();
    }
  }, [bgIndex, currentScreenshot, mockupImg, title, subtitle, device, mockupCfg, drawBackground, drawScreenshotCover]);

  useEffect(() => {
    render();
  }, [render]);

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

  const exportAtSize = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const pad = 0.08;
    const titleAreaH = h * 0.12;
    const bottomPad = h * 0.05;
    const maxW = w * (1 - pad * 2);
    const maxH = h - titleAreaH - bottomPad;
    const { w: mW, h: mH } = mockupCfg.mockupSize;
    const scale = Math.min(maxW / mW, maxH / mH);
    const frameW = mW * scale;
    const frameH = mH * scale;
    const frameX = (w - frameW) / 2;
    const frameY = h - bottomPad - frameH;
    const sr = mockupCfg.screenRect;
    const destRect = {
      x: frameX + frameW * sr.x,
      y: frameY + frameH * sr.y,
      w: frameW * sr.w,
      h: frameH * sr.h,
    };

    const grad = BACKGROUND_GRADIENTS[bgIndex] || BACKGROUND_GRADIENTS[0];
    const angle = (grad.angle || 0) * Math.PI / 180;
    const dx = Math.cos(angle) * w;
    const dy = Math.sin(angle) * h;
    const g = ctx.createLinearGradient(0, 0, dx, dy);
    g.addColorStop(0, grad.from);
    g.addColorStop(1, grad.to);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const scr = currentScreenshot;
    if (scr) {
      const ratio = mockupCfg.screenRatio;
      const sw = scr.width, sh = scr.height;
      const imgRatio = sw / sh;
      let sx, sy, sW, sH;
      if (imgRatio > ratio) {
        sH = sh; sW = sh * ratio; sx = (sw - sW) / 2; sy = 0;
      } else {
        sW = sw; sH = sw / ratio; sx = 0; sy = (sh - sH) / 2;
      }
      ctx.drawImage(scr, sx, sy, sW, sH, destRect.x, destRect.y, destRect.w, destRect.h);
    }

    if (mockupImg?.complete) {
      ctx.drawImage(mockupImg, frameX, frameY, frameW, frameH);
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 2;
      roundRect(ctx, frameX, frameY, frameW, frameH, 28);
      ctx.stroke();
    }

    if (title || subtitle) {
      ctx.textAlign = 'center';
      const scale = w / 600;
      const titleSize = TITLE_FONT_SIZE * scale;
      const subtitleSize = SUBTITLE_FONT_SIZE * scale;
      const textY = h * 0.06;
      ctx.font = `bold ${titleSize}px system-ui`;
      ctx.fillStyle = '#1d1d1f';
      ctx.fillText(title, w / 2, textY);
      ctx.font = `${subtitleSize}px system-ui`;
      ctx.fillStyle = '#6e6e73';
      ctx.fillText(subtitle, w / 2, textY + titleSize + 8);
    }
    return c;
  };

  const handleBatchExport = async () => {
    const zip = new JSZip();
    const folder = zip.folder('app-store-screenshots');
    for (const { key, w, h } of EXPORT_SIZES) {
      const c = exportAtSize(w, h);
      const blob = await new Promise((res) => c.toBlob(res, 'image/png', 1));
      folder.file(`${key}.png`, blob);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = `app-store-screenshots_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleFaviconExport = () => {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d');
    const src = canvasRef.current;
    if (!src) return;
    ctx.drawImage(src, src.width * 0.2, src.height * 0.05, src.width * 0.6, src.width * 0.6, 0, 0, 32, 32);
    c.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'favicon.ico';
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png', 1);
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#f5f5f5] p-6">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
        {/* 左侧边栏 */}
        <aside className="w-full lg:w-72 shrink-0 bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">上架图生成器</h3>

          <div>
            <label className="block text-sm text-gray-600 mb-1">文案层 · 大标题（24px）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="App 名称"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={30}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">文案层 · 小标题（18px）</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="一句描述"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">背景层（6 款浅色渐变）</label>
            <div className="grid grid-cols-3 gap-2">
              {BACKGROUND_GRADIENTS.map((g, i) => (
                <button
                  key={i}
                  onClick={() => setBgIndex(i)}
                  className={`h-10 rounded-lg border-2 transition ${
                    bgIndex === i
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{
                    background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`,
                  }}
                  title={g.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">样机层</label>
            <div className="flex gap-2">
              {DEVICE_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setDevice(key)}
                  className={`flex-1 py-1.5 rounded text-sm font-medium border ${
                    device === key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">App 截图</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = e.target.files;
                if (!files?.length) return;
                let loaded = 0;
                const newItems = [];
                const total = files.length;
                const tryFinish = () => {
                  loaded++;
                  if (loaded === total) {
                    setScreenshots((prev) => [...prev, ...newItems]);
                    setSelectedScreenshotIndex((prev) => (prev === -1 ? 0 : prev));
                  }
                };
                for (let i = 0; i < total; i++) {
                  const img = new Image();
                  img.onload = () => {
                    newItems.push({ id: Date.now() + i, img });
                    tryFinish();
                  };
                  img.onerror = tryFinish;
                  img.src = URL.createObjectURL(files[i]);
                }
                e.target.value = '';
              }}
              className="block w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border file:border-gray-200 file:text-sm"
            />
            <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
              {screenshots.map((item, i) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 rounded-lg border p-1.5 ${
                    selectedScreenshotIndex === i ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedScreenshotIndex(i)}
                    className="flex-1 min-w-0 flex items-center gap-2 text-left"
                  >
                    <img
                      src={item.img.src}
                      alt=""
                      className="h-10 w-10 object-cover rounded shrink-0"
                    />
                    <span className="text-xs text-gray-600 truncate">截图 {i + 1}</span>
                  </button>
                  <div className="flex gap-0.5 shrink-0">
                    <label className="cursor-pointer px-1.5 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 rounded">
                      重传
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(ev) => {
                          const f = ev.target.files?.[0];
                          if (!f) return;
                          const img = new Image();
                          img.onload = () => {
                            setScreenshots((prev) => {
                              const next = [...prev];
                              next[i] = { id: next[i].id, img };
                              return next;
                            });
                          };
                          img.src = URL.createObjectURL(f);
                          ev.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshots((prev) => prev.filter((_, idx) => idx !== i));
                        setSelectedScreenshotIndex((prev) => {
                          if (i < prev) return prev - 1;
                          if (i === prev) return prev >= screenshots.length - 1 ? Math.max(0, prev - 1) : prev;
                          return prev;
                        });
                      }}
                      className="px-1.5 py-0.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <button
              onClick={handleBatchExport}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              批量导出（6 个尺寸压缩包）
            </button>
            <button
              onClick={handleFaviconExport}
              className="w-full py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 border border-gray-200"
            >
              Favicon 生成 (32×32)
            </button>
          </div>

        </aside>

        {/* 画布预览区 */}
        <div className="flex-1 min-w-0 flex flex-col items-center">
          <div className="w-full max-w-[400px] bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex justify-center">
            <canvas
              ref={canvasRef}
              width={renderWidth}
              height={renderHeight}
              className="w-full max-w-full h-auto rounded-lg border border-gray-200"
              style={{ maxHeight: '70vh' }}
            />
          </div>
          <p className="mt-3 text-sm text-gray-500">实时预览 · 文案同步更新</p>
        </div>
      </div>
    </div>
  );
}
