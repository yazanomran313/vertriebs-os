# Formel-Reel: Stilbibel

Abgeleitet aus einem Referenz-Reel (Frame-für-Frame-Analyse, 27,6 s, 9:16, 30 fps).
Alle Zahlen sind gemessen, nicht geschätzt, außer wo „Richtwert“ steht.
Die Engine in `formel/` setzt genau diese Werte um.

---

## 1. Warum der Stil funktioniert (das Prinzip, nicht die Optik)

1. **Ein Framework als Diagramm.** Das Reel liefert ein Bild, das man speichern will. „Screenshot machen“ ist der eingebaute CTA. Saves und Shares sind das Ziel, nicht Likes.
2. **Geschwärzte Labels = offene Schleifen.** Jede Speiche startet als schwarzer Balken. Der Zuschauer bleibt, bis alles enthüllt ist.
3. **Das Reel lebt seine eigene Formel.** Die Referenz erklärt Hook → Versprechen → Wert → Open Loop → Wert → Open Loop → Wert → CTA und ist selbst exakt so gebaut. Struktur und Inhalt beweisen sich gegenseitig.
4. **Zwei harte Pattern-Interrupts.** Schnitt auf Schwarz bei ca. 35 % und ca. 58 % der Laufzeit, jeweils mit einem „Aber …“-Satz.
5. **Ständige Bewegung, nie Hektik.** Alle 0,3–0,5 s erscheint ein Wort, alle 1,5–2,5 s bewegt sich die Kamera. Kein Frame steht länger als ca. 0,6 s still.
6. **Belohnung am Ende.** Rauszoomen auf die komplette Übersicht. Erst dann sieht man das Ganze: Payoff und Screenshot-Moment.

**Harte Wahrheit:** Die Optik ist Verpackung, Ralstons dritter und schwächster Hebel. Ohne ein Framework, das Ärzte wirklich speichern wollen, ist das Oktagon leer. Erst das Framework, dann der Stil.

---

## 2. Dramaturgie der Referenz (Beat-Sheet)

| Zeit (s) | Beat | Was passiert |
|---|---|---|
| 0,0–2,3 | Intro / Hook | Kleiner Hub wächst, 8 Speichen mit schwarzen Balken schießen raus. Hook-Wörter einzeln oben. |
| 2,3–4,0 | Speiche 1 | Schneller Zoom (ca. 0,4 s) auf Speiche oben, Label tippt sich frei, Caption darüber. |
| 4,0–6,7 | Speiche 2 | Rotation 45° (0,38 s, Motion Blur), nächstes Label tippt. |
| 6,7–8,3 | Speiche 3 | dito |
| 8,3–9,7 | Speiche 4 (Open Loop 1) | dito |
| 9,7–11,8 | **Schwarze Karte 1** | Harter Schnitt. „But there's one more thing.“ Wort für Wort, klein/groß gemischt. |
| 11,8–15,8 | Speichen 5–6 | zurück ins Diagramm, Rotation geht weiter |
| 15,8–17,4 | **Schwarze Karte 2** | „But this is where most people mess up.“ |
| 17,4–20,1 | Speichen 7–8 | Wert, CTA |
| 20,1–23,5 | Outro | Rauszoomen + Rückdrehen (0,8 s) auf die Gesamtübersicht, Header „Screenshot this“. |
| 23,5–27,5 | Endkarte | Bild abgedunkelt, Logo poppt im Hub auf, Handle darunter. 4 s Halt. |

Rhythmus: ca. 2 s pro Speiche, Karten 1,6–2,1 s, Outro ca. 3,4 s, Endkarte ca. 4 s.

---

## 3. Visuelles System

### Farben
| Rolle | Wert |
|---|---|
| Hintergrund hell | `#F7F5F6` + Punktraster (18 px Abstand, 1,3 px Punkte, ca. 12 % Deckkraft, zum Rand auslaufend) |
| Tinte (Text, Linien, Balken) | `#141213` |
| Hub-Füllung | `#292725` |
| Karte (Interrupt) | `#0B090A` + helles Punktraster ca. 5 % + Vignette |
| Endkarte | Übersicht mit 80 % Abdunklung (wirkt `#3C3C3C`) |
| Einziger Farbakzent | Instagram-Verlauf am Logo (Wasserzeichen-Blitz in Speiche 1, Endkarte) |

Streng monochrom. Farbe nur als Marken-Signal.

### Typografie
- **Inter Display** SemiBold (600) für Captions und Labels, Bold (700) für große Wörter und Titel. Liegt in `fonts/` (OFL-Lizenz).
- Laufweite eng: **−3,5 %** der Schriftgröße.
- Captions: klein **60 px**, groß **100 px** (bei 1080 × 1920). Zeilen eng gestapelt (Zeilenabstand = 1,0 × größte Schrift der Zeile).
- Labels in der Nahaufnahme: ca. **86 px**. In der Übersicht ca. 36 px, bei langen Labels automatisch kleiner.

### Diagramm (Weltmaße, 1 Einheit = 1 px in der Übersicht)
- Achteck (Spitze oben), Außenradius **174**. Ringe: dünne Außenlinie (1,0) → heller Spalt → dunkle Füllung ab 0,90 → helle Innenlinie bei 0,80.
- Speichen starten an den Ecken, Punkt auf Radius **301**, Linie 2, Punkt-Radius 8.
- Labels stehen immer **aufrecht**, auch während der Rotation. Abstand zum Punkt 40.
- Hub-Text aufrecht: Kicker klein (22) über Titel groß und fett (42), weiß.

### Kamera
- **Nahaufnahme:** Zoom **2,4**, Hub-Mitte bei y = **1700** (88 % der Höhe). Die aktive Speiche zeigt nach oben, die Nachbar-Labels werden am Bildrand abgeschnitten. Das ist gewollt und erzeugt Tiefe.
- **Speichenwechsel:** Rotation um 360°/N (bei 8 Speichen 45°) in **0,38 s**, ease-in-out-cubic, mit Motion Blur (180°-Verschluss).
- **Erster Zoom** aus dem Intro: 0,42 s, ease-in-out-quart.
- **Outro:** Zoom zurück in die Übersicht und Rückdrehung, **0,85 s**, ease-out-cubic. Hub-Mitte bei y = 1010.

### Label-Reveal (Signatur-Mechanik)
1. Vorher: schwarzer Balken in exakter Textbreite (Höhe ca. 1,2 × Versalhöhe).
2. Start 0,1 s nach Beat-Beginn, also noch während die Kamera fährt.
3. Buchstaben tippen sich frei, der Restbalken schrumpft (min. 0,5 em breit). **0,065 s pro Zeichen, max. 0,55 s.**
4. Danach 0,3 s ein dünner Cursor `|`, dann weg.

### Captions
- Position: oberes Drittel (Grundlinie y ≈ 520), über dem aktiven Label.
- Wort für Wort: **0,13 s** Einblendung mit Unschärfe 12 px → 0, Skalierung 1,12 → 1, 8 px Hub.
- Phrasen bauen sich auf und werden beim nächsten Satz **hart ersetzt**.
- Klein/groß mischen: Kernwort groß und fett, Füllwörter klein darüber.
- Leichter horizontaler Versatz pro Phrase (±90 px), damit es lebendig wirkt.
- Lesetempo: max. ca. 3,5 Wörter/s, sonst warnt der Renderer.

### Schwarze Karten
- Harter Schnitt rein und raus, kein Übergang (der Whoosh macht den Übergang).
- Text weiß und zentriert, Zeile 1 klein („Aber dieser Punkt“), Zeile 2 groß („ist für Ärzte Pflicht.“).
- Baut schnell auf (≤ 0,2 s pro Wort) und hält dann die Pointe mindestens 0,6 s.
- Logo und Handle unten links (x ≈ 80–104, y ≈ 1176–1250).

### Wasserzeichen und Endkarte
- Wasserzeichen oben rechts (x 972, y 448), Logo und Handle mit ca. 15 % Deckkraft. In Speiche 1 blitzt das Logo farbig auf.
- Endkarte: 80 % Abdunklung in 0,08 s. Das Logo poppt (ease-out-back, 0,35 s) über dem Hub auf, der Verlauf läuft ca. 2,2 s und wird dann weiß. Handle 40 px darunter. **3–4 s Halt.**

---

## 4. Sound

| Moment | Referenz | Unsere Umsetzung (`formel/sfx.py`) | earshot-Kit (falls freigegeben) |
|---|---|---|---|
| Stimme | durchgehend, ca. 165 Wörter/min, praktisch ohne Pausen | Yazans VO, `--vo stimme.wav` | – |
| Bett | sehr leise unter der Stimme | optional | – |
| Label tippt | leise Tipp-Klicks pro Reveal | Klick pro Zeichen, Spitzen ca. −19 dBFS | `pro_typing_run/soft` |
| Schnitt auf Schwarz | Whoosh, Spitze genau am Schnitt | Rausch-Whoosh, links → rechts | `whoosh_fast/crisp` |
| Rauszoomen | zwei tiefe Hits | Sub-Drop + weicher Whoosh | `pro_sub_drop/ref` |
| Vor der Endkarte | **0,4 s totale Stille** | identisch | – |
| Logo | Boom, ca. 1,5 s Ausklang | Boom + leichter Schimmer | `pro_logo_sting/swell_sting` |

- Ziel-Lautheit: **−14 LUFS**, True Peak −1 dB (Referenz: −13,7 LUFS). `sfx.py --vo` normalisiert automatisch.
- Bewusste Abweichung von der earshot-Regel „3–5 Sounds pro Reel“: Das Tippen bei jedem Reveal ist ein Stilmerkmal. Deshalb bleiben die Klicks leise, und die lauten Sounds sind auf 4 Stellen begrenzt (2 Karten, Outro, Endkarte).

---

## 5. Skript-Regeln für Yazans Formel-Reels

Zusätzlich zu `ralston-content` (Vertrauen statt Viralität, Zielgruppe Ärzte):

1. **Framework zuerst.** 8 Bausteine, die ein Arzt wirklich speichern will (Checkliste, Prozess, Entscheidungsbaum). Die Engine kann auch 5–10 Speichen.
2. **Labels:** 1–2 Wörter, max. ca. 17 Zeichen. **Hub:** Kicker (1–2 Wörter) und Titel (max. ca. 14 Zeichen).
3. **Hook in ≤ 3 s:** Schmerz oder Konsequenz, gern als Imperativ („Unterschreib keine BU, bevor …“).
4. **Pro Speiche ein Satz**, max. 7 Wörter, das Kernwort *groß*.
5. **Zwei Karten** als ehrliche Open Loops („Aber dieser Punkt …“, „Und hier entscheidet sich …“). Behauptungen wie „die meisten …“ nur mit Beleg.
6. **CTA:** speichern und teilen („Screenshot machen“, „Schick's einem Kollegen“). In den ersten 6–12 Monaten kein großer Ask.
7. **Compliance:** keine erfundenen Zahlen, Fälle nur anonymisiert und mit Einwilligung, keine Versicherer herabsetzen. Fachliche Aussagen vor dem Posten prüfen.
8. **Mit Stimme:** zuerst VO aufnehmen, dann die Beat-Dauern aus den Wortzeiten setzen (Phrasen mit `"at"`, siehe `README.md`).

## 6. Was wir bewusst nicht übernehmen

- Kein Handle, keine Texte und keine Themen der Referenz. Übernommen werden nur Mechanik und Rhythmus, die Inhalte sind Yazans eigene.
- Kein Clone-Look auf Dauer: Nach den ersten Reels mit der Multiplikator-Methode messen und den Stil dann eigenständig weiterentwickeln (z. B. Akzentfarbe, eigene Endkarte).
