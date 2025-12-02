#!/usr/bin/env python3
"""
Generate all icon sizes for CaseSpace from a source logo image.
Removes watermarks and generates all required sizes for Tauri, iOS, Android, and Windows.
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFilter
import subprocess
from pathlib import Path

# Required sizes for different platforms
TAURI_ICONS = [
    ("32x32.png", 32),
    ("64x64.png", 64),
    ("128x128.png", 128),
    ("128x128@2x.png", 256),
    ("icon.png", 512),
]

IOS_ICONS = [
    ("AppIcon-20x20@1x.png", 20),
    ("AppIcon-20x20@2x.png", 40),
    ("AppIcon-20x20@2x-1.png", 40),
    ("AppIcon-20x20@3x.png", 60),
    ("AppIcon-29x29@1x.png", 29),
    ("AppIcon-29x29@2x.png", 58),
    ("AppIcon-29x29@2x-1.png", 58),
    ("AppIcon-29x29@3x.png", 87),
    ("AppIcon-40x40@1x.png", 40),
    ("AppIcon-40x40@2x.png", 80),
    ("AppIcon-40x40@2x-1.png", 80),
    ("AppIcon-40x40@3x.png", 120),
    ("AppIcon-60x60@2x.png", 120),
    ("AppIcon-60x60@3x.png", 180),
    ("AppIcon-76x76@1x.png", 76),
    ("AppIcon-76x76@2x.png", 152),
    ("AppIcon-83.5x83.5@2x.png", 167),
    ("AppIcon-512@2x.png", 1024),
]

ANDROID_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

WINDOWS_STORE_LOGOS = [
    ("Square30x30Logo.png", 30),
    ("Square44x44Logo.png", 44),
    ("Square71x71Logo.png", 71),
    ("Square89x89Logo.png", 89),
    ("Square107x107Logo.png", 107),
    ("Square142x142Logo.png", 142),
    ("Square150x150Logo.png", 150),
    ("Square284x284Logo.png", 284),
    ("Square310x310Logo.png", 310),
    ("StoreLogo.png", 50),
]


def remove_watermark(img):
    """
    Remove watermark by cleaning up the background.
    Uses a simple approach: detect near-white pixels and make them pure white.
    """
    # Convert to RGBA if not already
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Get image data
    pixels = img.load()
    width, height = img.size
    
    # Create a mask for watermark areas (semi-transparent or very light pixels)
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            
            # If pixel is very light (likely watermark) and not fully opaque, make it white
            if a < 200 or (r > 240 and g > 240 and b > 240 and a < 255):
                # Check if it's likely a watermark pixel (very light with low opacity)
                if a < 180:
                    pixels[x, y] = (255, 255, 255, 0)  # Transparent
                elif r > 230 and g > 230 and b > 230:
                    pixels[x, y] = (255, 255, 255, 255)  # Pure white
    
    # Apply a slight blur to smooth out any artifacts
    img = img.filter(ImageFilter.MedianFilter(size=3))
    
    return img


def create_rounded_square(size, bg_color=(255, 255, 255, 0)):
    """Create a rounded square canvas for the icon."""
    img = Image.new('RGBA', (size, size), bg_color)
    return img


def resize_with_padding(source_img, target_size, bg_color=(255, 255, 255, 0)):
    """
    Resize image maintaining aspect ratio and center it on a square canvas.
    """
    # Calculate scaling to fit within target size
    source_width, source_height = source_img.size
    scale = min(target_size / source_width, target_size / source_height)
    
    new_width = int(source_width * scale)
    new_height = int(source_height * scale)
    
    # Resize image
    resized = source_img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Create square canvas
    canvas = Image.new('RGBA', (target_size, target_size), bg_color)
    
    # Center the resized image
    x_offset = (target_size - new_width) // 2
    y_offset = (target_size - new_height) // 2
    canvas.paste(resized, (x_offset, y_offset), resized if resized.mode == 'RGBA' else None)
    
    return canvas


def generate_icon(source_img, output_path, size, bg_color=(255, 255, 255, 0)):
    """Generate a single icon at the specified size."""
    icon = resize_with_padding(source_img, size, bg_color)
    icon.save(output_path, 'PNG', optimize=True)
    print(f"Generated: {output_path} ({size}x{size})")


def generate_icns(icon_512_path, output_path):
    """Generate .icns file for macOS (requires iconutil on macOS)."""
    if sys.platform != 'darwin':
        print(f"Skipping .icns generation (requires macOS): {output_path}")
        return
    
    try:
        # Create temporary iconset directory
        iconset_dir = Path(output_path).parent / "icon.iconset"
        iconset_dir.mkdir(exist_ok=True)
        
        # Generate all required sizes for iconset
        sizes = [
            (16, "icon_16x16.png"),
            (32, "icon_16x16@2x.png"),
            (32, "icon_32x32.png"),
            (64, "icon_32x32@2x.png"),
            (128, "icon_128x128.png"),
            (256, "icon_128x128@2x.png"),
            (256, "icon_256x256.png"),
            (512, "icon_256x256@2x.png"),
            (512, "icon_512x512.png"),
            (1024, "icon_512x512@2x.png"),
        ]
        
        source_img = Image.open(icon_512_path)
        for size, filename in sizes:
            icon = resize_with_padding(source_img, size)
            icon.save(iconset_dir / filename, 'PNG')
        
        # Convert to .icns using iconutil
        subprocess.run([
            'iconutil', '-c', 'icns', str(iconset_dir), '-o', str(output_path)
        ], check=True)
        
        # Clean up iconset directory
        import shutil
        shutil.rmtree(iconset_dir)
        
        print(f"Generated: {output_path}")
    except Exception as e:
        print(f"Error generating .icns: {e}")


def generate_ico(icon_512_path, output_path):
    """Generate .ico file for Windows."""
    try:
        source_img = Image.open(icon_512_path)
        
        # Create ICO with multiple sizes
        ico_sizes = [16, 32, 48, 64, 128, 256]
        images = []
        for size in ico_sizes:
            icon = resize_with_padding(source_img, size)
            images.append(icon)
        
        # Save as ICO
        images[0].save(output_path, format='ICO', sizes=[(img.size[0], img.size[1]) for img in images])
        print(f"Generated: {output_path}")
    except Exception as e:
        print(f"Error generating .ico: {e}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python generate-icons.py <source-image>")
        print("Example: python generate-icons.py owl-logo.png")
        sys.exit(1)
    
    source_path = sys.argv[1]
    if not os.path.exists(source_path):
        print(f"Error: Source image not found: {source_path}")
        sys.exit(1)
    
    # Load and clean source image
    print(f"Loading source image: {source_path}")
    source_img = Image.open(source_path)
    print(f"Original size: {source_img.size}")
    
    print("Removing watermarks...")
    source_img = remove_watermark(source_img)
    
    # Base directories
    base_dir = Path(__file__).parent
    icons_dir = base_dir / "src-tauri" / "icons"
    ios_dir = icons_dir / "ios"
    android_dir = icons_dir / "android"
    
    # Create directories
    ios_dir.mkdir(parents=True, exist_ok=True)
    android_dir.mkdir(parents=True, exist_ok=True)
    
    print("\n=== Generating Tauri Icons ===")
    for filename, size in TAURI_ICONS:
        output_path = icons_dir / filename
        generate_icon(source_img, output_path, size)
    
    # Generate .icns and .ico
    icon_512_path = icons_dir / "icon.png"
    generate_icns(icon_512_path, icons_dir / "icon.icns")
    generate_ico(icon_512_path, icons_dir / "icon.ico")
    
    print("\n=== Generating iOS Icons ===")
    for filename, size in IOS_ICONS:
        output_path = ios_dir / filename
        generate_icon(source_img, output_path, size)
    
    print("\n=== Generating Android Icons ===")
    for mipmap_name, size in ANDROID_SIZES.items():
        mipmap_dir = android_dir / mipmap_name
        mipmap_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate launcher icons
        for icon_type in ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]:
            output_path = mipmap_dir / icon_type
            generate_icon(source_img, output_path, size)
    
    print("\n=== Generating Windows Store Logos ===")
    for filename, size in WINDOWS_STORE_LOGOS:
        output_path = icons_dir / filename
        generate_icon(source_img, output_path, size)
    
    # Also update app-icon.png in root
    print("\n=== Updating app-icon.png ===")
    app_icon_path = base_dir / "app-icon.png"
    generate_icon(source_img, app_icon_path, 512)
    
    print("\n✅ All icons generated successfully!")
    print(f"\nNote: If watermark removal wasn't perfect, you may want to manually edit the source image first.")


if __name__ == "__main__":
    main()

