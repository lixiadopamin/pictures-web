/**
 * 应用商店图片尺寸预设（iOS App Store / Google Play）
 * 用于上架所需图标、截图、Feature 图等
 * 可与 Python 批量裁切脚本保持一致，便于维护
 */
(function (global) {
  'use strict';

  var STORE_PRESETS = [
    /* === 应用图标 === */
    { id: 'ios-icon', name: 'iOS 图标', w: 1024, h: 1024, platform: 'iOS', desc: 'App Store 主图标' },
    { id: 'android-icon', name: '安卓 图标', w: 512, h: 512, platform: 'Android', desc: 'Play 商店主图标' },
    /* === 谷歌 Play Feature 图 === */
    { id: 'play-feature', name: 'Feature 图', w: 1024, h: 500, platform: 'Android', desc: 'Play 商店顶部横幅' },
    /* === iOS 截图 === */
    { id: 'iphone-se', name: 'iPhone SE', w: 750, h: 1334, platform: 'iOS', desc: '截图' },
    { id: 'iphone-12', name: 'iPhone 12/13/14', w: 1170, h: 2532, platform: 'iOS', desc: '截图' },
    { id: 'iphone-15-pro', name: 'iPhone 15/16 Pro', w: 1290, h: 2796, platform: 'iOS', desc: '截图' },
    { id: 'ipad-pro', name: 'iPad Pro 12.9"', w: 2048, h: 2732, platform: 'iOS', desc: '截图' },
    { id: 'ipad-10', name: 'iPad 10', w: 1640, h: 2360, platform: 'iOS', desc: '截图' },
    /* === Android 截图（常用） === */
    { id: 'android-phone', name: '安卓 手机', w: 1080, h: 1920, platform: 'Android', desc: '竖屏截图' },
    { id: 'android-phone-h', name: '安卓 横屏', w: 1920, h: 1080, platform: 'Android', desc: '横屏截图' },
    { id: 'android-7', name: '7 寸平板', w: 1200, h: 1920, platform: 'Android', desc: '截图' },
    { id: 'android-10', name: '10 寸平板', w: 1600, h: 2560, platform: 'Android', desc: '截图' }
  ];

  function getById(id) {
    return STORE_PRESETS.find(function (p) { return p.id === id; });
  }

  function getByPlatform(platform) {
    return STORE_PRESETS.filter(function (p) { return p.platform === platform; });
  }

  function getAll() {
    return STORE_PRESETS.slice();
  }

  global.STORE_PRESETS = STORE_PRESETS;
  global.getStorePreset = getById;
  global.getStorePresetsByPlatform = getByPlatform;
  global.getAllStorePresets = getAll;

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
