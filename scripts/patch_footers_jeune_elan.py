# -*- coding: utf-8 -*-
"""Post-traitement du dossier Jeune Élan :
1. Remplace l'instrText PAGE par PAGE \\* ROMAN (section TDM) ou PAGE \\* arabic (corps)
   — selon le format pgNumType référencé par chaque section.
2. Supprime les <w:pgNumType/> vides (section couverture) qui perturbent WPS.
"""
import re
import sys
import shutil
import zipfile
import tempfile
import os

DOCX = sys.argv[1] if len(sys.argv) > 1 else "/home/z/my-project/download/Jeune_Elan_Dossier_Systeme_et_Viabilite.docx"

tmp = tempfile.mkdtemp()
with zipfile.ZipFile(DOCX) as z:
    z.extractall(tmp)

doc_path = os.path.join(tmp, "word", "document.xml")
rels_path = os.path.join(tmp, "word", "_rels", "document.xml.rels")
with open(doc_path, encoding="utf-8") as f:
    doc = f.read()
with open(rels_path, encoding="utf-8") as f:
    rels = f.read()

# rId -> fichier footer
rid_to_file = dict(re.findall(r'<Relationship Id="(rId\d+)"[^>]*Target="(footer\d+\.xml)"', rels))

# Parcours des sectPr dans l'ordre ; associe chaque footerReference au format pgNumType
sectprs = re.findall(r"<w:sectPr[ >].*?</w:sectPr>", doc, flags=re.S)
plan = {}  # footer file -> "roman" | "arabic"
for sp in sectprs:
    fmt_m = re.search(r'<w:pgNumType[^>]*w:fmt="([^"]+)"', sp)
    fmt = fmt_m.group(1) if fmt_m else None
    for rid in re.findall(r'<w:footerReference[^>]*r:id="(rId\d+)"', sp):
        f = rid_to_file.get(rid)
        if f and fmt == "upperRoman":
            plan[f] = "roman"
        elif f and fmt in ("decimal", None):
            # None = section couverture (pas de numéro) — on n'y touche pas si pas de footer
            if fmt == "decimal":
                plan[f] = "arabic"

print("Plan de correction :", plan)

for fname, kind in plan.items():
    fpath = os.path.join(tmp, "word", fname)
    if not os.path.exists(fpath):
        continue
    with open(fpath, encoding="utf-8") as f:
        xml = f.read()
    switch = "ROMAN" if kind == "roman" else "arabic"
    new_xml, n = re.subn(
        r"(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)",
        r"\1 PAGE \\* " + switch + r" \\* MERGEFORMAT \2",
        xml,
    )
    if n:
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(new_xml)
        print(f"{fname} : {n} champ(s) PAGE corrigé(s) vers \\* {switch}")

# Suppression des pgNumType vides (couverture)
doc2, n2 = re.subn(r"<w:pgNumType/>", "", doc)
if n2:
    with open(doc_path, "w", encoding="utf-8") as f:
        f.write(doc2)
    print(f"{n2} <w:pgNumType/> vide(s) supprimé(s)")

# Re-zip
out = DOCX
before = os.path.getsize(out)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(tmp):
        for file in files:
            full = os.path.join(root, file)
            z.write(full, os.path.relpath(full, tmp))
shutil.rmtree(tmp)
print(f"Recompressé : {before} -> {os.path.getsize(out)} octets")
