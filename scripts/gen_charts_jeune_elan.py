# -*- coding: utf-8 -*-
"""Graphiques matplotlib pour le dossier Jeune Élan (analyse de viabilité).
Palette dérivée de IG-1 Ink Gold (or #C9A84C) — cohérente avec le document Word.
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

fm.fontManager.addfont('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
plt.rcParams['font.sans-serif'] = ['DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

GOLD = "#C9A84C"
DARK = "#1A1A1A"
GREY = "#8A8A8A"
GRID = "#E0E0E0"
RED = "#C0392B"
ORANGE = "#E67E22"
GREEN = "#27AE60"
TEXT = "#333333"

OUT = "/home/z/my-project/scripts/assets"

# ─────────────────────────────────────────────────────────────
# Figure 1 — Passif hebdomadaire généré par les missions
# Hypothèse : 7 images validées/jour/jeune × 25 FCFA × 7 jours
# ─────────────────────────────────────────────────────────────
users = [100, 250, 500, 1000, 2000]
weekly = [u * 7 * 25 * 7 for u in users]  # FCFA / semaine

fig, ax = plt.subplots(figsize=(10, 5.8), constrained_layout=True)
bars = ax.bar([f"{u:,} jeunes".replace(",", " ") for u in users], weekly,
              color=GOLD, width=0.58, edgecolor="white", zorder=3)
for bar, val in zip(bars, weekly):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + max(weekly) * 0.015,
            f"{val:,} F".replace(",", " "), ha="center", va="bottom",
            fontsize=10.5, color=TEXT, fontweight="bold")
ax.set_title("Passif hebdomadaire généré par les missions selon le nombre de jeunes actifs",
             fontsize=13, pad=14, color=TEXT, fontweight="bold")
ax.set_ylabel("FCFA par semaine (récompenses 25 F / image)", fontsize=10.5, color=TEXT)
ax.set_xlabel("Jeunes actifs (7 images validées par jour, hypothèse moyenne)", fontsize=10.5, color=TEXT)
ax.spines[["top", "right"]].set_visible(False)
ax.grid(axis="y", alpha=0.35, color=GRID, zorder=0)
ax.yaxis.set_major_formatter(lambda x, pos: f"{x/1000:,.0f} kF".replace(",", " "))
ax.tick_params(colors=TEXT)
fig.savefig(f"{OUT}/fig1_passif_missions.png", dpi=200, facecolor="white", edgecolor="none")
plt.close(fig)

# ─────────────────────────────────────────────────────────────
# Figure 2 — Scénarios annuels à 500 jeunes actifs
# Base : 500 × 7 images × 365 j = 1 277 500 images/an × 25 F
#      = 31,9 M FCFA de récompenses missions émises par an
# ─────────────────────────────────────────────────────────────
scenarios = ["A. Statu quo\n(aucun revenu)",
             "B. Sponsors 30 %\n(75 F / image)",
             "C. Modèle diversifié\n(sponsors + frais)"]
revenus = [0.0, 28.7, 36.0]     # millions FCFA / an
passif = [31.9, 31.9, 31.9]     # missions uniquement
resultat = [r - p for r, p in zip(revenus, passif)]

fig, ax = plt.subplots(figsize=(11, 6.2), constrained_layout=True)
x = range(len(scenarios))
w = 0.27
b1 = ax.bar([i - w for i in x], revenus, width=w, color=GOLD, label="Revenus", zorder=3)
b2 = ax.bar(list(x), passif, width=w, color=GREY, label="Passif missions émis", zorder=3)
res_colors = [RED, ORANGE, GREEN]
b3 = ax.bar([i + w for i in x], resultat, width=w, color=res_colors, label="Résultat net (avant frais fixes)", zorder=3)
for bars_ in (b1, b2, b3):
    for bar in bars_:
        h = bar.get_height()
        label = f"{h:+,.1f} M".replace(",", " ") if h != 0 else "0,0"
        va = "bottom" if h >= 0 else "top"
        off = 0.5 if h >= 0 else -0.5
        ax.text(bar.get_x() + bar.get_width() / 2, h + off, label.replace(".", ","),
                ha="center", va=va, fontsize=9.5, color=TEXT, fontweight="bold")
ax.axhline(0, color=DARK, linewidth=1)
ax.set_xticks(list(x))
ax.set_xticklabels(scenarios, fontsize=10.5, color=TEXT)
ax.set_title("Scénarios annuels à 500 jeunes actifs — flux bruts (illustratifs)",
             fontsize=13, pad=14, color=TEXT, fontweight="bold")
ax.set_ylabel("Millions de FCFA par an", fontsize=10.5, color=TEXT)
ax.spines[["top", "right"]].set_visible(False)
ax.grid(axis="y", alpha=0.35, color=GRID, zorder=0)
ax.legend(loc="upper left", frameon=False, fontsize=10)
ax.tick_params(colors=TEXT)
fig.savefig(f"{OUT}/fig2_scenarios.png", dpi=200, facecolor="white", edgecolor="none")
plt.close(fig)

# Dimensions des PNG pour le docx
from PIL import Image
for f in ("fig1_passif_missions.png", "fig2_scenarios.png"):
    with Image.open(f"{OUT}/{f}") as im:
        print(f, im.size)
print("OK")
