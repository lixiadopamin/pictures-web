import React, { useRef, useEffect, useState, useCallback } from 'react';

/** 6 款清淡纹理背景 URL（可替换为自有资源） */
const BACKGROUND_URLS = [
  'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&q=80',
  'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=800&q=80',
  'https://images.unsplash.com/photo-1579546929662-711aa81148cf?w=800&q=80',
  'https://images.unsplash.com/photo-1614850523011-8b3b1e3c8c1f?w=800&q=80',
  'https://images.unsplash.com/photo-1557682260-96773eb01377?w=800&q=80',
  'https://images.unsplash.com/photo-1557682259-c2c1f2d3d4e5?w=800&q=80',
];

/** 清淡纯色/渐变备选（图片加载失败时） */
const BACKGROUND_FALLBACKS = [
  { type: 'gradient', from: '#f8f9fa', to: '#e9ecef', angle: 135 },
  { type: 'gradient', from: '#e3f2fd', to: '#bbdefb', angle: 180 },
  { type: 'gradient', from: '#fce4ec', to: '#f8bbd9', angle: 90 },
  { type: 'solid', color: '#f5f5f5' },
  { type: 'solid', color: '#fafafa' },
  { type: 'gradient', from: '#e8f5e9', to: '#c8e6c9', angle: 0 },
];

/** 设备样机配置：屏幕区域相对比例 + 样机原始宽高（保持比例不被拉伸） */
const MOCKUP_CONFIG = {
  iphone: {
    png: '/mockup-iphone15.png',
    svg: '/mockup-iphone15.svg',
    mockupSize: { w: 390, h: 844 },
    screenRect: { x: 26 / 390, y: 58 / 844, w: 338 / 390, h: 732 / 844 },
    screenRatio: 1170 / 2532,
  },
  ipad: {
    png: '/mockup-ipad.png',
    svg: '/mockup-ipad.svg',
    mockupSize: { w: 768, h: 1024 },
    screenRect: { x: 48 / 768, y: 52 / 1024, w: 672 / 768, h: 920 / 1024 },
    screenRatio: 2048 / 2732,
  },
  android: {
    png: '/mockup-android.png',
    svg: '/mockup-android.svg',
    mockupSize: { w: 360, h: 800 },
    screenRect: { x: 28 / 360, y: 52 / 800, w: 304 / 360, h: 696 / 800 },
    screenRatio: 1080 / 2400,
  },
};

/** 导出尺寸 */
const EXPORT_SIZES = [
  { key: '6.7', w: 1290, h: 2796, name: '6.7 寸' },
  { key: '5.5', w: 1242, h: 2208, name: '5.5 寸' },
];

/** 平台与设备选项 */
const PLATFORM_OPTIONS = [
  { key: 'apple', label: '苹果' },
  { key: 'android', label: '安卓' },
];
const APPLE_DEVICES = [
  { key: 'iphone', label: 'iPhone' },
  { key: 'ipad', label: 'iPad' },
];

export default function ListingGenerator() {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [bgIndex, setBgIndex] = useState(0);
  const [platform, setPlatform] = useState('apple');
  const [device, setDevice] = useState('iphone');
  const [screenshots, setScreenshots] = useState([]);
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState(0);
  const [bgImages, setBgImages] = useState([]);
  const [mockupImg, setMockupImg] = useState(null);

  const currentDevice = platform === 'apple'
    ? (device === 'ipad' ? 'ipad' : 'iphone')
    : 'android';
  const mockupCfg = MOCKUP_CONFIG[currentDevice];
  const safeIndex = Math.min(selectedScreenshotIndex, Math.max(0, screenshots.length - 1));
  const currentScreenshot = screenshots[safeIndex]?.img ?? null;

  const renderWidth = 600;
  const renderHeight = 1200;

  /** 加载 6 款背景图 */
  useEffect(() => {
    const imgs = BACKGROUND_URLS.map((url) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      return img;
    });
    setBgImages(imgs);
  }, []);

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
  }, [currentDevice]);

  const drawBackground = useCallback((ctx, cw, ch, index) => {
    const bgImg = bgImages[index];
    const fallback = BACKGROUND_FALLBACKS[index];
    if (bgImg?.complete && bgImg.naturalWidth > 0) {
      ctx.drawImage(bgImg, 0, 0, cw, ch);
    } else {
      if (fallback.type === 'gradient') {
        const angle = (fallback.angle || 0) * Math.PI / 180;
        const dx = Math.cos(angle) * cw;
        const dy = Math.sin(angle) * ch;
        const g = ctx.createLinearGradient(0, 0, dx, dy);
        g.addColorStop(0, fallback.from);
        g.addColorStop(1, fallback.to);
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = fallback.color || '#fff';
      }
      ctx.fillRect(0, 0, cw, ch);
    }
  }, [bgImages]);

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

    /* 4. 顶部文字层 */
    if (title || subtitle) {
      ctx.save();
      ctx.textAlign = 'center';
      const fontSize = Math.min(cw, ch) * 0.045;
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
      ctx.fillStyle = '#1d1d1f';
      ctx.fillText(title, cw / 2, ch * 0.06);
      ctx.font = `${fontSize * 0.5}px system-ui, sans-serif`;
      ctx.fillStyle = '#6e6e73';
      ctx.fillText(subtitle, cw / 2, ch * 0.06 + fontSize + 8);
      ctx.restore();
    }
  }, [bgIndex, currentScreenshot, mockupImg, title, subtitle, currentDevice, mockupCfg, drawBackground, drawScreenshotCover]);

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

    const bgImg = bgImages[bgIndex];
    const fallback = BACKGROUND_FALLBACKS[bgIndex];
    if (bgImg?.complete && bgImg.naturalWidth > 0) {
      ctx.drawImage(bgImg, 0, 0, w, h);
    } else {
      if (fallback.type === 'gradient') {
        const angle = (fallback.angle || 0) * Math.PI / 180;
        const dx = Math.cos(angle) * w;
        const dy = Math.sin(angle) * h;
        const g = ctx.createLinearGradient(0, 0, dx, dy);
        g.addColorStop(0, fallback.from);
        g.addColorStop(1, fallback.to);
        ctx.fillStyle = g;
      } else ctx.fillStyle = fallback.color || '#fff';
      ctx.fillRect(0, 0, w, h);
    }

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
      const fs = Math.min(w, h) * 0.045;
      ctx.font = `bold ${fs}px system-ui`;
      ctx.fillStyle = '#1d1d1f';
      ctx.fillText(title, w / 2, h * 0.06);
      ctx.font = `${fs * 0.5}px system-ui`;
      ctx.fillStyle = '#6e6e73';
      ctx.fillText(subtitle, w / 2, h * 0.06 + fs + 8);
    }
    return c;
  };

  const handleBatchExport = () => {
    EXPORT_SIZES.forEach(({ key, w, h, name }) => {
      const c = exportAtSize(w, h);
      c.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `listing_${key}_${w}x${h}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/png', 1);
    });
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
            <label className="block text-sm text-gray-600 mb-1">主标题</label>
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
            <label className="block text-sm text-gray-600 mb-1">副标题</label>
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
            <label className="block text-sm text-gray-600 mb-2">背景（6 款）</label>
            <div className="grid grid-cols-3 gap-2">
              {BACKGROUND_URLS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setBgIndex(i)}
                  className={`h-10 rounded-lg border-2 transition ${
                    bgIndex === i
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{
                    background: bgImages[i]?.complete
                      ? `url(${BACKGROUND_URLS[i]}) center/cover`
                      : BACKGROUND_FALLBACKS[i].type === 'gradient'
                      ? `linear-gradient(${BACKGROUND_FALLBACKS[i].angle}deg, ${BACKGROUND_FALLBACKS[i].from}, ${BACKGROUND_FALLBACKS[i].to})`
                      : BACKGROUND_FALLBACKS[i].color,
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">平台</label>
            <div className="flex gap-2 mb-2">
              {PLATFORM_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPlatform(key)}
                  className={`flex-1 py-1.5 rounded text-sm font-medium border ${
                    platform === key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {platform === 'apple' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">设备</label>
              <div className="flex gap-2">
                {APPLE_DEVICES.map(({ key, label }) => (
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
          )}

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
              批量导出（6.7 寸 + 5.5 寸）
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
