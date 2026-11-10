# Unser Reel-Stil

Abgeleitet aus einem Referenz-Reel (Frame-für-Frame-Analyse, 27,6 s, 9:16, 30 fps).

**Der Stil ist der Bauplan, nicht das Oktagon.** Teil A gilt für jedes Reel, egal mit welchem Bild es arbeitet.
Teil B beschreibt das Oktagon-Diagramm als ein Werkzeug, das diesen Bauplan umsetzt. Weitere Werkzeuge kommen dazu.

---

# Teil A: Der Stil (gilt für jedes Reel)

## 1. Die sieben Bauprinzipien

1. **Ein Bild, das das ganze Reel trägt.** Es gibt genau ein zentrales visuelles Objekt (Diagramm, Liste, Treppe, Vergleich). Alles passiert an diesem Objekt. Keine wechselnden Szenen, keine Stock-Bilder.
2. **Erst das Ganze verhüllt zeigen, dann Stück für Stück aufdecken.** In den ersten 2 Sekunden sieht man die komplette Struktur, aber alle Inhalte sind geschwärzt. Jeder verhüllte Teil ist eine offene Schleife. Der Zuschauer bleibt, bis alles aufgedeckt ist.
3. **Ein Punkt pro Beat, groß im Bild.** Die Kamera geht nah an genau einen Teil, der wird enthüllt und in einem Satz erklärt. Dann weiter zum nächsten. Ca. 2 s pro Punkt.
4. **Das Wort führt, das Bild folgt.** Die Stimme läuft durch, praktisch ohne Pausen. Captions erscheinen Wort für Wort im Sprechtakt. Das Kernwort ist groß und fett, Füllwörter klein.
5. **Zwei harte Brüche.** Bei ca. 35 % und ca. 58 % der Laufzeit ein harter Schnitt auf eine schwarze Fläche mit einem „Aber …“-Satz. Das ist ein Open Loop: Er verspricht, dass das Wichtigste noch kommt.
6. **Ständige Bewegung, nie Hektik.** Alle 0,3–0,5 s erscheint ein Wort, alle 1,5–2,5 s bewegt sich die Kamera. Kein Frame steht länger als ca. 0,6 s still. Aber es bewegt sich immer nur eine Sache.
7. **Belohnung am Ende.** Rauszoomen auf das komplett aufgedeckte Bild. Erst jetzt sieht man alles auf einmal. Das ist der Moment zum Speichern („Screenshot machen“) und gleichzeitig der CTA.

## 2. Dramaturgie (der Ablauf)

Die Referenz erklärt eine Formel und ist selbst nach dieser Formel gebaut:

| Abschnitt | Anteil | Aufgabe |
|---|---|---|
| **Hook** | 0–8 % (ca. 2–3 s) | Schmerz oder Versprechen in einem Satz. Gleichzeitig baut sich das verhüllte Bild auf. |
| **Versprechen** | erster Punkt | Sagt, was man bekommt. Erste Enthüllung. |
| **Wert** | 2–3 Punkte | Ein Satz pro Punkt. |
| **Open Loop 1** | ca. 35 % | Schwarze Karte: „Aber …“ |
| **Wert** | 2–3 Punkte | |
| **Open Loop 2** | ca. 58 % | Schwarze Karte: „Und hier …“ |
| **Wert** | letzte Punkte | Der stärkste Punkt kommt nach der zweiten Karte. |
| **Payoff + CTA** | letzte 12–15 % (ca. 3–4 s) | Gesamtbild, „Screenshot machen“, ruhig stehen lassen. |

Gesamtlänge 25–35 s. Kein Abspann, kein Logo, kein Handle: Das Reel endet auf dem Gesamtbild.

## 3. Look

| Rolle | Wert |
|---|---|
| Hintergrund | fast weiß `#F7F5F6` mit feinem Punktraster (18 px Abstand, ca. 12 % Deckkraft) |
| Tinte (Text, Linien, Balken) | fast schwarz `#141213` |
| Dunkle Flächen | `#292725` |
| Schwarze Karte | `#0B090A`, Text weiß |
| Farbe | keine. Streng monochrom. |

- **Schrift:** Inter Display, SemiBold (600) für normalen Text, Bold (700) für Kernwörter und Titel. Laufweite eng (−3,5 %). Liegt in `fonts/` (OFL-Lizenz).
- **Größen bei 1080 × 1920:** Captions klein 60 px, groß 100 px. Enthülltes Label in der Nahaufnahme ca. 86 px.
- **Formen:** dünne Linien, Punkte, klare Geometrie. Keine Schatten, keine Verläufe, keine Icons, keine Emojis.
- **Sicherer Bereich:** Oben gehört das Drittel bis y ≈ 640 den Captions, unten verdeckt Instagram ab y ≈ 1520 das Bild. Das zentrale Bild liegt dazwischen. Pflicht-Hinweise („keine Garantie“) stehen klein direkt unter der Schluss-Überschrift, nicht am unteren Rand.

## 4. Bewegung

- **Enthüllung (Signatur):** Der Inhalt steht zuerst als schwarzer Balken in exakter Textbreite da. Dann tippt er sich frei: 0,065 s pro Zeichen, höchstens 0,55 s. Danach blinkt 0,3 s ein dünner Cursor.
- **Captions:** Jedes Wort blendet in 0,13 s ein (Unschärfe → scharf, leicht größer → normal). Ein Satz baut sich auf und wird vom nächsten hart ersetzt. Position im oberen Drittel, leicht versetzt pro Satz.
- **Kamera:** Wechsel zum nächsten Punkt in ca. 0,4 s, weich beschleunigt und gebremst, mit Bewegungsunschärfe. Am Ende Rauszoomen in ca. 0,85 s.
- **Schwarze Karte:** harter Schnitt rein und raus. Zeile 1 klein, Zeile 2 groß. Baut schnell auf (≤ 0,2 s pro Wort) und hält die Pointe mindestens 0,6 s.
- **Lesetempo ohne Stimme:** höchstens ca. 3,5 Wörter pro Sekunde.

## 5. Sound

| Moment | Sound | earshot-Kit |
|---|---|---|
| Durchgehend | Yazans Stimme, ca. 165 Wörter/min, ohne Pausen | – |
| Enthüllung | leise Tipp-Klicks, Spitzen ca. −19 dBFS | `pro_typing_run/soft` |
| Schnitt auf Schwarz | Whoosh, Spitze genau am Schnitt | `whoosh_fast/crisp` |
| Etwas wächst (z. B. eine Kurve) | leiser, ansteigender Ton | `pro_riser/roll` |
| Rauszoomen am Ende | tiefer Sub-Drop | `pro_sub_drop/ref` |

Ziel-Lautheit −14 LUFS (Referenz: −13,7). Die Klicks bleiben leise, laute Sounds gibt es nur an drei Stellen (zwei Karten, Rauszoomen).

## 6. Skript-Regeln

Zusätzlich zu `ralston-content` (Vertrauen statt Viralität, Zielgruppe Ärzte):

1. **Struktur zuerst.** Was ist das eine Bild? 5–10 Bausteine, die ein Arzt wirklich speichern will.
2. **Hook in ≤ 3 s:** Schmerz oder Konsequenz, gern als Imperativ („Unterschreib keine BU, bevor …“).
3. **Pro Punkt ein Satz**, höchstens 7 Wörter, ein Kernwort groß.
4. **Bezeichnungen kurz:** 1–2 Wörter, höchstens ca. 17 Zeichen.
5. **Zwei Karten** als ehrliche Open Loops. Behauptungen wie „die meisten …“ nur mit Beleg.
6. **CTA:** speichern und teilen. In den ersten 6–12 Monaten kein großer Ask.
7. **Zahlen:** Summen rechnet die Engine aus den Annahmen, nichts wird von Hand eingetragen. Renditen sind immer Annahmen („bei 7 % pro Jahr“), nie Versprechen. Zu jedem Reel mit Zahlen gehört eine Quellen-Datei neben der Spec.
8. **Compliance:** keine erfundenen Zahlen, Fälle nur anonymisiert und mit Einwilligung, keine Versicherer herabsetzen. Fachliche Aussagen vor dem Posten prüfen.
9. **Mit Stimme:** zuerst aufnehmen, dann die Beat-Dauern aus den Wortzeiten setzen.

## 7. Prüffragen vor jedem Reel

- Kann ich das Reel in einem Bild zeichnen? Wenn nicht, ist es kein Reel in diesem Stil.
- Sieht man in den ersten 2 s, wie viel noch verhüllt ist?
- Wird pro Beat genau eine Sache enthüllt?
- Stehen die zwei Brüche bei ca. 35 % und 58 %?
- Würde ich das Schlussbild selbst speichern?

---

# Teil B: Werkzeuge

Ein Werkzeug ist ein zentrales Bild plus Engine, die Teil A umsetzt. Alles, was für jedes Reel gilt (Look, Captions, Enthüllung, Karten, Unschärfe), liegt einmal in `core.js`. Ein Werkzeug liefert nur sein Bild und seine Kamera.

## Werkzeug 1: Oktagon-Diagramm (`formel/`)

**Wofür:** 5–10 gleichrangige Bausteine um ein Thema (Checkliste, Formel, Bestandteile).

- Achteck in der Mitte mit Kicker (klein) und Titel (groß, fett). Von jeder Ecke geht eine Speiche zu einem Punkt, daneben das Label.
- **Nahaufnahme:** Zoom 2,4, die aktive Speiche zeigt nach oben, die Nachbar-Labels werden am Rand abgeschnitten.
- **Wechsel:** Das Diagramm dreht sich um eine Speiche weiter (45° bei 8 Speichen, 0,38 s). Die Labels bleiben dabei aufrecht.
- **Schluss:** Rauszoomen und Zurückdrehen auf die Gesamtübersicht, Überschrift „Screenshot machen“.
- Weltmaße (1 Einheit = 1 px in der Übersicht): Außenradius 174, Füllung ab 0,90, Innenlinie bei 0,80, Punkt auf Radius 301.

Bedienung: siehe `README.md`.

## Werkzeug 2: Treppe mit Kurve (`treppe/`)

**Wofür:** ein Plan in Stufen und was daraus wird (Sparplan über die Karriere, Aufbau über Jahre).

- Unten die Treppe: jede Stufe ist eine Phase mit Name und Betrag. Darüber die Kurve mit dem Ergebnis. Beide teilen sich die Altersachse.
- **Verhüllt:** Namen, Beträge und die Endsummen stehen als schwarze Balken da. Die Kurve fehlt noch.
- **Nahaufnahme:** Zoom 3 auf eine Stufe, erst tippt sich der Name frei, dann der Betrag.
- **Kurve:** wächst in 1,9 s von links nach rechts, am Ende tippt sich die Summe frei. Eine zweite, gepunktete Kurve zeigt den vorsichtigen Fall.
- **Ehrlichkeit als Dramaturgie:** Die zweite Karte stellt den Einwand selbst („Und wenn es schlechter läuft?“), die zweite Kurve beantwortet ihn.
- Alle Summen werden aus `plan` in der Spec berechnet. Höchstens zwei Szenarien.

## Weitere Werkzeuge (noch nicht gebaut)

Gleicher Bauplan, anderes Bild. Kandidaten:

| Bild | Passt für |
|---|---|
| **Zeitstrahl** | Abläufe mit Reihenfolge (z. B. Schritte von der Assistenzzeit bis zur Niederlassung) |
| **Zwei Spalten** | Vergleiche (z. B. gesetzlich vs. privat), Zeile für Zeile aufgedeckt |
| **Stapel / Liste** | Rangfolgen und Prioritäten |

Ein neues Werkzeug muss alle sieben Bauprinzipien aus Teil A erfüllen und Look, Bewegung und Sound unverändert übernehmen.

---

## Was wir nicht übernehmen

- Keine Texte und Themen der Referenz. Übernommen werden Bauplan, Look und Rhythmus.
- Kein Handle, kein Logo, keine Endkarte im Video.
