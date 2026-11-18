"""Extrae el libro «24 más» a JSON, por día, conservando el texto tal cual.

Uso: python3 -I extraer.py libro.pdf salida.json revision.txt

Bloques de salida: {"t": tipo, "s": texto, ...}
  t = "p" párrafo · "h" encabezado de ejercicio · "q" pregunta para responder · "li" elemento de lista
  b = negrita · i = cursiva · c = centrado
"""
import json
import re
import sys

import pymupdf

PDF, OUT, REV = sys.argv[1:4]
doc = pymupdf.open(PDF)
FOOTER = "Apostolado Católico Hechos – Guía para afrontar el Duelo en 40 días"
PAGE_W = 612
ITALIC, BOLD = 2, 16
BULLET_RE = re.compile(r"[-•▪●◦]")


def is_bullet_only(t):
    t = t.strip()
    return bool(t) and all(BULLET_RE.match(ch) or ch.isspace() for ch in t)


def page_lines(pno):
    page = doc[pno - 1]
    blocks = [b for b in page.get_text("dict")["blocks"] if b["type"] == 0]
    blocks.sort(key=lambda b: (round(b["bbox"][1]), b["bbox"][0]))
    out = []
    for bi, b in enumerate(blocks):
        bx0, _, bx1, _ = b["bbox"]
        for l in b["lines"]:
            spans = l["spans"]
            text = "".join(s["text"] for s in spans)
            if l["bbox"][1] < 70 or FOOTER in text or l["bbox"][1] > 735:
                continue
            visibles = [s for s in spans if s["text"].strip() and not is_bullet_only(s["text"])]
            x0, y0, x1, _ = l["bbox"]
            if is_bullet_only(text):
                out.append({"bm": True, "x0": x0, "x1": x1, "y": y0})
                continue
            if not visibles:
                out.append({"blank": True, "block": bi})
                continue
            bullet = False
            clean = re.sub(r"\s+", " ", text).strip()
            if BULLET_RE.match(clean):
                bullet = True
                clean = BULLET_RE.sub("", clean, count=1).strip()
            out.append({
                "text": clean, "x0": x0, "x1": x1, "y": y0, "bx0": bx0, "bx1": bx1,
                "size": max(s["size"] for s in visibles), "font": visibles[0]["font"],
                "bold": all(s["flags"] & BOLD or "Bold" in s["font"] for s in visibles),
                "ital": all(s["flags"] & ITALIC or "Ital" in s["font"] for s in visibles),
                "block": bi, "bullet": bullet,
            })

    # Marcas de viñeta sueltas: se asignan a la línea de texto a su derecha.
    texts = [ln for ln in out if "text" in ln]
    for bm in [ln for ln in out if ln.get("bm")]:
        cands = [t for t in texts if abs(t["y"] - bm["y"]) <= 3 and t["x0"] > bm["x0"]]
        if cands:
            min(cands, key=lambda t: t["x0"])["bullet"] = True
    out = [ln for ln in out if not ln.get("bm")]

    # Fragmentos de una misma línea partida en bloques (texto justificado junto a imágenes).
    merged = []
    for ln in out:
        prev = merged[-1] if merged else None
        if (prev and "text" in prev and "text" in ln and not prev["bullet"] and not ln["bullet"]
                and abs(prev["y"] - ln["y"]) < 2 and abs(prev["size"] - ln["size"]) < 0.5
                and ln["x0"] > prev["x0"]):
            prev["text"] += " " + ln["text"]
            prev["x1"] = max(prev["x1"], ln["x1"])
            prev["bx1"] = max(prev["bx1"], ln["bx1"])
            prev["block"] = ln["block"]
            continue
        merged.append(ln)

    # Listas a dos columnas: ordenar primero la columna izquierda y luego la derecha.
    res, i = [], 0
    while i < len(merged):
        ln = merged[i]
        if "text" in ln and ln["bullet"]:
            j = i
            run = []
            while j < len(merged) and (merged[j].get("blank") or "text" in merged[j] and (
                    merged[j]["bullet"] or (run and any(abs(merged[j]["x0"] - r["x0"]) < 4 for r in run if r.get("bullet"))))):
                run.append(merged[j])
                j += 1
            xs = sorted({round(r["x0"]) for r in run if r.get("bullet")})
            if xs and xs[-1] - xs[0] > 100:
                split = (xs[0] + xs[-1]) / 2
                tl = [r for r in run if "text" in r]
                left = sorted([r for r in tl if r["x0"] < split], key=lambda r: r["y"])
                right = sorted([r for r in tl if r["x0"] >= split], key=lambda r: r["y"])
                run = left + right
            res.extend(run)
            i = j
        else:
            res.append(ln)
            i += 1
    return res


def paragraphs(lines):
    paras, cur, prev = [], None, None
    for ln in lines:
        if ln.get("blank"):
            cur, prev = None, None
            continue
        same_style = cur is not None and cur["bold"] == ln["bold"] and cur["ital"] == ln["ital"]
        wrapped = (prev is not None and prev["x1"] >= prev["bx1"] - 18 and prev["block"] == ln["block"]
                   and prev["bx1"] - prev["bx0"] > 200)
        sigue = (prev is not None and ln["text"][:1].islower()
                 and not re.search(r"[.!?:”\"»)]$", prev["text"]) and abs(ln["size"] - prev["size"]) < 0.5)
        if cur is not None and cur["li"] and not ln["bullet"] and (
                abs(ln["x0"] - cur["first"]["x0"]) < 4 or re.match(r"^[a-z(áéíóú]", ln["text"])):
            # Continuación de un elemento de lista (misma sangría que su texto).
            cur["text"] += " " + ln["text"]
            prev = ln
            continue
        if cur is not None and not cur["li"] and not ln["bullet"] and same_style and (wrapped or sigue):
            cur["text"] += " " + ln["text"]
            cur["last"] = ln
        else:
            mid = (ln["x0"] + ln["x1"]) / 2
            centered = abs(mid - PAGE_W / 2) < 25 and (ln["x0"] - ln["bx0"]) > 30 and (ln["bx1"] - ln["bx0"]) > 200
            cur = {"text": ln["text"], "bold": ln["bold"], "ital": ln["ital"], "size": ln["size"],
                   "font": ln["font"], "centered": centered and not ln["bullet"], "li": ln["bullet"],
                   "first": ln, "last": ln}
            paras.append(cur)
        prev = ln
    return paras


all_paras = []
for pno in range(6, 89):
    ps = paragraphs(page_lines(pno))
    for i, p in enumerate(ps):
        p["page"] = pno
        if i == 0 and all_paras and not p["li"]:
            last = all_paras[-1]
            cont = (last["last"]["x1"] >= last["last"]["bx1"] - 18 or p["text"][:1].islower())
            if (cont and not last["bold"] and not p["bold"] and last["ital"] == p["ital"]
                    and not re.match(r"^Día \d+$", p["text"]) and not last["li"]
                    and abs(p["first"]["x0"] - last["last"]["x0"]) < 5
                    and not re.search(r"[.!?:]$", last["text"])):
                last["text"] += " " + p["text"]
                last["last"] = p["last"]
                continue
        all_paras.append(p)

days, cur, i = [], None, 0
while i < len(all_paras):
    p = all_paras[i]
    m = re.match(r"^Día (\d+)$", p["text"])
    if m and "Verdana" in p["font"]:
        partes, j = [], i + 1
        while j < len(all_paras) and all_paras[j]["ital"] and all_paras[j]["size"] >= 20:
            partes.append(all_paras[j]["text"])
            j += 1
        cur = {"dia": int(m.group(1)), "titulo": " ".join(partes), "pagina": p["page"], "bloques": []}
        days.append(cur)
        i = j
        continue
    if cur is not None and p["text"]:
        items = [p["text"]]
        if p["li"]:
            items = [x.strip() for x in BULLET_RE.split(p["text"]) if x.strip()]
        for txt in items:
            b = {"t": "li" if p["li"] else "p", "s": txt}
            if p["bold"]:
                b["b"] = True
            if p["ital"]:
                b["i"] = True
            if p["centered"]:
                b["c"] = True
            cur["bloques"].append(b)
    i += 1

for d in days:
    slug = re.sub(r"[^a-z0-9]+", "-", d["titulo"].lower()
                  .translate(str.maketrans("áéíóúüñ", "aeiouun"))).strip("-")
    d["id"] = f'{d["dia"]:02d}-{slug}'

HEAD_RE = r"^(Responde|Dinámica|Oración|Ejercicio|Tarea|Consejo de vida)\.?$"
for d in days:
    en_responde, ultimo_q, nuevos = False, None, []
    for b in d["bloques"]:
        if re.match(HEAD_RE, b["s"]):
            b["t"] = "h"
            en_responde = b["s"].startswith("Responde")
        elif en_responde and (re.match(r"^\d+\.\s", b["s"]) or "?" in b["s"]):
            b["t"] = "q"
            ultimo_q = b
        elif en_responde and ultimo_q and b["s"].startswith("SI/NO") and len(b["s"]) < 90:
            ultimo_q["s"] += " " + b["s"]
            continue
        else:
            en_responde = False
        nuevos.append(b)
    d["bloques"] = nuevos


def plain(pno):
    out = []
    for p in paragraphs(page_lines(pno)):
        if out and not re.search(r"[.!?:,”\"»)…]$", out[-1]):
            out[-1] += " " + p["text"]
        else:
            out.append(p["text"])
    return out


extra = {
    "introduccion": {"titulo": "Introducción",
                     "bloques": [{"t": "p", "s": s} for s in plain(2) if s.strip().upper() != "INTRODUCCION"]},
    "oracion_difuntos": {"titulo": "Oración por los difuntos", "bloques": [{"t": "p", "s": s} for s in plain(89)]},
}

json.dump({"fuente": "Guía para afrontar el Duelo en 40 días (PDF, 90 p.)", "dias": days, "extra": extra},
          open(OUT, "w"), ensure_ascii=False, indent=1)

with open(REV, "w") as f:
    for d in days:
        f.write(f'\n######## DÍA {d["dia"]} — {d["titulo"]}  (p. {d["pagina"]}, id {d["id"]})\n')
        for b in d["bloques"]:
            tag = b["t"] + ("B" if b.get("b") else "") + ("I" if b.get("i") else "") + ("C" if b.get("c") else "")
            f.write(f"[{tag}] {b['s']}\n")
    for k, v in extra.items():
        f.write(f"\n######## {v['titulo']}\n" + "\n".join("[p] " + b["s"] for b in v["bloques"]) + "\n")
print(len(days), "días;", sum(len(d["bloques"]) for d in days), "bloques")
