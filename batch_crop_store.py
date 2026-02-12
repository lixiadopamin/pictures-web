#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
应用商店图片批量裁切脚本
与 store-presets.js 中的尺寸保持一致，便于 Web 工具与批量脚本协同使用
"""
from PIL import Image
import os
import sys

# 与 store-presets.js 保持一致的尺寸预设
STORE_PRESETS = [
    {"id": "ios-icon", "name": "iOS 图标", "w": 1024, "h": 1024},
    {"id": "android-icon", "name": "安卓 图标", "w": 512, "h": 512},
    {"id": "play-feature", "name": "Feature 图", "w": 1024, "h": 500},
    {"id": "iphone-se", "name": "iPhone SE", "w": 750, "h": 1334},
    {"id": "iphone-12", "name": "iPhone 12/13/14", "w": 1170, "h": 2532},
    {"id": "iphone-15-pro", "name": "iPhone 15/16 Pro", "w": 1290, "h": 2796},
    {"id": "ipad-pro", "name": "iPad Pro 12.9\"", "w": 2048, "h": 2732},
    {"id": "ipad-10", "name": "iPad 10", "w": 1640, "h": 2360},
    {"id": "android-phone", "name": "安卓 手机", "w": 1080, "h": 1920},
    {"id": "android-phone-h", "name": "安卓 横屏", "w": 1920, "h": 1080},
    {"id": "android-7", "name": "7 寸平板", "w": 1200, "h": 1920},
    {"id": "android-10", "name": "10 寸平板", "w": 1600, "h": 2560},
]


def center_crop_and_resize(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """居中裁剪并缩放到目标尺寸"""
    tw, th = img.size
    ratio = target_w / target_h
    if tw / th > ratio:
        # 图更宽，按高裁
        crop_h = th
        crop_w = int(th * ratio)
    else:
        crop_w = tw
        crop_h = int(tw / ratio)
    x = (tw - crop_w) // 2
    y = (th - crop_h) // 2
    cropped = img.crop((x, y, x + crop_w, y + crop_h))
    return cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)


def batch_crop(src_dir: str, out_dir: str, preset_id: str):
    """批量裁切"""
    preset = next((p for p in STORE_PRESETS if p["id"] == preset_id), None)
    if not preset:
        print(f"未知预设: {preset_id}")
        sys.exit(1)

    target_w, target_h = preset["w"], preset["h"]
    os.makedirs(out_dir, exist_ok=True)
    exts = (".png", ".jpg", ".jpeg")

    for name in os.listdir(src_dir):
        if not name.lower().endswith(exts):
            continue
        path = os.path.join(src_dir, name)
        try:
            img = Image.open(path).convert("RGB")
        except Exception as e:
            print(f"跳过 {name}: {e}")
            continue
        out = center_crop_and_resize(img, target_w, target_h)
        base, _ = os.path.splitext(name)
        out_path = os.path.join(out_dir, f"{base}_{preset_id}_{target_w}x{target_h}.png")
        out.save(out_path, "PNG", optimize=True)
        print(f"已生成: {out_path}")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("用法: python batch_crop_store.py <源目录> <输出目录> <预设id>")
        print("预设: ios-icon, android-icon, play-feature, iphone-se, iphone-12, iphone-15-pro, ipad-pro, ipad-10, android-phone, android-phone-h, android-7, android-10")
        sys.exit(1)
    batch_crop(sys.argv[1], sys.argv[2], sys.argv[3])
