"""Convert SVG icons to tabBar PNG icons (unselected gray + selected green)."""
import cairosvg
import re
import os

SRC_DIR = r"C:\Users\Administrator\Documents\HBuilderProjects\买菜-商家APP\static\tabs"
H_SRC = r"h:\zhuom\大研菜场品牌\图标\shangjiaapp"

# 源SVG文件 → 目标tabBar文件名映射
ICONS = {
    "shouye.svg": ("home.png", "home-active.png"),
    "jinridingdan.svg": ("order.png", "order-active.png"),
    "shangpin.svg": ("product.png", "product-active.png"),
    "wode.svg": ("mine.png", "mine-active.png"),
}

UNSELECTED = "#666666"
SELECTED = "#528A59"
SIZE = 96  # tabBar推荐尺寸96px


def colorize(svg_text: str, color: str) -> str:
    """在 <svg> 标签上注入 fill=color，强制覆盖所有路径的默认黑色。"""
    # 替换 <svg ...> 标签，在里面加 fill
    return re.sub(
        r"(<svg[^>]*?)(\s*>)",
        rf'\1 fill="{color}"\2',
        svg_text,
        count=1,
    )


for src_name, (gray_name, green_name) in ICONS.items():
    src_path = os.path.join(H_SRC, src_name)
    gray_path = os.path.join(SRC_DIR, gray_name)
    green_path = os.path.join(SRC_DIR, green_name)

    with open(src_path, "r", encoding="utf-8") as f:
        svg_content = f.read()

    # 灰色（未点亮）
    cairosvg.svg2png(
        bytestring=colorize(svg_content, UNSELECTED).encode("utf-8"),
        write_to=gray_path,
        output_width=SIZE,
        output_height=SIZE,
    )
    print(f"  → {gray_name} ({UNSELECTED})")

    # 绿色（点亮）
    cairosvg.svg2png(
        bytestring=colorize(svg_content, SELECTED).encode("utf-8"),
        write_to=green_path,
        output_width=SIZE,
        output_height=SIZE,
    )
    print(f"  → {green_name} ({SELECTED})")

print("Done.")
