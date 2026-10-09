"""Generează iconițele aplicației (PNG) fără biblioteci externe.

Rulează:  python3 tools/make_icons.py
"""
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "icons")

# Fulger (coordonate 0..1)
BOLT = [(0.58, 0.12), (0.26, 0.56), (0.47, 0.56), (0.40, 0.88), (0.74, 0.42), (0.53, 0.42)]
TOP, BOTTOM = (255, 46, 147), (162, 89, 255)  # roz -> mov


def inside(x, y, poly):
    hit = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            hit = not hit
        j = i
    return hit


def pixel(u, v):
    t = (u + v) / 2
    bg = tuple(round(a + (b - a) * t) for a, b in zip(TOP, BOTTOM))
    # Fulger galben-auriu, cu un contur subțire mai închis
    if inside(u, v, BOLT):
        return (255, 230, 0)
    return bg


def png(size, path):
    rows = []
    ss = 3  # supersampling pentru margini netede
    for y in range(size):
        row = bytearray(b"\x00")
        for x in range(size):
            acc = [0, 0, 0]
            for sy in range(ss):
                for sx in range(ss):
                    c = pixel((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size)
                    acc = [a + b for a, b in zip(acc, c)]
            row += bytes(round(a / ss ** 2) for a in acc)
        rows.append(bytes(row))
    raw = zlib.compress(b"".join(rows), 9)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)))
        f.write(chunk(b"IDAT", raw))
        f.write(chunk(b"IEND", b""))
    print("creat", os.path.relpath(path, ROOT))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for s in (180, 192, 512):
        png(s, os.path.join(OUT, f"icon-{s}.png"))
