---
name: reel-stil
description: Yazans Reel-Stil. Immer nutzen, wenn ein Reel, Short oder Kurzvideo für Yazan geplant, gescriptet, gebaut, überarbeitet oder beurteilt wird, auch wenn der Stil nicht erwähnt wird. Der Stil ist ein Bauplan (ein zentrales Bild, erst verhüllt zeigen und Stück für Stück aufdecken, Wort-für-Wort-Captions, zwei harte Brüche auf Schwarz, Gesamtbild als Schluss), kein bestimmtes Motiv. Das Oktagon-Diagramm ist nur eines der Werkzeuge dafür.
---

# Yazans Reel-Stil

Der Stil steht in `reels/STYLE.md`. **Zuerst lesen**, nicht aus dem Gedächtnis arbeiten.

- **Teil A** ist der Stil: sieben Bauprinzipien, Dramaturgie, Look, Bewegung, Sound, Skript-Regeln. Er gilt für jedes Reel.
- **Teil B** sind Werkzeuge, die den Stil umsetzen. Bisher gebaut: das Oktagon-Diagramm (`reels/formel/`) und die Treppe mit Kurve (`reels/treppe/`). Der gemeinsame Stil-Code liegt in `reels/core.js`.

Das Oktagon ist nicht der Stil. Nicht jedes Thema in ein Oktagon pressen.

## Ablauf

1. **Bild finden.** Was ist das eine zentrale Bild, an dem alles passiert? Die Prüffragen aus `STYLE.md` §7 durchgehen. Dazu die Regeln aus `ralston-content` anwenden und in höchstens 3 Punkten sagen, welche greift.
2. **Werkzeug wählen.**
   - Gleichrangige Bausteine um ein Thema: Oktagon (`reels/formel/`).
   - Ein Plan in Stufen und was daraus wird (Sparplan, Aufbau über Jahre): Treppe mit Kurve (`reels/treppe/`).
   - Vergleich, Rangfolge, Zeitstrahl: ein anderes Bild aus `STYLE.md` Teil B. Wenn es das Werkzeug noch nicht gibt, es als neuen Ordner auf `reels/core.js` aufbauen (Look, Bewegung und Sound kommen von dort) und in Teil B eintragen.
   - Spec-Formate stehen in `reels/README.md`.
3. **Bei Zahlen zuerst rechnen und belegen.** Behauptungen des Nutzers prüfen, bevor sie ins Bild kommen. Renditen sind Annahmen, nie Versprechen. Den stärksten Einwand selbst im Reel beantworten (zweite Karte). Quellen und Rechnung in `<name>.quellen.md` neben die Spec legen.
4. **Skript nach der Dramaturgie** aus `STYLE.md` §2 schreiben: Hook, Punkte mit je einem Satz, zwei Karten bei ca. 35 % und 58 %, Gesamtbild als Schluss.
5. **Standbilder** rendern und ansehen, bevor das ganze Video gerendert wird: Anfang, eine Nahaufnahme, eine Karte, Schlussbild.
6. **Rendern** mit `node reels/render.cjs <spec>`, Warnungen zum Lesetempo ernst nehmen.
7. **Sound** nach `STYLE.md` §5. Wenn das earshot-Kit verfügbar ist (Skill `reel-sounds-earshot`), dessen Sounds auf dieselben Zeitmarken legen.
8. **Prüfen:** Kontaktbogen ansehen, Lautheit messen (Ziel −14 LUFS mit Stimme), Compliance nach `STYLE.md` §6.
9. **Abgabe:** Video per SendUserFile, dazu kurz die Beat-Liste mit Zeiten und offene Punkte.

## Regeln

- Kein Handle, kein Logo, keine Endkarte im Video.
- Keine Zahlen ohne Quelle auf dem Bildschirm.
- Render-Ausgaben (mp4, cues, stills) nie committen.
- Stiländerungen zuerst in `STYLE.md` festhalten, dann im Code umsetzen.
