// Générateur du dossier Word « Jeune Élan » — docx-js
// Recette de couverture R1 (Pure Paragraph Left) + palette IG-1 Ink Gold (finance)
// Structure 3 sections : couverture / table des matières (romains) / corps (arabes)
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  TableLayoutType, SectionType, TableOfContents,
} = require("docx");
const fs = require("fs");
const { imageSize } = require("image-size");

const part1 = require("./doc_content_part1.js");
const part2 = require("./doc_content_part2.js");
const part3 = require("./doc_content_part3.js");
const chapters = [...part1, ...part2, ...part3];

// ── Palette IG-1 Ink Gold (design-system.md) ──
const P = {
  bg: "1A1A1A", primary: "FFFFFF", accent: "C9A84C",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  table: { headerBg: "C9A84C", headerText: "1A1A1A", accentLine: "C9A84C", innerLine: "DDD5C0", surface: "F5F2E8" },
};
const INK = "1A1A1A";      // titres du corps
const BODY = "000000";     // texte courant (profil formel : noir pur)
const FONTS = { ascii: "Times New Roman", hAnsi: "Times New Roman", eastAsia: "Times New Roman" };

const NB = { style: BorderStyle.NONE, size: 0, color: "auto" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

// ── Largeur utile du corps : 11906 - 1701 - 1417 = 8788 twips ≈ 585 px ──
const MAX_IMG_PX = 570;

// ══════════════════════════ Couverture R1 ══════════════════════════
function estimateTextWidth(text, pt) {
  let w = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    const isCJK = (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3000 && code <= 0x303f) || (code >= 0xff00 && code <= 0xffef);
    w += isCJK ? pt * 20 : pt * 11;
  }
  return w;
}
function splitLatinLines(title, maxWidthTwips, pt) {
  const words = title.split(" ");
  const lines = [];
  let cur = "";
  for (const word of words) {
    const test = cur ? cur + " " + word : word;
    if (estimateTextWidth(test, pt) <= maxWidthTwips || !cur) cur = test;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  // pas de ligne orpheline très courte
  if (lines.length > 1 && lines[lines.length - 1].length <= 3) {
    const last = lines.pop();
    lines[lines.length - 1] += " " + last;
  }
  return lines;
}
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  let pt = preferredPt;
  while (pt >= minPt) {
    const lines = splitLatinLines(title, maxWidthTwips, pt);
    if (lines.length <= 3) return { titlePt: pt, titleLines: lines };
    pt -= 2;
  }
  return { titlePt: minPt, titleLines: splitLatinLines(title, maxWidthTwips, minPt) };
}
function calcCoverSpacing(params) {
  const { titleLineCount = 1, titlePt = 36, hasSubtitle = false, hasEnglishLabel = false,
    metaLineCount = 0, fixedHeight = 800, pageHeight = 16838, marginTop = 0, marginBottom = 0 } = params;
  const SAFETY = 1200;
  const usable = pageHeight - marginTop - marginBottom - SAFETY;
  const titleH = titleLineCount * (titlePt * 23 + 200);
  const subH = hasSubtitle ? (12 * 23 + 600) : 0;
  const engH = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaH = metaLineCount * (10 * 23 + 100);
  const implicit = 3 * 300;
  const content = titleH + subH + engH + metaH + fixedHeight + implicit;
  const remaining = Math.max(usable - content, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(remaining * 0.45);
  const rawBottom = Math.floor(remaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  return { topSpacing, bottomSpacing };
}
function buildCoverR1(config) {
  const C = config.palette;
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length, fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: C.accent, space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));
  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.accent, space: 8 } },
      children: [new TextRun({ text: config.englishLabel.split("").join("  "), size: 18, color: C.accent, font: { ascii: "Arial", hAnsi: "Arial" }, characterSpacing: 40 })],
    }));
  }
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true, color: C.titleColor, font: { ascii: "Arial", hAnsi: "Arial", eastAsia: "Arial" } })],
    }));
  }
  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 800, line: 312 },
      children: [new TextRun({ text: config.subtitle, size: 26, color: C.subtitleColor, font: { ascii: "Arial", hAnsi: "Arial" } })],
    }));
  }
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200, right: padR }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 22, color: C.metaColor, font: { ascii: "Arial", hAnsi: "Arial" } })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: C.footerColor, font: { ascii: "Arial", hAnsi: "Arial" } }),
      new TextRun({ text: "                                                            ", color: C.footerColor }),
      new TextRun({ text: config.footerRight || "", size: 16, color: C.footerColor, font: { ascii: "Arial", hAnsi: "Arial" } }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: C.bg }, borders: noBorders,
        children,
      })],
    })],
  })];
}

// ══════════════════════════ Aides de rendu du corps ══════════════════════════
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 180, line: 380, lineRule: "atLeast" },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: P.accent, space: 6 } },
    children: [new TextRun({ text, bold: true, size: 32, color: INK, font: FONTS })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120, line: 340, lineRule: "atLeast" },
    children: [new TextRun({ text, bold: true, size: 28, color: INK, font: FONTS })],
  });
}
function bodyP(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 140, line: 312 },
    children: [new TextRun({ text, size: 24, color: BODY, font: FONTS })],
  });
}
function tableCaption(text) {
  return new Paragraph({
    keepNext: true,
    spacing: { before: 160, after: 100, line: 312 },
    children: [new TextRun({ text, bold: true, size: 21, color: INK, font: FONTS })],
  });
}
function cell(text, opts = {}) {
  const { header = false, zebra = false, width, alignLeft = true } = opts;
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: { type: ShadingType.CLEAR, fill: header ? P.table.headerBg : (zebra ? P.table.surface : "FFFFFF") },
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: [new Paragraph({
      alignment: alignLeft ? AlignmentType.LEFT : AlignmentType.CENTER,
      spacing: { line: 276 },
      children: [new TextRun({ text, size: 20, bold: header, color: header ? P.table.headerText : BODY, font: FONTS })],
    })],
  });
}
function buildTable(headers, widths, rows) {
  const trs = [];
  trs.push(new TableRow({
    tableHeader: true, cantSplit: true,
    children: headers.map((t, i) => cell(t, { header: true, width: widths[i] })),
  }));
  rows.forEach((r, idx) => {
    trs.push(new TableRow({
      cantSplit: true,
      children: r.map((t, i) => cell(t, { zebra: idx % 2 === 1, width: widths[i] })),
    }));
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: P.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: P.table.accentLine },
      left: NB, right: NB,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine },
      insideVertical: NB,
    },
    rows: trs,
  });
}
function buildImage(path, caption, desiredWidth) {
  const buf = fs.readFileSync(path);
  const dim = imageSize(buf);
  const w = Math.min(desiredWidth || MAX_IMG_PX, MAX_IMG_PX);
  const h = Math.round(w * dim.height / dim.width);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: 160, after: 60 },
      children: [new ImageRun({ data: buf, transformation: { width: w, height: h }, type: "png" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, line: 276 },
      children: [new TextRun({ text: caption, italics: true, size: 18, color: "606060", font: FONTS })],
    }),
  ];
}

// Rendu des chapitres
function renderChapters(list) {
  const out = [];
  for (const ch of list) {
    out.push(h1(ch.title));
    for (const b of ch.blocks) {
      if (b.type === "p") out.push(bodyP(b.text));
      else if (b.type === "h2") out.push(h2(b.text));
      else if (b.type === "table") {
        out.push(tableCaption(b.caption));
        out.push(buildTable(b.headers, b.widths, b.rows));
        out.push(new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: "", size: 2, color: BODY, font: FONTS })] }));
      }
      else if (b.type === "img") out.push(...buildImage(b.path, b.caption, b.width));
    }
  }
  return out;
}

// ══════════════════════════ Pieds de page / en-têtes ══════════════════════════
function pageNumFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: FONTS })],
    })],
  });
}
function bodyHeader() {
  return new Header({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.innerLine, space: 4 } },
      children: [new TextRun({ text: "Jeune Élan — dossier système et analyse de viabilité", size: 18, color: "808080", font: FONTS })],
    })],
  });
}

// ══════════════════════════ Assemblage ══════════════════════════
const pgSize = { width: 11906, height: 16838 };
const pgMargin = { top: 1440, bottom: 1440, left: 1701, right: 1417 };

const coverConfig = {
  title: "Jeune Élan",
  subtitle: "Dossier complet du système et analyse de viabilité pour l'administrateur",
  englishLabel: "DOSSIER SYSTEME ET ANALYSE",
  metaLines: [
    "Projet : Jeune Élan (dépôt to-be-riche)",
    "Contenu : fonctionnement, sécurité, viabilité financière",
    "Version : 1.0 — 22 septembre 2026",
    "Diffusion : usage interne de l'administrateur",
  ],
  footerLeft: "Jeune Élan — document interne",
  footerRight: "Septembre 2026",
  palette: { bg: P.bg, titleColor: P.cover.titleColor, subtitleColor: P.cover.subtitleColor, metaColor: P.cover.metaColor, accent: P.accent, footerColor: P.cover.footerColor },
};

const doc = new Document({
  creator: "Jeune Élan",
  title: "Jeune Élan — dossier système et analyse de viabilité",
  styles: {
    default: {
      document: {
        run: { font: FONTS, size: 24, color: BODY },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: FONTS, size: 32, bold: true, color: INK },
        paragraph: { spacing: { before: 400, after: 180, line: 380 }, outlineLevel: 0 },
      },
      heading2: {
        run: { font: FONTS, size: 28, bold: true, color: INK },
        paragraph: { spacing: { before: 280, after: 120, line: 340 }, outlineLevel: 1 },
      },
      heading3: {
        run: { font: FONTS, size: 24, bold: true, color: INK },
        paragraph: { spacing: { before: 200, after: 100, line: 312 }, outlineLevel: 2 },
      },
    },
  },
  sections: [
    // Section 1 — Couverture (marges 0, pas de pied de page)
    {
      properties: { page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: buildCoverR1(coverConfig),
    },
    // Section 2 — Table des matières (chiffres romains)
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      footers: { default: pageNumFooter() },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360, line: 380, lineRule: "atLeast" },
          children: [new TextRun({ text: "Table des matières", bold: true, size: 32, color: INK, font: FONTS })],
        }),
        new TableOfContents("Table des matières", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({
          spacing: { before: 220, line: 276 },
          children: [new TextRun({
            text: "Remarque : cette table des matières est générée par champs. Après toute modification du document, faites un clic droit sur la table puis choisissez « Mettre à jour les champs » pour actualiser la pagination.",
            italics: true, size: 18, color: "888888", font: FONTS,
          })],
        }),
      ],
    },
    // Section 3 — Corps (chiffres arabes repartant à 1)
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: { default: bodyHeader() },
      footers: { default: pageNumFooter() },
      children: renderChapters(chapters),
    },
  ],
});

const OUT = "/home/z/my-project/download/Jeune_Elan_Dossier_Systeme_et_Viabilite.docx";
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log("OK — document généré :", OUT, "(", buf.length, "octets )");
});
