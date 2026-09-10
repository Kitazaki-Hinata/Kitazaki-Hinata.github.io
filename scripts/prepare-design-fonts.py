"""Regenerate the checked-in web fonts with fontTools and Brotli.

This optional authoring step is separate from the Node-only site build.
Run from any directory: python scripts/prepare-design-fonts.py
"""

from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "resource" / "fonts"
OUTPUT = SOURCE / "web"
NAVIGATION = "Kitazaki Hinata 主页 osu skin 炒股记录与碎碎念 炒股碎碎念 绘画展示 画妹妹 读书与思考 快乐的事 找我&投喂 打开菜单 关闭菜单 主导航"


def make_subset(source, filename, unicodes, font_number=None):
    options = subset.Options()
    options.hinting = False
    font = TTFont(source, fontNumber=font_number) if font_number is not None else TTFont(source)
    worker = subset.Subsetter(options=options)
    worker.populate(unicodes=unicodes)
    worker.subset(font)
    font.flavor = "woff2"
    font.save(OUTPUT / filename)
    print(f"{filename}: {(OUTPUT / filename).stat().st_size:,} bytes")
    font.close()


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    alibaba = SOURCE / "AlibabaHealthFont2.0CN-85B.ttf"
    with TTFont(alibaba) as font:
        codepoints = set(font.getBestCmap())
    make_subset(alibaba, "alibaba-health-85b-latin.woff2", codepoints & set(range(256)))
    make_subset(alibaba, "alibaba-health-85b-cjk.woff2", codepoints - set(range(256)))
    make_subset(SOURCE / "msyhbd.ttc", "microsoft-yahei-bold-nav.woff2",
                set(range(256)) | {ord(character) for character in NAVIGATION}, font_number=0)


if __name__ == "__main__":
    main()
