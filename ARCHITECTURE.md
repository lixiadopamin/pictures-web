# 上架图生成器 - 核心架构与数据结构

## 一、设计理念

上架图 **不是简单滤镜**，而是 **「底图 + 样机 + 文本层」** 的**图层组合**，需要结构化状态管理。

---

## 二、画布系统（Canvas System）

### 2.1 固定比例配置表

```javascript
const CANVAS_PRESETS = {
  'ipad-12.9':  { w: 2048, h: 2732, name: 'iPad Pro 12.9"' },
  'iphone-6.7': { w: 1290, h: 2796, name: 'iPhone 6.7"' },
  'iphone-5.5': { w: 1242, h: 2208, name: 'iPhone 5.5"' },
  'android':    { w: 1080, h: 1920, name: '安卓通用' },
  'favicon-16': { w: 16,  h: 16,   name: 'Favicon 16' },
  'favicon-32': { w: 32,  h: 32,   name: 'Favicon 32' },
  'tile-150':   { w: 150, h: 150,  name: 'Windows Tile 150' },
  'tile-310':   { w: 310, h: 310,  name: 'Windows Tile 310' }
};
```

### 2.2 画布尺寸与样机内屏映射

样机壳子图需定义 **屏幕区域**（screenRect），用于 object-fit:cover 计算：

```javascript
// 样机配置：壳子图 + 屏幕区域（占壳子的相对位置）
MOCKUP_CONFIG = {
  'iphone-15-pro': {
    frameUrl: '/assets/mockup-iphone15.png',
    screenRect: { x: 0.08, y: 0.12, w: 0.84, h: 0.72 }, // 相对比例
    screenRatio: 1170 / 2532  // 屏幕宽高比
  },
  'pixel-8': { ... },
  'macbook': { ... }
};
```

---

## 三、图层结构（Layer Stack）

**自下而上**：背景 → 样机 → 内容(截图) → 文本

```javascript
const ListingState = {
  // 画布
  canvasPreset: 'iphone-6.7',
  canvasWidth: 1290,
  canvasHeight: 2796,

  // 1. 背景层
  background: {
    type: 'solid',        // 'solid' | 'gradient'
    color: '#ffffff',
    gradient: { from: '#667eea', to: '#764ba2', angle: 135 }
  },

  // 2. 样机层
  mockup: {
    device: 'iphone-15-pro',
    screenRect: { x, y, w, h },
    rotation: 0,
    scale: 1
  },

  // 3. 内容层（用户截图）
  content: {
    image: Image | null,
    objectFit: 'cover',  // cover | contain
    screenRect: { ... }
  },

  // 4. 文本层
  text: {
    title: '',
    subtitle: '',
    titleStyle: { fontSize: 48, fontWeight: 'bold', color: '#1d1d1f' },
    subtitleStyle: { fontSize: 24, color: '#6e6e73' },
    position: 'top' | 'bottom' | 'left' | 'right'
  }
};
```

---

## 四、状态管理逻辑（State Management）

### 4.1 核心原则

- **切换模板时保留用户输入**：文案、上传截图在模板切换时**不重置**
- **仅布局与样式随模板变化**：样机类型、背景、文字位置

### 4.2 状态分离

| 数据         | 是否随模板保留 | 说明           |
|--------------|----------------|----------------|
| title/subtitle | ✅ 保留       | 用户输入文案   |
| content.image | ✅ 保留       | 上传的截图     |
| background    | ❌ 随模板     | 模板定义背景   |
| mockup.device | ❌ 随模板     | 模板定义样机   |
| text.position | ❌ 随模板     | 模板定义布局   |

### 4.3 实现策略

```javascript
// 用户输入状态（持久，跨模板）
const userInputState = {
  title: '',
  subtitle: '',
  screenshotImage: null
};

// 模板定义（只读）
const TEMPLATES = [
  { id: 'center', mockup: 'iphone-15-pro', bg: 'white', textPos: 'bottom' },
  { id: 'tilt', mockup: 'iphone-15-pro', bg: 'gradient1', textPos: 'top' },
  ...
];

// 合并渲染
function getRenderState(templateId) {
  const t = TEMPLATES.find(x => x.id === templateId);
  return {
    ...userInputState,
    ...t,
    background: PRESET_BACKGROUNDS[t.bg]
  };
}
```

---

## 五、证件照与 Favicon 扩展

### 5.1 证件照预设尺寸

```javascript
const ID_PHOTO_PRESETS = {
  '1inch':  { w: 295,  h: 413 },  // 一寸
  '2inch':  { w: 413,  h: 626 }   // 二寸
};
```

### 5.2 证件照换底（前端方案）

- **纯色抠图**：将像素色相在「背景色域」内的像素替换为目标色
- **色域范围**：HSL 中 H 允许 ±15°，S/L 在一定范围内视为背景
- **蒙版方案**：用 Canvas 逐像素判断，替换后合成

### 5.3 Favicon / Tiles 配置

```javascript
const BROWSER_ICON_PRESETS = {
  'favicon-16': { w: 16, h: 16 },
  'favicon-32': { w: 32, h: 32 },
  'ico':        { w: 32, h: 32, format: 'ico' },
  'tile-150':  { w: 150, h: 150 },
  'tile-310':  { w: 310, h: 310 }
};
```

---

## 六、文件结构

```
├── ARCHITECTURE.md        # 本文档
├── listing-state.js       # 状态与配置表
├── listing-render.js      # drawMockup、画布渲染
├── listing-ui.js          # 模板/配置面板/画布 DOM 绑定
├── idphoto-bg.js          # 证件照背景替换
└── assets/
    └── mockups/           # 样机壳子 PNG
```
