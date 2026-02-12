/**
 * 上架图生成器 - 状态与配置表
 * 图层：背景 + 样机 + 内容(截图) + 文本
 */

(function (global) {
  'use strict';

  /* ========== 画布 / 尺寸配置表 ========== */
  var CANVAS_PRESETS = {
    'ipad-12.9':  { w: 2048, h: 2732, name: 'iPad Pro 12.9"' },
    'iphone-6.7': { w: 1290, h: 2796, name: 'iPhone 6.7"' },
    'iphone-5.5': { w: 1242, h: 2208, name: 'iPhone 5.5"' },
    'android':    { w: 1080, h: 1920, name: '安卓通用' },
    'favicon-16': { w: 16, h: 16, name: 'Favicon 16×16' },
    'favicon-32': { w: 32, h: 32, name: 'Favicon 32×32' },
    'ico-32':     { w: 32, h: 32, name: 'ICO 32×32' },
    'tile-150':   { w: 150, h: 150, name: 'Windows Tile 150' },
    'tile-310':   { w: 310, h: 310, name: 'Windows Tile 310' }
  };

  /* ========== 背景预设 ========== */
  var BACKGROUND_PRESETS = {
    white:   { type: 'solid', color: '#ffffff' },
    blue:    { type: 'solid', color: '#e3f2fd' },
    red:    { type: 'solid', color: '#ffebee' },
    dark:   { type: 'solid', color: '#1a1a1a' },
    gradient1: { type: 'gradient', from: '#667eea', to: '#764ba2', angle: 135 },
    gradient2: { type: 'gradient', from: '#f093fb', to: '#f5576c', angle: 90 },
    gradient3: { type: 'gradient', from: '#4facfe', to: '#00f2fe', angle: 180 }
  };

  /* ========== 样机配置（屏幕区域相对比例） ========== */
  var MOCKUP_CONFIG = {
    'iphone-15-pro': {
      name: 'iPhone 15 Pro',
      screenRect: { x: 0.085, y: 0.13, w: 0.83, h: 0.70 },
      screenRatio: 1170 / 2532
    },
    'pixel-8': {
      name: 'Pixel 8',
      screenRect: { x: 0.08, y: 0.11, w: 0.84, h: 0.71 },
      screenRatio: 1080 / 2400
    },
    'macbook': {
      name: 'MacBook',
      screenRect: { x: 0.06, y: 0.08, w: 0.88, h: 0.58 },
      screenRatio: 16 / 10
    }
  };

  /* ========== 模板定义（布局 + 样式，不含用户输入） ========== */
  var TEMPLATES = [
    { id: 'center', name: '样机居中', mockup: 'iphone-15-pro', bg: 'white', textPos: 'bottom' },
    { id: 'tilt', name: '样机倾斜', mockup: 'iphone-15-pro', bg: 'gradient1', textPos: 'top', rotation: -12 },
    { id: 'split', name: '左右分割', mockup: 'pixel-8', bg: 'blue', textPos: 'left' },
    { id: 'top-text', name: '顶部文案', mockup: 'iphone-15-pro', bg: 'gradient2', textPos: 'top' },
    { id: 'dark', name: '深色背景', mockup: 'macbook', bg: 'dark', textPos: 'bottom' }
  ];

  /* ========== 证件照预设 ========== */
  var ID_PHOTO_PRESETS = {
    '1inch': { w: 295, h: 413, name: '一寸' },
    '2inch': { w: 413, h: 626, name: '二寸' }
  };

  /* ========== 用户输入状态（跨模板保留） ========== */
  var userInputState = {
    title: '',
    subtitle: '',
    screenshotImage: null
  };

  /* ========== 当前视图状态 ========== */
  var currentState = {
    templateId: 'center',
    canvasPreset: 'iphone-6.7',
    mockupDevice: 'iphone-15-pro',
    backgroundKey: 'white',
    titleStyle: { fontSize: 48, fontWeight: 'bold', color: '#1d1d1f' },
    subtitleStyle: { fontSize: 24, color: '#6e6e73' }
  };

  function getCanvasPreset(key) {
    return CANVAS_PRESETS[key] || CANVAS_PRESETS['iphone-6.7'];
  }

  function getTemplate(id) {
    return TEMPLATES.find(function (t) { return t.id === id; }) || TEMPLATES[0];
  }

  function getBackground(key) {
    return BACKGROUND_PRESETS[key] || BACKGROUND_PRESETS.white;
  }

  function getMockupConfig(device) {
    return MOCKUP_CONFIG[device] || MOCKUP_CONFIG['iphone-15-pro'];
  }

  function getRenderState(templateId) {
    var t = getTemplate(templateId || currentState.templateId);
    return {
      title: userInputState.title,
      subtitle: userInputState.subtitle,
      screenshotImage: userInputState.screenshotImage,
      mockup: t.mockup,
      background: getBackground(t.bg),
      textPos: t.textPos,
      rotation: t.rotation || 0
    };
  }

  global.ListingState = {
    CANVAS_PRESETS: CANVAS_PRESETS,
    BACKGROUND_PRESETS: BACKGROUND_PRESETS,
    MOCKUP_CONFIG: MOCKUP_CONFIG,
    TEMPLATES: TEMPLATES,
    ID_PHOTO_PRESETS: ID_PHOTO_PRESETS,
    userInput: userInputState,
    current: currentState,
    getCanvasPreset: getCanvasPreset,
    getTemplate: getTemplate,
    getBackground: getBackground,
    getMockupConfig: getMockupConfig,
    getRenderState: getRenderState
  };

})(typeof window !== 'undefined' ? window : this);
