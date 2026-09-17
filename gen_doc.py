from docx import Document
from docx.shared import Pt, Inches, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
import os

doc = Document()

# ---- Style setup ----
style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(11)
style.paragraph_format.line_spacing = 1.3
style.paragraph_format.space_after = Pt(4)

for level, (size, color) in enumerate([(22, '22C55E'), (16, '16A34A'), (13, '0F766E'), (12, '374151')], 1):
    hs = doc.styles[f'Heading {level}']
    hs.font.size = Pt(size)
    hs.font.color.rgb = RGBColor.from_string(color)
    hs.font.bold = True
    hs.font.name = 'Calibri'
    hs.paragraph_format.space_before = Pt(16 if level <= 2 else 10)
    hs.paragraph_format.space_after = Pt(6)

def add_table(headers, rows, col_widths=None):
    t = doc.add_table(rows=1+len(rows), cols=len(headers))
    t.style = 'Light Grid Accent 1'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(headers):
        cell = t.rows[0].cells[i]
        cell.text = h
        for p in cell.paragraphs: p.runs[0].bold = True; p.runs[0].font.size = Pt(10)
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            cell = t.rows[ri+1].cells[ci]
            cell.text = str(val)
            for p in cell.paragraphs: p.runs[0].font.size = Pt(10)
    return t

def p(text, bold=False, size=11):
    pp = doc.add_paragraph()
    r = pp.add_run(text)
    r.bold = bold
    r.font.size = Pt(size)
    return pp

def bullet(text):
    pp = doc.add_paragraph(text, style='List Bullet')
    return pp

# ==================== COVER ====================
for _ in range(6): doc.add_paragraph()
p_t = doc.add_paragraph()
p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p_t.add_run('BE RICH')
r.font.size = Pt(40)
r.font.color.rgb = RGBColor.from_string('22C55E')
r.bold = True

p_s = doc.add_paragraph()
p_s.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p_s.add_run('Documentation Compl\u00e8te de la Plateforme')
r.font.size = Pt(18)
r.font.color.rgb = RGBColor.from_string('16A34A')

p_v = doc.add_paragraph()
p_v.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p_v.add_run('Version 1.0 \u2014 Tous les modules, r\u00e8gles, fonctionnements')
r.font.size = Pt(12)
r.font.color.rgb = RGBColor(0x66, 0x66, 0x66)

for _ in range(4): doc.add_paragraph()
p_d = doc.add_paragraph()
p_d.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p_d.add_run('Document confidentiel \u2014 Usage interne uniquement')
r.font.size = Pt(10)
r.font.color.rgb = RGBColor(0x99, 0x99, 0x99)
doc.add_page_break()

# ==================== TABLE OF CONTENTS (manual) ====================
doc.add_heading('Table des Mati\u00e8res', level=1)
toc_items = [
    '1. Pr\u00e9sentation G\u00e9n\u00e9rale', '2. Architecture Technique', '3. Syst\u00e8me de Comptes (5 Soldes)',
    '4. Authentification et Sessions', '5. Syst\u00e8me de Parrainage', '6. Syst\u00e8me de D\u00e9p\u00f4ts',
    '7. Syst\u00e8me de Retraits', '8. Transferts entre Comptes', '9. Syst\u00e8me d\u2019Investissement',
    '10. Trading Binaire', '11. Ar\u00e8ne de Trading', '12. Entreprises / Projets',
    '13. Plateforme Vid\u00e9o', '14. Jeu de la Roue de la Fortune', '15. Syst\u00e8me de Chat et Support',
    '16. Syst\u00e8me de Notifications', '17. Panneau d\u2019Administration', '18. Fonctionnalit\u00e9s Annexes',
    '19. Base de Donn\u00e9es \u2014 Sch\u00e9ma Complet', '20. Configuration du Site',
    '21. S\u00e9curit\u00e9 et Anti-Fraude', '22. Points de Vigilance'
]
for item in toc_items:
    doc.add_paragraph(item, style='List Number')
doc.add_page_break()

# ==================== CHAPTER 1 ====================
doc.add_heading('1. Pr\u00e9sentation G\u00e9n\u00e9rale', level=1)
p('BE RICH est une plateforme financi\u00e8re compl\u00e8te d\u00e9velopp\u00e9e en Next.js 16 avec TypeScript, Tailwind CSS 4, shadcn/ui et Prisma ORM (SQLite). L\u2019application est con\u00e7ue en format mobile-first (max 430px) avec une navigation par onglets en bas de page.')
p('La plateforme propose plusieurs moyens de gagner de l\u2019argent : visionnage de vid\u00e9os r\u00e9mun\u00e9r\u00e9es, investissements \u00e0 niveaux, trading binaire, ar\u00e8ne de trading en temps r\u00e9el, cr\u00e9ation d\u2019entreprises virtuelles, et un jeu de casino (roulette).')
doc.add_heading('Fonctionnalit\u00e9s principales', level=2)
bullet('Authentification avec OTP par email')
bullet('Portefeuille multi-comptes (5 soldes distincts)')
bullet('D\u00e9p\u00f4ts via TRX (Tron) et YAS (Mobile Money Togo)')
bullet('Investissements \u00e0 3 niveaux avec rendements de 5%/jour')
bullet('Trading binaire sur 6 actifs')
bullet('Ar\u00e8ne de trading avec positions ouvertes, stop-loss et take-profit')
bullet('Plateforme vid\u00e9o : 5 vid\u00e9os/jour r\u00e9mun\u00e9r\u00e9es')
bullet('Roue de la fortune avec 10 tours/jour')
bullet('Syst\u00e8me de parrainage avec bonus')
bullet('Chat avec IA et support admin')
bullet('Panneau d\u2019administration complet')
bullet('PWA installable (Service Worker)')

# ==================== CHAPTER 2 ====================
doc.add_heading('2. Architecture Technique', level=1)
doc.add_heading('Stack technologique', level=2)
add_table(
    ['Technologie', 'Version', 'Usage'],
    [['Next.js', '16.1.x', 'Framework principal (App Router)'],
     ['TypeScript', '5', 'Langage principal'],
     ['Tailwind CSS', '4', 'Styles et responsive'],
     ['shadcn/ui', 'New York', 'Composants UI'],
     ['Prisma ORM', '6.x', 'Base de donn\u00e9es SQLite'],
     ['Zustand', '5.x', 'State management client'],
     ['Socket.io', '4.8', 'Chat temps r\u00e9el (port 3003)'],
     ['z-ai-web-dev-sdk', '0.0.17', 'IA chatbot'],
     ['Framer Motion', '12.x', 'Animations'],
     ['Recharts', '2.x', 'Graphiques'],
     ['Lucide React', '0.525', 'Ic\u00f4nes'], ['Bun', '1.3', 'Runtime JavaScript']]
)
doc.add_heading('Structure des fichiers', level=2)
add_table(
    ['Dossier', 'Contenu'],
    [['src/app/api/', '40+ routes API (auth, deposit, invest, trade, etc.)'],
     ['src/components/screens/', '15+ \u00e9crans (Auth, Home, Wallet, Invest, Trading, etc.)'],
     ['src/components/ui/', 'Composants shadcn/ui'],
     ['src/components/', 'Composants m\u00e9tier (NotificationBell, PromoBanner, etc.)'],
     ['src/lib/', 'Utilitaires (store, auth, payment, notify, etc.)'],
     ['mini-services/chat-service/', 'Service Socket.io temps r\u00e9el'],
     ['prisma/', 'Sch\u00e9ma de base de donn\u00e9es (15+ mod\u00e8les)'],
     ['public/', 'Assets, PWA manifest, Service Worker']]
)

# ==================== CHAPTER 3 ====================
doc.add_heading('3. Syst\u00e8me de Comptes (5 Soldes)', level=1)
p('Chaque utilisateur dispose de 5 comptes distincts :')
add_table(
    ['Champ BD', 'Nom Affich\u00e9', 'Usage', 'Alimentation'],
    [['balance', 'Compte Principal (Jeu)', 'Solde par d\u00e9faut. D\u00e9p\u00f4ts directs, bonus parrainage, gains roulette. Source par d\u00e9faut des retraits.', 'D\u00e9p\u00f4ts directs, TRX, YAS, transferts'],
     ['investBalance', 'Compte Investissement', 'Fonds investis dans les niveaux. Gains d\u2019investissement cr\u00e9dit\u00e9s ici.', 'D\u00e9p\u00f4ts TRX/YAS cibl\u00e9s invest, transferts depuis principal'],
     ['tradeBalance', 'Compte Trading', 'Solde d\u00e9di\u00e9 au trading. D\u00e9bit\u00e9 \u00e0 l\u2019ouverture de positions.', 'Uniquement par admin (update-balance, transfer-funds)'],
     ['projectBalance', 'Compte Projet', 'Solde d\u00e9di\u00e9 aux entreprises. D\u00e9bit\u00e9 \u00e0 la cr\u00e9ation d\u2019entreprise.', 'D\u00e9p\u00f4ts TRX/YAS cibl\u00e9s projet, transferts depuis principal'],
     ['videoBalance', 'Compte Vid\u00e9o', 'Gains accumul\u00e9s via le visionnage de vid\u00e9os. Retrait min $1.', 'Uniquement via r\u00e9compenses vid\u00e9o (pas de d\u00e9p\u00f4t possible)']]
)

# ==================== CHAPTER 4 ====================
doc.add_heading('4. Authentification et Sessions', level=1)
doc.add_heading('4.1 Inscription', level=2)
add_table(
    ['Champ', 'R\u00e8gle de Validation'],
    [['name', 'Obligatoire, minimum 2 caract\u00e8res, unique insensible \u00e0 la casse'],
     ['email', 'Obligatoire, unique (insensible \u00e0 la casse)'],
     ['phone', 'Obligatoire, 8 \u00e0 15 chiffres, unique, pr\u00e9fixes Togo accept\u00e9s'],
     ['password', 'Minimum 6 caract\u00e8res (stock\u00e9 en clair en base)'],
     ['password2', 'Doit \u00eatre identique \u00e0 password'],
     ['referralCode', 'Optionnel. Si fourni, doit correspondre \u00e0 un utilisateur existant']]
)
p('Apr\u00e8s inscription, le compte est cr\u00e9\u00e9 avec emailVerified=false. Un code OTP \u00e0 6 chiffres est envoy\u00e9 par email (validit\u00e9 10 min). L\u2019utilisateur doit v\u00e9rifier son email avant de pouvoir se connecter.', bold=False)
p('Le code de parrainage est auto-g\u00e9n\u00e9r\u00e9 : pr\u00e9fixe "BR-" + 6 caract\u00e8res alphanum\u00e9riques.', bold=False)

doc.add_heading('4.2 Connexion', level=2)
bullet('Comparaison du mot de passe en clair (pas de hashage)')
bullet('Si email non v\u00e9rifi\u00e9 \u2192 envoi OTP, pas de connexion')
bullet('Rotation du sessionToken \u00e0 chaque connexion (anti-fraude, session unique)')
bullet('Cookie br_token contenant le sessionToken (32 chars hex), dur\u00e9e 7 jours')
bullet('Chargement en parall\u00e8le : transactions, investissements, trades, entreprises, retraits')
bullet('\u00c9ligibilit\u00e9 retrait : 48h apr\u00e8s le premier d\u00e9p\u00f4t (admin exempt\u00e9)')

doc.add_heading('4.3 V\u00e9rification OTP', level=2)
bullet('Code \u00e0 6 chiffres g\u00e9n\u00e9r\u00e9 al\u00e9atoirement (100000-999999)')
bullet('Stock\u00e9 en hash SHA-256 en base (jamais en clair)')
bullet('Validit\u00e9 : 10 minutes')
bullet('Chaque nouvel envoi invalide les OTP pr\u00e9c\u00e9dents non utilis\u00e9s')
bullet('En mode simulation (pas de Gmail configur\u00e9), le code est retourn\u00e9 dans la r\u00e9ponse API')

doc.add_heading('4.4 R\u00e9initialisation mot de passe', level=2)
bullet('Deux flux : OTP-based (/forgot-password) et token-based (/reset-password)')
bullet('OTP : envoi code + v\u00e9rification + nouveau mot de passe (min 6 car.)')
bullet('Token : lien unique avec expiration, usage unique')

# ==================== CHAPTER 5 ====================
doc.add_heading('5. Syst\u00e8me de Parrainage', level=1)
doc.add_heading('5.1 Code de parrainage', level=2)
p('Chaque utilisateur re\u00e7oit un code unique au format BR-XXXXXX (6 caract\u00e8res alphanum\u00e9riques, lettres ambigues I/O/0/1 exclues). Le lien de parrainage est : beriche.duckdns.org/?ref=CODE')

doc.add_heading('5.2 Bonus premier d\u00e9p\u00f4t du filleul', level=2)
bullet('20% du montant du premier d\u00e9p\u00f4t du filleul cr\u00e9dit\u00e9 au parrain')
bullet('D\u00e9clench\u00e9 uniquement lors de l\u2019approbation admin (TRX ou YAS)')
bullet('Cr\u00e9dit\u00e9 sur le compte principal du parrain')

doc.add_heading('5.3 Exigence de filleuls pour les retraits', level=2)
add_table(
    ['Retraits compl\u00e9t\u00e9s', 'Filleuls requis'],
    [['1 \u00e0 4', '0'], ['5 \u00e0 8', '1'], ['9 \u00e0 12', '2'], ['13 \u00e0 16', '3'], ['17 \u00e0 20', '4']]
)
p('Formule : Math.floor(completedWithdrawals / 4)')

doc.add_heading('5.4 Cadeau surprise \u00e0 12 parrainages', level=2)
bullet('Montant : 5$ cr\u00e9dit\u00e9s sur le compte principal')
bullet('Unique par utilisateur (flag referralRewardClaimed)')
bullet('Non annonc\u00e9 dans l\u2019interface \u2014 d\u00e9couverte via notification et FloatingGift')

doc.add_heading('5.5 World Link (secret)', level=2)
bullet('D\u00e9bloqu\u00e9 \u00e0 10+ parrainages (API) / 12+ (composant FloatingGift)')
bullet('Lien configurable par l\u2019admin dans la configuration du site')

# ==================== CHAPTER 6 ====================
doc.add_heading('6. Syst\u00e8me de D\u00e9p\u00f4ts', level=1)
doc.add_heading('6.1 D\u00e9p\u00f4t direct (cr\u00e9dit imm\u00e9diat)', level=2)
add_table(
    ['Param\u00e8tre', 'Valeur'],
    [['Minimum', '5$'], ['Maximum', '50 000$'], ['Destination', 'Compte principal (balance)'], ['Frais', 'Aucun'], ['Approbation', 'Aucune (cr\u00e9dit imm\u00e9diat)']]
)

doc.add_heading('6.2 D\u00e9p\u00f4t TRX (Tron)', level=2)
add_table(
    ['Param\u00e8tre', 'Valeur'],
    [['Minimum', '5$ USD'], ['Maximum', '50 000$ USD'], ['Conversion', 'amountTrx = amountUsd / trxPrice'],
     ['Prix TRX', '0.12$/TRX par d\u00e9faut (configurable, API Trongrid)'],
     ['Adresse admin', 'TRMJ5R1cKbrMLy19PLu9rVtVGc5Ff2ZrHY (configurable)'],
     ['Destinations', 'jeu \u2192 balance, projet \u2192 projectBalance, invest \u2192 investBalance'],
     ['Approbation', 'OBLIGATOIRE (statut pending)'],
     ['Limite', 'Un seul d\u00e9p\u00f4t en attente \u00e0 la fois (TRX ou YAS)']]
)

doc.add_heading('6.3 D\u00e9p\u00f4t YAS (Mobile Money Togo)', level=2)
add_table(
    ['Param\u00e8tre', 'Valeur'],
    [['Devise saisie', 'FCFA'], ['Minimum', '3 000 FCFA'], ['Maximum', '50 000$ USD \u00e9quivalent'],
     ['Conversion FCFA\u2192USD', 'amountUsd = amountCfa / cfaUsdRate'],
     ['Taux CFA/USD', '600 par d\u00e9faut dans le code d\u00e9p\u00f4t, 550 dans site-config'],
     ['Code USSD', '*145*1*{montantCfa}*{adminYasAccount}*2#'],
     ['Compte admin YAS', '90876459 (configurable)'],
     ['Num\u00e9ros valides', '8 chiffres, pr\u00e9fixes 90-93 ou 70-73'],
     ['Approbation', 'OBLIGATOIRE (statut pending)']]
)

doc.add_heading('6.4 Approbation admin des d\u00e9p\u00f4ts', level=2)
bullet('L\u2019admin voit tous les d\u00e9p\u00f4ts en attente (TRX et YAS s\u00e9par\u00e9ment)')
bullet('Peut approuver (cr\u00e9dite le solde) ou rejeter (notification utilisateur)')
bullet('En cas d\u2019approbation : cr\u00e9dit du compte destination + bonus parrainage 20% si premier d\u00e9p\u00f4t')
bullet('Si type=\u2019investment\u2019 : cr\u00e9e un enregistrement Investment avec un rendement de 5%/jour')

# ==================== CHAPTER 7 ====================
doc.add_heading('7. Syst\u00e8me de Retraits', level=1)
doc.add_heading('7.1 R\u00e8gles communes', level=2)
bullet('D\u00e9lai de 48 heures apr\u00e8s le premier d\u00e9p\u00f4t (admin exempt\u00e9)')
bullet('Exigence de parrainage : floor(completedWithdrawals / 4) filleuls')
bullet('Un seul retrait en attente \u00e0 la fois')
bullet('Aucune d\u00e9duction de solde \u00e0 la cr\u00e9ation \u2014 d\u00e9bit \u00e0 l\u2019ex\u00e9cution par l\u2019admin')
bullet('Sources : jeu (balance), investissement (investBalance), projet (projectBalance), vid\u00e9o (videoBalance)')

doc.add_heading('7.2 Retrait TRX', level=2)
add_table(
    ['Param\u00e8tre', 'Valeur'],
    [['Minimum', '5$ (1$ si source=vid\u00e9o)'], ['Maximum', '50 000$'],
     ['Adresse TRX', 'Doit commencer par T, 34 caract\u00e8res alphanum\u00e9riques'],
     ['Approbation', '2 \u00e9tapes : approve \u2192 execute']]
)

doc.add_heading('7.3 Retrait YAS', level=2)
add_table(
    ['Param\u00e8tre', 'Valeur'],
    [['Minimum', '5$'], ['Maximum', '50 000$'],
     ['Conversion', 'amountCfa = amountUsd \u00d7 cfaUsdRate (d\u00e9faut 550)'],
     ['Num\u00e9ro YAS', '8 chiffres, pr\u00e9fixes 90-93 ou 70-73']]
)

doc.add_heading('7.4 Flux d\u2019approbation admin (3 actions)', level=2)
add_table(
    ['Action', 'Effet'],
    [['approve', 'Change statut pending\u2192approved. Aucun d\u00e9bit.'],
     ['execute', 'D\u00e9bite le compte source. Cr\u00e9e transaction type withdrawal.'],
     ['reject', 'Annule le retrait. Aucun remboursement (solde jamais d\u00e9bit\u00e9).']]
)

# ==================== CHAPTER 8 ====================
doc.add_heading('8. Transferts entre Comptes', level=1)
add_table(
    ['Param\u00e8tre', 'Valeur'],
    [['Comptes \u00e9ligibles', 'principal \u2194 invest \u2194 projet'],
     ['Minimum', '2$'], ['Maximum', '50 000$'],
     ['Frais', '2% si source = principal. Gratuit si source = invest ou projet'],
     ['Impossible', 'Transfert principal\u2192invest (d\u00e9p\u00f4t direct requis). Pas de transfert vers/depuis trade ou video.']]
)
doc.add_heading('Cas sp\u00e9cial : Blocage niveau 2', level=2)
bullet('Si investissement actif niveau \u2265 2 ET moins de 12 filleuls')
bullet('Fonds transf\u00e9r\u00e9s invest\u2192principal bloqu\u00e9s 10 jours (heldInvestBalance)')
bullet('Lib\u00e9r\u00e9s uniquement apr\u00e8s 10 jours ET 12+ filleuls')
bullet('Cach\u00e9 de l\u2019interface utilisateur')

# ==================== CHAPTER 9 ====================
doc.add_heading('9. Syst\u00e8me d\u2019Investissement', level=1)
doc.add_heading('9.1 Niveaux d\u2019investissement', level=2)
add_table(
    ['Niveau', 'Label', 'Montant', 'Taux Journalier', 'Parrainages Requis'],
    [['1', 'D\u00e9butant', '5$ - 15$', '5%', '0'],
     ['2', 'Business', '65$ - 250$', '5%', '12'],
     ['3', 'Elite', '500$ - 3 000$', '5%', '25']]
)
bullet('Tous les niveaux : 5% par jour, cycles illimit\u00e9s (totalCycles = 0)')
bullet('D\u00e9blocage s\u00e9quentiel : Niveau 2 puis Niveau 3')
bullet('Cr\u00e9ation via d\u00e9p\u00f4t TRX/YAS avec type=\u2019investment\u2019 (approbation admin requise)')

doc.add_heading('9.2 Collecte des gains (Claim)', level=2)
bullet('Fr\u00e9quence : toutes les 24 heures')
bullet('Gain par cycle : montant investi \u00d7 5%')
bullet('Mode "main" : cr\u00e9dit\u00e9 sur investBalance')
bullet('Mode "yas_trx" : retrait direct (min 5$ de gain, approbation admin)')
bullet('Niveau \u2265 2 : n\u00e9cessite 12+ filleuls pour r\u00e9colter')
bullet('Bonus admin : 5% de la collecte cr\u00e9dit\u00e9 au parrain du cr\u00e9ateur')

# ==================== CHAPTER 10 ====================
doc.add_heading('10. Trading Binaire', level=1)
doc.add_heading('10.1 Param\u00e8tres', level=2)
add_table(
    ['Param\u00e8tre', 'Valeur'],
    [['Montant min/max', '1$ - 5$'], ['Directions', 'up (hausse) / down (baisse)'],
     ['Dur\u00e9es', '60 \u00e0 600 secondes (1-10 min)'], ['Solde d\u00e9bit\u00e9', 'tradeBalance']]
)

doc.add_heading('10.2 Actifs et prix', level=2)
add_table(
    ['Actif', 'Prix Base', 'Volatilit\u00e9', 'D\u00e9cimales'],
    [['BTC', '67 500$', '\u00b1800', '2'], ['ETH', '3 450$', '\u00b1120', '2'],
     ['EUR', '1.085$', '\u00b10.008', '4'], ['GOLD', '2 340$', '\u00b135', '2'],
     ['AAPL', '192$', '\u00b14', '2'], ['TSLA', '245$', '\u00b18', '2']]
)

# ==================== CHAPTER 11 ====================
doc.add_heading('11. Ar\u00e8ne de Trading', level=1)
doc.add_heading('11.1 Param\u00e8tres', level=2)
add_table(
    ['Param\u00e8tre', 'Valeur'],
    [['Montant min', '1$'], ['Solde min acc\u00e8s', '5$'], ['Directions', 'BUY / SELL'],
     ['Stop Loss', '0.1% \u00e0 50% (optionnel)'], ['Take Profit', '0.1% \u00e0 200% (optionnel)']]
)
doc.add_heading('11.2 Actifs', level=2)
add_table(
    ['Actif', 'Prix Base', 'Volatilit\u00e9', 'Pips'],
    [['EUR/USD', '1.085', '0.008', '0.0001'], ['GBP/USD', '1.27', '0.012', '0.0001'],
     ['BTC/USD', '67 500$', '800', '0.01'], ['ETH/USD', '3 450$', '120', '0.01'],
     ['GOLD/USD', '2 340$', '35', '0.01'], ['SILVER/USD', '29.5$', '0.8', '0.001']]
)
doc.add_heading('11.3 Simulation des prix', level=2)
bullet('100% fictif \u2014 aucun prix r\u00e9el')
bullet('PRNG avec r\u00e9version \u00e0 la moyenne, volatilit\u00e9 GARCH, d\u00e9rive max \u00b115%')
bullet('Mise \u00e0 jour toutes les ~500ms')
bullet('Spreads simul\u00e9s : 1.5 pips forex, 2 m\u00e9taux, 3 ETH, 5 BTC')

doc.add_heading('11.4 Fermeture automatique', level=2)
bullet('Stop Loss d\u00e9clench\u00e9 si plPercent <= -stopLoss')
bullet('Take Profit d\u00e9clench\u00e9 si plPercent >= takeProfit')
bullet('Liquidation si perte > 90% du montant')

# ==================== CHAPTER 12 ====================
doc.add_heading('12. Entreprises / Projets', level=1)
doc.add_heading('12.1 Cr\u00e9ation d\u2019entreprise', level=2)
add_table(
    ['Type', 'Dur\u00e9e', 'Rendement', 'Investissement Min'],
    [['Starter', '30 jours', '+100%', '10$'], ['Growth', '45 jours', '+150%', '10$'],
     ['Premium', '60 jours', '+200%', '10$'], ['Elite', '75 jours', '+250%', '10$'],
     ['VIP', '90 jours', '+300%', '10$']]
)
bullet('Fonds pr\u00e9lev\u00e9s du compte Projet (projectBalance)')
bullet('Nom g\u00e9n\u00e9r\u00e9 al\u00e9atoirement (pr\u00e9fixe + cat\u00e9gorie)')
bullet('R\u00e9clamation apr\u00e8s finishesAt : rendement al\u00e9atoire entre minReturn et maxReturn')

# ==================== CHAPTER 13 ====================
doc.add_heading('13. Plateforme Vid\u00e9o', level=1)
doc.add_heading('13.1 Param\u00e8tres', level=2)
add_table(
    ['Param\u00e8tre', 'Valeur'],
    [['Limite quotidienne', '5 vid\u00e9os/jour'], ['Condition r\u00e9compense', 'Regarder \u2265 30% de la vid\u00e9o'],
     ['Catalogue', '30 vid\u00e9os (chinoises, japonaises, indiennes, cor\u00e9ennes, am\u00e9ricaines, europ\u00e9ennes)'],
     ['Dur\u00e9e vid\u00e9os', '5 \u00e0 11 minutes'], ['Cr\u00e9dit', 'Compte Vid\u00e9o (videoBalance)']]
)
doc.add_heading('13.2 R\u00e9compenses', level=2)
add_table(
    ['P\u00e9riode', 'R\u00e9compense/vid\u00e9o', 'Total/5 vid\u00e9os'],
    [['Jour 1 (accroche)', '0.30$ - 0.40$', '1.60$ - 1.80$'],
     ['Jour 2 et+', '0.10$ - 0.20$', '0.60$ - 0.95$']]
)
doc.add_heading('13.3 Cycle de 3 jours', level=2)
bullet('Tous les 3 jours de visionnage, l\u2019utilisateur doit remplir 2 conditions :')
bullet('1. Avoir un investissement Niveau 1 actif')
bullet('2. Inviter au moins (num\u00e9ro du cycle) parrain\u00e9s')
bullet('Si conditions non remplies \u2192 retraits vid\u00e9o bloqu\u00e9s (videoDepositRequired=true)')
doc.add_heading('13.4 Retrait vid\u00e9o', level=2)
add_table(
    ['Param\u00e8tre', 'Valeur'],
    [['Minimum', '1$'], ['Maximum', '50 000$'],
     ['M\u00e9thodes', 'YAS ou TRX (approbation admin)'],
     ['Blocage', 'Si videoDepositRequired=true, retrait refus\u00e9']]
)

# ==================== CHAPTER 14 ====================
doc.add_heading('14. Jeu de la Roue de la Fortune', level=1)
doc.add_heading('14.1 Param\u00e8tres', level=2)
add_table(
    ['Param\u00e8tre', 'Valeur'],
    [['Co\u00fbt par tour', '0.20$'], ['Limite quotidienne', '10 tours'],
     ['R\u00e9initialisation', '\u00c0 minuit (date ISO YYYY-MM-DD)'],
     ['D\u00e9bit prioritaire', 'balance \u2192 investBalance \u2192 videoBalance \u2192 projectBalance'],
     ['Cr\u00e9dit gains', 'Compte principal (balance) uniquement']]
)
doc.add_heading('14.2 Segments de la roue (20 segments)', level=2)
add_table(
    ['Segment', 'R\u00e9compense', 'Type'],
    [['$0.10', '0.10$', 'Gain'], ['Perdu', '0$', 'Perte'], ['$0.20', '0.20$', 'Gain'],
     ['Perdu', '0$', 'Perte'], ['$0.50', '0.50$', 'Gain'], ['Perdu', '0$', 'Perte'],
     ['$0.10', '0.10$', 'Gain'], ['Perdu', '0$', 'Perte'], ['$0.30', '0.30$', 'Gain'],
     ['$10.00', '10.00$', 'JACKPOT'],
     ['$1.00', '1.00$', 'Gain'], ['Perdu', '0$', 'Perte'], ['$0.20', '0.20$', 'Gain'],
     ['Perdu', '0$', 'Perte'], ['$0.80', '0.80$', 'Gain'], ['Perdu', '0$', 'Perte'],
     ['$0.10', '0.10$', 'Gain'], ['Perdu', '0$', 'Perte'], ['$0.30', '0.30$', 'Gain'],
     ['Perdu', '0$', 'Perte']]
)

# ==================== CHAPTER 15 ====================
doc.add_heading('15. Syst\u00e8me de Chat et Support', level=1)
doc.add_heading('15.1 Chatbot IA', level=2)
bullet('Utilise z-ai-web-dev-sdk pour g\u00e9n\u00e9rer des r\u00e9ponses')
bullet('Prompt syst\u00e8me : assistant Be Rich, conna\u00eet tous les m\u00e9canismes de la plateforme')
bullet('Historique : 10 derniers messages inclus dans le contexte')
bullet('Escalade automatique si probl\u00e8me n\u00e9cessite un humain \u2192 cr\u00e9ation SupportTicket')

doc.add_heading('15.2 Support Admin (Tickets)', level=2)
bullet('Un seul ticket ouvert \u00e0 la fois par utilisateur')
bullet('Messages rout\u00e9s vers le ticket si ticket ouvert')
bullet('L\u2019admin peut r\u00e9pondre, fermer les tickets')
bullet('Chat temps r\u00e9el via Socket.io (port 3003)')

doc.add_heading('15.3 Conseils (Tips)', level=2)
bullet('Conseil d\u2019investissement court (max 15 mots) via IA')
bullet('Personnalis\u00e9 selon le contexte utilisateur (solde, investissement, profit)')
bullet('10 conseils pr\u00e9d\u00e9finis en fallback')

# ==================== CHAPTER 16 ====================
doc.add_heading('16. Syst\u00e8me de Notifications', level=1)
doc.add_heading('16.1 Notifications utilisateur', level=2)
add_table(
    ['Type', 'D\u00e9clencheur'],
    [['deposit_approved', 'Admin approuve un d\u00e9p\u00f4t'], ['deposit_rejected', 'Admin rejette un d\u00e9p\u00f4t'],
     ['withdrawal_approved', 'Admin approuve un retrait'], ['withdrawal_rejected', 'Admin rejette un retrait'],
     ['new_message', 'Admin/chatbot r\u00e9pond'], ['referral_new', 'Nouveau filleul inscrit'],
     ['investment_claim', 'Gain d\u2019investissement r\u00e9clam\u00e9'], ['trade_result', 'R\u00e9sultat d\u2019un trade'],
     ['admin_broadcast', 'Message diffus\u00e9 par l\u2019admin']]
)
doc.add_heading('16.2 Notifications admin', level=2)
add_table(
    ['Type', 'D\u00e9clencheur'],
    [['new_deposit', 'Nouveau d\u00e9p\u00f4t en attente'], ['new_withdrawal', 'Nouvelle demande de retrait'],
     ['support_escalation', 'Escalade automatique du chatbot'], ['support_message', 'Message sur ticket existant'],
     ['user_deleted', 'Utilisateur supprim\u00e9']]
)
doc.add_heading('16.3 Notifications quotidiennes', level=2)
bullet('Message motivant rotatif (15 messages, 1 par jour bas\u00e9 sur le jour de l\u2019ann\u00e9e)')
bullet('Info parrainage : filleuls actuels, requis pour prochain retrait, manquants')
bullet('Code de parrainage de l\u2019utilisateur')

# ==================== CHAPTER 17 ====================
doc.add_heading('17. Panneau d\u2019Administration', level=1)
doc.add_heading('17.1 Fonctionnalit\u00e9s admin', level=2)
add_table(
    ['Fonctionnalit\u00e9', 'Description'],
    [['Gestion utilisateurs', 'Voir tous les utilisateurs, d\u00e9tails, arbre de parrainage, supprimer'],
     ['Modification soldes', 'Modifier n\u2019importe quel solde ou compteur (remplacement, pas incr\u00e9ment)'],
     ['Transfert de fonds', 'Transf\u00e9rer depuis invest/trade/projet vers balance principal'],
     ['Approbation d\u00e9p\u00f4ts TRX', 'Voir, approuver, rejeter les d\u00e9p\u00f4ts TRX (bonus parrainage auto)'],
     ['Approbation d\u00e9p\u00f4ts YAS', 'Voir, approuver, rejeter les d\u00e9p\u00f4ts YAS'],
     ['Gestion retraits', '3 \u00e9tapes : approve, execute, reject (par TRX ou YAS)'],
     ['Gestion vid\u00e9os admin', 'Ajouter/modifier/supprimer les vid\u00e9os de la plateforme'],
     ['Diffusions', 'Envoyer des messages \u00e0 tous ou \u00e0 un utilisateur sp\u00e9cifique'],
     ['Notifications', 'Envoyer des notifications personnalis\u00e9es'],
     ['Configuration site', 'Modifier adresse TRX, compte YAS, prix TRX, taux CFA, world link'],
     ['Support/tickets', 'Voir, r\u00e9pondre, fermer les tickets de support'],
     ['Chat direct', 'Converser directement avec n\u2019importe quel utilisateur'],
     ['Statistiques', 'Totaux : utilisateurs, soldes, investissements, trades, parrainages']]
)

# ==================== CHAPTER 18 ====================
doc.add_heading('18. Fonctionnalit\u00e9s Annexes', level=1)
doc.add_heading('18.1 PWA (Application Installable)', level=2)
bullet('Manifest.json avec nom Be Rich, th\u00e8me vert #22C55E')
bullet('Service Worker : Network First + Fallback to Cache')
bullet('Invite d\u2019installation intelligente (Android/iOS/Desktop)')
bullet('Rappel du refus pendant 7 jours via localStorage')

doc.add_heading('18.2 Ticker de retraits (faux)', level=2)
bullet('28 entr\u00e9es fictives de retraits (types : jeu, investissement, projet)')
bullet('Cycle : toutes les 4 \u00e0 10 secondes, affichage 3.5 secondes')
bullet('Effet de preuve sociale (noms/montants al\u00e9atoires)')
bullet('Masqu\u00e9 sur la page de trading')

doc.add_heading('18.3 Publicit\u00e9s au changement d\u2019onglet', level=2)
bullet('38 publicit\u00e9s fictives d\u2019entreprises internationales')
bullet('6 layouts visuels (hero, split, banner, card, quote, stats)')
bullet('60% de probabilit\u00e9 d\u2019affichage au changement de page')
bullet('Exclu sur la page d\u2019authentification')

doc.add_heading('18.4 Floating Gift (Cadeau flottant)', level=2)
bullet('Bouton draggable persistant en bas \u00e0 droite')
bullet('13 \u00e9tapes de messages \u00e9nigmatiques (0 \u00e0 12 parrainages)')
bullet('\u00c0 12+ parrainages : cadeau 5$ + World Link secret')
bullet('Boutons Partager (Web Share API) et Copier le code')

doc.add_heading('18.5 Syst\u00e8me de guides', level=2)
bullet('8 guides complets : Portefeuille, D\u00e9p\u00f4ts, Investissements, Trading, Entreprises, Retraits, Parrainage, Support')
bullet('Chaque guide : \u00e9tapes d\u00e9taill\u00e9es + conseils + avertissements')
bullet('Navigation par \u00e9tapes avec barre de progression')

doc.add_heading('18.6 Email', level=2)
bullet('Triple provider : Resend (priorit\u00e9) \u2192 Gmail SMTP (fallback) \u2192 Simulation')
bullet('Templates HTML professionnels (gradient vert, code OTP en gros)')
bullet('Utilis\u00e9 pour OTP de v\u00e9rification et r\u00e9initialisation de mot de passe')

# ==================== CHAPTER 19 ====================
doc.add_heading('19. Base de Donn\u00e9es \u2014 Sch\u00e9ma Complet', level=1)
p('La base de donn\u00e9es SQLite contient les mod\u00e8les suivants :')
models = [
    ['User', 'Utilisateurs (40+ champs, 5 soldes, stats vid\u00e9o/jeu/trading)'],
    ['Transaction', 'Historique des transactions (d\u00e9p\u00f4ts, retraits, transferts, bonus)'],
    ['Investment', 'Investissements \u00e0 niveaux (montant, taux, cycles, status)'],
    ['Trade', 'Trades binaires (montant, direction, dur\u00e9e, r\u00e9sultat, profit)'],
    ['TradingPosition', 'Positions de l\u2019ar\u00e8ne (stop-loss, take-profit, P/L)'],
    ['Enterprise', 'Entreprises virtuelles (dur\u00e9e, rendement, statut)'],
    ['PendingDeposit', 'D\u00e9p\u00f4ts TRX en attente d\u2019approbation'],
    ['YasDeposit', 'D\u00e9p\u00f4ts YAS en attente d\u2019approbation'],
    ['Withdrawal', 'Demandes de retrait (statut, m\u00e9thode, compte source)'],
    ['VideoWatch', 'Historique des vid\u00e9os regard\u00e9es (r\u00e9compense, date)'],
    ['GameSpin', 'Historique des tours de roulette (mise, gain, r\u00e9sultat)'],
    ['AdminVideoLink', 'Vid\u00e9os g\u00e9r\u00e9es par l\u2019admin (YouTube ID, cat\u00e9gorie, r\u00e9compense)'],
    ['BroadcastMessage', 'Historique des diffusions admin'],
    ['ChatMessage', 'Messages de chat (utilisateur et admin, tickets)'],
    ['SupportTicket', 'Tickets de support (raison, statut)'],
    ['UserNotification', 'Notifications utilisateur (type, lu, lien)'],
    ['AdminNotification', 'Notifications admin (type, lien vers d\u00e9p\u00f4t/retrait)'],
    ['OtpCode', 'Codes OTP (hash SHA-256, expiration, usage)'],
    ['PasswordResetToken', 'Tokens de r\u00e9initialisation de mot de passe'],
    ['SiteConfig', 'Configuration globale du site (1 seul enregistrement)'],
]
add_table(
    ['Mod\u00e8le', 'Description'],
    models
)

# ==================== CHAPTER 20 ====================
doc.add_heading('20. Configuration du Site', level=1)
add_table(
    ['Param\u00e8tre', 'D\u00e9faut', 'Description'],
    [['adminTrxAddress', 'TRMJ5R1cKbrMLy19PLu9rVtVGc5Ff2ZrHY', 'Adresse TRX pour d\u00e9p\u00f4ts'],
     ['adminYasAccount', '90876459', 'Num\u00e9ro YAS pour d\u00e9p\u00f4ts mobile money'],
     ['trxUsdPrice', '0.12', 'Prix TRX en USD (surchargeable)'],
     ['cfaUsdRate', '550', 'Taux FCFA/USD'],
     ['worldLink', 'null', 'Lien secret d\u00e9bloqu\u00e9 \u00e0 10+ parrainages']]
)

# ==================== CHAPTER 21 ====================
doc.add_heading('21. S\u00e9curit\u00e9 et Anti-Fraude', level=1)
add_table(
    ['Mesure', 'D\u00e9tail'],
    [['Session unique', 'sessionToken rot\u00e9 \u00e0 chaque login, invalide les autres sessions'],
     ['T\u00e9l\u00e9phone unique', 'Un num\u00e9ro = un seul compte (@unique en base)'],
     ['Nom unique', 'V\u00e9rification insensible \u00e0 la casse via SQL LOWER()'],
     ['Cookie s\u00e9curis\u00e9', 'br_token contient sessionToken (pas l\u2019id utilisateur)'],
     ['Level-2 hold', 'Fonds investissement bloqu\u00e9s 10 jours si < 12 filleuls'],
     ['D\u00e9lai 48h retrait', 'Impossible de retirer avant 48h apr\u00e8s le premier d\u00e9p\u00f4t'],
     ['OTP hash\u00e9', 'SHA-256, jamais stock\u00e9 en clair'],
     ['Invalidation OTP', 'Nouvel envoi invalide les anciens OTP non utilis\u00e9s']]
)

# ==================== CHAPTER 22 ====================
doc.add_heading('22. Points de Vigilance', level=1)
add_table(
    ['Point', 'D\u00e9tail'],
    [['Mots de passe en clair', 'Aucun hashage (bcrypt/argon2). Comparaison directe.'],
     ['Cookie httpOnly: false', 'Accessible via JavaScript, vuln\u00e9rable au XSS.'],
     ['Cookie secure: false', 'Transmis en HTTP clair, interceptable MITM.'],
     ['Pas de rate-limiting', 'Endpoints OTP, login, register vuln\u00e9rables au brute-force.'],
     ['Backdoor admin', 'Identifiants admin en dur dans le code source.'],
     ['Mode simulation', 'Code OTP retourn\u00e9 en clair dans la r\u00e9ponse API.'],
     ['Incoh\u00e9rence auth admin', 'Certains endpoints utilisent getAuthToken(), d\u2019autres getToken() maison.'],
     ['Taux CFA incoh\u00e9rents', '600 dans d\u00e9p\u00f4ts YAS, 550 dans site-config et retraits.'],
     ['Ticker faux retraits', 'Affiche de fausses notifications de retraits (preuve sociale trompeuse).'],
     ['Seuils World Link', '10 parrainages (API) vs 12 (FloatingGift) incoh\u00e9rents.']]
)

# ==================== SAVE ====================
output_path = '/home/z/my-project/BE_RICH_Documentation_Complete.docx'
doc.save(output_path)
print(f'Document saved to {output_path}')
print(f'File size: {os.path.getsize(output_path)} bytes')
