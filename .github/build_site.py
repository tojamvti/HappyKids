"""
HappyKids – budowanie strony dla GitHub Pages (zastępuje api/zdjecia.php).

Uruchamiane automatycznie przez GitHub Actions przy każdej zmianie w repozytorium:
  1. kopiuje stronę do folderu _site (bez plików serwerowych i instrukcji),
  2. zdjęcia z folderów galeria/ i kwiatek/ zmniejsza, obraca zgodnie z telefonem
     i usuwa z nich dane EXIF (m.in. lokalizację GPS),
  3. tworzy miniatury galerii (galeria/_min/),
  4. zapisuje listę zdjęć do js/zdjecia-lista.js.

Galeria: najnowsze na początku (wg daty wgrania do repozytorium).
Kwiatek: wg nazwy pliku (01, 02, 03…).
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote

from PIL import Image, ImageOps

try:
    from pillow_heif import register_heif_opener  # zdjęcia HEIC z iPhone'a
    register_heif_opener()
except ImportError:
    pass

SRC = Path(__file__).resolve().parent.parent
OUT = SRC / "_site"

SKIP = {".git", ".github", "_site", "api", ".htaccess", "INSTRUKCJA.txt",
        "INSTRUKCJA-GITHUB.txt", "README.md"}
PHOTO_EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}

FOLDERS = {
    # folder: (kolejność, dłuższy bok zdjęcia, dłuższy bok miniatury lub None)
    "galeria": ("data", 1800, 640),
    "kwiatek": ("nazwa", 1200, None),
}


def added_time(path: Path) -> int:
    """Czas pierwszego dodania pliku do repozytorium (najnowsze zdjęcia na początku)."""
    try:
        out = subprocess.run(
            ["git", "log", "--diff-filter=A", "--follow", "--format=%ct", "--", str(path.relative_to(SRC))],
            cwd=SRC, capture_output=True, text=True, check=True,
        ).stdout.split()
        if out:
            return int(out[-1])
    except Exception:
        pass
    return int(path.stat().st_mtime)


def natural_key(name: str):
    import re
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", name)]


def save_resized(src: Path, dst: Path, max_side: int) -> None:
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        im.thumbnail((max_side, max_side), Image.LANCZOS)
        dst.parent.mkdir(parents=True, exist_ok=True)
        ext = dst.suffix.lower()
        if ext == ".png":
            im.save(dst, optimize=True)
        elif ext == ".webp":
            im.save(dst, quality=82, method=6)
        else:
            if im.mode not in ("RGB", "L"):
                im = im.convert("RGB")
            im.save(dst, quality=82, optimize=True, progressive=True)


def out_name(name: str) -> str:
    p = Path(name)
    return p.stem + ".jpg" if p.suffix.lower() in {".heic", ".heif"} else name


def copy_site() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    for item in SRC.iterdir():
        if item.name in SKIP or item.name in FOLDERS:
            continue
        if item.is_dir():
            shutil.copytree(item, OUT / item.name)
        else:
            shutil.copy2(item, OUT / item.name)


def build_folder(folder: str) -> list:
    order, big, small = FOLDERS[folder]
    src_dir = SRC / folder
    files = []
    if src_dir.is_dir():
        files = [f for f in src_dir.iterdir()
                 if f.is_file() and not f.name.startswith((".", "_")) and f.suffix.lower() in PHOTO_EXT]
    if order == "data":
        files.sort(key=lambda f: (added_time(f), natural_key(f.name)), reverse=True)
    else:
        files.sort(key=lambda f: natural_key(f.name))

    items = []
    for f in files:
        name = out_name(f.name)
        try:
            save_resized(f, OUT / folder / name, big)
            item = {"src": f"{folder}/{quote(name)}"}
            if small:
                save_resized(f, OUT / folder / "_min" / name, small)
                item["thumb"] = f"{folder}/_min/{quote(name)}"
            items.append(item)
            print(f"  ok  {folder}/{f.name}")
        except Exception as e:  # uszkodzony lub nieobsługiwany plik – pomijamy, strona działa dalej
            print(f"  POMINIĘTO {folder}/{f.name}: {e}", file=sys.stderr)
    return items


def main() -> None:
    copy_site()
    lists = {folder: build_folder(folder) for folder in FOLDERS}
    js = ("/* Plik tworzony automatycznie przy publikacji na GitHub Pages – nie edytuj. */\n"
          "window.HK_ZDJECIA_AUTO = true;\n"
          "window.HK_ZDJECIA = " + json.dumps(lists, ensure_ascii=False, indent=2) + ";\n")
    (OUT / "js" / "zdjecia-lista.js").write_text(js, encoding="utf-8")
    print(f"Gotowe: galeria {len(lists['galeria'])} zdj., kwiatek {len(lists['kwiatek'])} zdj.")


if __name__ == "__main__":
    main()
