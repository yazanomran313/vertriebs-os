---
name: reel-formel-stil
description: Reels für Yazan im Formel-Stil erstellen (Oktagon-Diagramm mit geschwärzten Labels, die sich freitippen, Wort-für-Wort-Captions, schwarze Interrupt-Karten, Screenshot-Outro). Nutzen, wenn ein Reel, Short oder Kurzvideo in "unserem Reel-Stil", "Formel-Stil", "Diagramm-Stil" oder "wie das Referenz-Reel" gebaut, geplant, gescriptet oder überarbeitet werden soll, oder wenn ein Framework/eine Checkliste als Reel umgesetzt werden soll.
---

# Reels im Formel-Stil

Der Stil ist vollständig in `reels/STYLE.md` definiert. **Zuerst lesen**, nicht aus dem Gedächtnis arbeiten.
Die Engine (`reels/formel/`) setzt den Stil um, ein neues Reel ist nur eine JSON-Spec.

## Ablauf

1. **Framework klären** (vor jeder Optik): 5–10 Bausteine, die ein Arzt speichern will. Mit den Regeln aus `ralston-content` (Themenfilter, Hook = Schmerz, Vertrauen vor Transaktion) und `STYLE.md` §5 abgleichen. In max. 3 Punkten sagen, welche Regel greift.
2. **Spec schreiben** unter `reels/formel/beispiele/<thema>.json`. Format siehe `reels/README.md`. Labels 1–2 Wörter, pro Speiche ein Satz mit *großem* Kernwort, zwei Karten als ehrliche Open Loops, Outro „Screenshot machen“.
3. **Standbilder** rendern und ansehen (`render.cjs <spec> --stills …`): Intro, eine Nahaufnahme, eine Karte, Outro, Endkarte. Erst rendern, wenn die Stills stimmen.
4. **Rendern** (`render.cjs <spec> --out …`). Warnungen zum Lesetempo ernst nehmen: Beat verlängern oder Text kürzen.
5. **Sound**: `sfx.py <cues.json> <video> <out> [--vo stimme.wav]`. Wenn das earshot-Kit verfügbar ist (Skill `reel-sounds-earshot`), dessen Sounds nach der Zuordnung in `STYLE.md` §4 auf dieselben Cues legen.
6. **QA**: Kontaktbogen ansehen, Lautheit messen (Ziel −14 LUFS mit Stimme), Compliance nach `STYLE.md` §5.
7. **Abgabe**: Video per SendUserFile schicken, dazu kurz: Beat-Liste mit Zeiten, Sounds, offene Punkte (z. B. fachlich prüfen, VO fehlt).

## Regeln

- Render-Ausgaben (mp4, cues, stills) nie committen, sie sind in `.gitignore`.
- Keine Inhalte, Handles oder Texte der Referenz übernehmen, nur Mechanik und Rhythmus.
- Keine Zahlen ohne Quelle auf dem Bildschirm.
- Stiländerungen zuerst in `STYLE.md` festhalten, dann in `engine.html` (Konstanten `COL`, `L`, `TM`) umsetzen, damit beides synchron bleibt.
