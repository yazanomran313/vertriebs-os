# Belege zum Reel „Als Arzt zur Rente Millionär“

Stand: 10.11.2026. Jede Zahl im Reel ist entweder eine Annahme des Rechenbeispiels oder aus ihr berechnet.

## Die Rechnung

Sparplan mit Einzahlung am Monatsende und monatlicher Verzinsung, Start mit 27, Ende mit 67.
Die Engine (`../engine.html`, Funktion `simulate`) rechnet das bei jedem Render neu; eine unabhängige Kontrollrechnung in Python ergibt dieselben Werte.

| Szenario | Sparrate | Rendite p. a. | Eingezahlt | Endwert mit 67 | Million erreicht mit |
|---|---|---|---|---|---|
| **Im Reel, Kurve 1** | 500 € ab 27, 1.000 € ab 37, 1.500 € ab 47 | 7 % | 540.000 € | **2.074.265 €** | 58 |
| **Im Reel, Kurve 2** | 500 € ab 27, 1.000 € ab 37 (nie Chefarzt) | 5 % | 420.000 € | **1.148.950 €** | 65 |
| Yazans Plan, vorsichtig | wie Kurve 1 | 5 % | 540.000 € | 1.351.852 € | 62 |
| Ohne Chefarzt | wie Kurve 2 | 7 % | 420.000 € | 1.820.497 € | 59 |
| Nur 500 € durchgehend | 500 € ab 27 | 7 % | 240.000 € | 1.235.771 € | 64 |
| Nur 500 € durchgehend | 500 € ab 27 | 5 % | 240.000 € | 741.262 € | nie |

## Was das Reel nicht zeigt (und der Hinweis im Schlussbild abdeckt)

- **Steuern:** Beim Verkauf fallen auf den Gewinn 26,375 % Abgeltungsteuer inkl. Soli an, bei Aktienfonds nach 30 % Teilfreistellung. Grob gerechnet bleiben von Kurve 1 ca. 1,79 Mio. € und von Kurve 2 ca. 1,01 Mio. € (ohne Vorabpauschale, Freibetrag und Kirchensteuer).
- **Inflation:** Bei 2 % Inflation hat 1 Mio. € in 40 Jahren die Kaufkraft von heute ca. 453.000 €. Die 2,07 Mio. € aus Kurve 1 entsprechen dann heute ca. 940.000 €. „Millionär“ gilt also nominal.
- **Kosten:** ETF-Kosten und Depotgebühren sind nicht abgezogen.

## Belege für die Annahmen

**7 % Rendite pro Jahr ist ein historischer Durchschnitt, kein Minimum.**
- Finanztip (Pressemitteilung 2017, Daten ab 1975): Wer beliebige 15 Jahre in den MSCI World investiert war, erzielte im Schnitt 7,7 % pro Jahr; der ungünstigste 15-Jahres-Zeitraum brachte 1,3 % pro Jahr. https://www.finanztip.de/presse/pm-finanztip-msci-world-rendite/
- Deutsches Aktieninstitut, Rendite-Dreieck MSCI World: https://www.dai.de/fileadmin/user_upload/221231_MSCI_World-Rendite-Dreick_Web.pdf
- Deutsche Börse: Die annualisierten Fünfjahresrenditen seit 1970 reichten von rund −9 % bis knapp +28 %. https://live.deutsche-boerse.com/nachrichten/msci-world-kontra-weltportfolio-warum-ein-index-selten-genuegt

**Die Sparraten passen zu den Gehältern.**
- TV-Ärzte/VKA, gültig 01.08.2025–31.05.2026, Stufe 1: Entgeltgruppe I (Assistenzarzt) 5.609,85 € brutto im Monat, Entgeltgruppe III (Oberarzt) 9.274,08 €. https://oeffentlicher-dienst.info/aerzte/kommunal/a/2026/a/vergleich.tv-aerzte-vka-2025.m.html
- Chefärzte werden außertariflich bezahlt. Kienbaum-Vergütungsreport 2019: im Schnitt ca. 300.000 € brutto im Jahr (Spanne ca. 82.000–773.000 €). Neuere Ausgabe nicht gefunden. https://aerztestellen.aerzteblatt.de/de/redaktion/gehalt-als-chefarzt-das-koennen-sie-verdienen

**Chefarzt wird nur eine Minderheit.** Deshalb rechnet Kurve 2 ohne diese Stufe.
- Laut praktischarzt.de sind ca. 8 % der Klinikärzte leitende Ärzte bzw. Chefärzte, ca. 23 % Oberärzte; Eintrittsalter als Chefarzt im Schnitt zwischen 35 und 49. https://www.praktischarzt.de/magazin/jung-oder-erfahren-in-welchem-alter-man-chefarzt-werden-sollte/
- Stationär tätige Ärztinnen und Ärzte 2024: 227.995 (Bundesärztekammer). https://www.bundesaerztekammer.de/baek/ueber-uns/aerztestatistik/2024

## Offene Punkte

- Die Quellen wurden über Suchergebnisse geprüft. Die Originalseiten ließen sich in der Arbeitsumgebung nicht direkt öffnen (Netzwerk-Sperre). Vor dem Posten die Finanztip-Zahl und die Tariftabelle einmal selbst gegenlesen.
- Der Anteil der Chefärzte stammt aus einem Ratgeber, nicht aus einer amtlichen Statistik.
- Die Altersgrenzen 27 / 37 / 47 sind Annahmen für einen typischen Verlauf, keine Statistik.
- **Werberecht:** Für Finanzanlagenvermittler gilt § 14 FinVermV (Werbung muss redlich, eindeutig und nicht irreführend sein). Ob für dieses Reel weitere Pflichtangaben nötig sind, bitte mit der eigenen Compliance bzw. dem Haftungsdach klären. Das ist keine Rechtsberatung.
