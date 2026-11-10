# Reels

Code-gerenderte Reels in unserem Stil. Der Stil selbst (Bauplan, Look, Bewegung, Sound) steht in [`STYLE.md`](STYLE.md) und gilt für jedes Reel.
Dieses README beschreibt die Bedienung der Werkzeuge. Ein Reel ist nur eine JSON-Datei.

```
reels/
  STYLE.md                 Der Stil (Teil A) und die Werkzeuge (Teil B)
  core.js                  Gemeinsamer Stil-Code für alle Werkzeuge
  render.cjs               Spec → MP4 + Cue-Liste (Playwright + ffmpeg)
  sfx.py                   Sound-Layer aus der Cue-Liste (numpy + ffmpeg)
  fonts/                   Inter Display (OFL)
  formel/                  Werkzeug 1: Oktagon-Diagramm
  treppe/                  Werkzeug 2: Treppe mit Kurve
    engine.html            Bild und Kamera des Werkzeugs
    beispiele/             Specs, bei Reels mit Zahlen zusätzlich <name>.quellen.md
```

Welches Werkzeug rendert, ergibt sich aus dem Ordner der Spec.

## Voraussetzungen

- Node 18+, Python 3 mit numpy, ffmpeg
- Playwright mit Chromium: `npm i -D playwright && npx playwright install chromium`

## Ablauf

```bash
# 1. Vorschau im Browser (Leertaste = Play/Pause, Regler zum Scrubben)
node reels/render.cjs reels/formel/beispiele/bu-check-aerzte.json --preview

# 2. Standbilder prüfen (Zeiten in Sekunden)
node reels/render.cjs reels/formel/beispiele/bu-check-aerzte.json --stills 1.2,4.6,11.6,29

# 3. Video rendern (1080×1920, 30 fps; --draft = 15 fps, schneller)
node reels/render.cjs reels/formel/beispiele/bu-check-aerzte.json --out reel.mp4

# 4. Sound drunterlegen (optional mit Yazans Stimme)
python3 reels/sfx.py reel.cues.json reel.mp4 reel-final.mp4 --vo stimme.wav
```

Render-Ausgaben (`*.mp4`, `*.cues.json`, `*.still-*.png`) sind in `.gitignore` und landen nicht im Repo.

## Spec-Format: Oktagon (`formel/`)

```jsonc
{
  "meta":  { "title": "BU-Check für Ärzte", "fps": 30 },
  "hub":   { "kicker": "Checkliste", "title": "BU für Ärzte" },
  "spokes": ["Verweisung", "Nachversicherung", "…"],   // im Uhrzeigersinn ab oben, 5–10 Stück
  "timeline": [
    { "type": "intro", "dur": 3.0, "captions": ["Unterschreib", "keine BU,", "diese | *8 Punkte*"] },
    { "type": "spoke", "spoke": 0, "dur": 2.3, "captions": ["Kein Verweis", "auf einen | *anderen Beruf.*"] },
    { "type": "card",  "dur": 2.2, "text": "Aber dieser Punkt | *ist für Ärzte Pflicht.*" },
    { "type": "outro", "dur": 4.6, "header": "Screenshot machen", "captions": ["Und schick's einem | *Kollegen.*"] }
  ]
}
```

- **Captions:** Jeder String ist eine Phrase, die sich Wort für Wort aufbaut. `|` = Zeilenumbruch, `*…*` = groß und fett.
- **Ohne Stimme** verteilt die Engine die Wörter gleichmäßig über den Beat. Wird es zu schnell zum Mitlesen (< 0,2 s pro Wort), warnt der Renderer.
- **Mit Stimme:** Phrasen als Objekt mit Startzeit relativ zum Beat-Beginn angeben, z. B. `{ "text": "Kein Verweis", "at": 0.6 }`. Die Beat-Dauern (`dur`) aus den Wortzeiten der Aufnahme setzen.
- Jede Speiche sollte genau einen `spoke`-Beat haben. Speichen ohne Beat werden im Outro aufgedeckt.
- Das Reel endet auf dem `outro` (Gesamtbild). Es gibt kein Handle, kein Logo und keine Endkarte.

## Spec-Format: Treppe mit Kurve (`treppe/`)

```jsonc
{
  "plan": {
    "start": 27, "end": 67,
    "stages": [
      { "from": 27, "name": "Assistenzarzt", "rate": 500 },
      { "from": 37, "name": "Oberarzt",      "rate": 1000 },
      { "from": 47, "name": "Chefarzt",      "rate": 1500 }
    ],
    "goal": 1000000, "goalLabel": "1 Mio. €", "ageLabel": "Alter",
    "titles": { "curve": "Dein Depot", "stairs": "Deine Sparrate pro Monat" },
    "scenarios": [
      { "return": 0.07, "sub": "bei 7 % pro Jahr" },
      { "return": 0.05, "stages": 2, "dashed": true, "sub": "ohne Chefarzt, bei 5 %" }
    ]
  },
  "timeline": [
    { "type": "intro", "dur": 3.0, "captions": ["…"] },
    { "type": "step",  "step": 0, "dur": 3.0, "captions": ["…"] },
    { "type": "card",  "dur": 2.2, "text": "Aber … | *…*" },
    { "type": "curve", "scenario": 0, "dur": 5.0, "captions": ["…"] },
    { "type": "outro", "dur": 5.0, "header": "Screenshot machen", "footnote": "Rechenbeispiel, keine Garantie. | …" }
  ]
}
```

- Die Endsummen berechnet die Engine aus `plan` (Einzahlung am Monatsende, monatliche Verzinsung). Der Renderer gibt sie als „Berechnete Werte“ aus.
- `"stages": 2` in einem Szenario heißt: nur die ersten zwei Stufen, die letzte davon läuft bis zum Ende.
- Ein geschütztes Leerzeichen (`\u00a0`) hält Zahl und Einheit in Captions zusammen, z. B. `"500\u00a0€"`.
- Jedes Reel mit Zahlen bekommt eine `<name>.quellen.md` neben der Spec.

## QA vor dem Posten

1. Renderer meldet keine Warnungen.
2. Kontaktbogen anschauen: `ffmpeg -i reel.mp4 -vf "fps=1.5,scale=216:-1,tile=10x5" bogen.png`
3. Lautheit mit Stimme ca. −14 LUFS: `ffmpeg -i reel-final.mp4 -af ebur128 -f null -`
4. Inhalte nach `STYLE.md` §6 (Compliance) fachlich gegenlesen.
