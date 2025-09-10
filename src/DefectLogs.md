# Defect Logs: TTS-Adapter in Thorium Web Reader

## Document Informatie

| **Eigenschap** | **Waarde** |
|----------------|------------|
| **Auteur** | Luuk Lentjes |
| **Aanmaakdatum** | [Datum] |
| **Laatste update** | [Datum] |
| **Versie** | 1.0 |

---

## Defect Overzicht

### Status Dashboard

| **Status** | **Aantal** | **Percentage** |
|------------|------------|----------------|
| Nieuw | 0 | 0% |
| In onderzoek | 0 | 0% |
| Toegewezen | 0 | 0% |
| In behandeling | 0 | 0% |
| Gerepareerd | 0 | 0% |
| Gesloten | 3 | 100% |
| **Totaal** | **3** | **100%** |

### Prioriteit Verdeling

| **Prioriteit** | **Aantal** | **Percentage** |
|----------------|------------|----------------|
| Kritiek | 0 | 0% |
| Hoog | 0 | 0% |
| Gemiddeld | 0 | 0% |
| Laag | 0 | 0% |
| **Totaal** | **0** | **100%** |

---

## Defect Template (Kopieer voor nieuwe defects)

### DEF-XXX: [Korte titel van het defect]

| **Veld** | **Waarde** |
|----------|------------|
| **Defect ID** | DEF-XXX |
| **Titel** | [Korte beschrijving] |
| **Gerelateerde Test Case** | TC-XXX |
| **Prioriteit** | Kritiek / Hoog / Gemiddeld / Laag |
| **Ernst** | Blocker / Major / Minor / Trivial |
| **Status** | Nieuw / In onderzoek / Toegewezen / In behandeling / Gerepareerd / Gesloten |
| **Gevonden door** | [Naam tester] |
| **Gevonden op** | [Datum] |
| **Toegewezen aan** | [Naam ontwikkelaar] |
| **Omgeving** | [Browser, OS, versie] |
| **TTS Provider** | [ElevenLabs / Azure / Web Speech API / Andere] |

**Beschrijving:**
[Gedetailleerde beschrijving van het probleem]

**Stappen om te reproduceren:**
1. [Stap 1]
2. [Stap 2]
3. [Stap 3]

**Verwacht gedrag:**
[Wat er zou moeten gebeuren]

**Werkelijk gedrag:**
[Wat er daadwerkelijk gebeurt]

**Screenshots/Logs:**
- [Bijlage 1]
- [Bijlage 2]

**Workaround:**
[Tijdelijke oplossing, indien beschikbaar]

**Notities:**
[Aanvullende informatie]

---

## Actieve Defects

*Geen actieve defects - alle issues zijn opgelost!*

---

## Gesloten Defects

### DEF-001: Onjuiste foutmelding bij geen internetverbinding

| **Veld** | **Waarde** |
|----------|------------|
| **Defect ID** | DEF-002 |
| **Titel** | Intonatie voor vetgedrukte en cursieve tekst werkt niet correct |
| **Gerelateerde Test Case** | TC-02a |
| **Prioriteit** | Hoog |
| **Ernst** | Major |
| **Status** | Nieuw |
| **Gevonden door** | Luuk Lentjes |
| **Gevonden op** | September 10, 2025 |
| **Toegewezen aan** | [Te bepalen] |
| **Omgeving** | Firefox 142.0.1 (64-bit), Linux Fedora 42 |
| **TTS Provider** | ElevenLabs / Azure |

**Beschrijving:**
Het systeem detecteert wel vetgedrukte en cursieve tekstelementen in ePub-bestanden, maar de intonatie-aanpassingen werken niet zoals verwacht. In plaats van hogere toon voor vetgedrukte tekst en zachtere stem voor cursieve tekst, wordt de tekst alleen langzamer voorgelezen.

**Stappen om te reproduceren:**

1. Laad een ePub-bestand met vetgedrukte en cursieve tekst
2. Start TTS voorlezen
3. Luister naar de intonatie bij opgemaakt tekst

**Verwacht gedrag:**

- Vetgedrukte tekst: hogere toon/nadruk
- Cursieve tekst: zachtere/andere intonatie
- Normale doorleessnelheid

**Werkelijk gedrag:**

- Opgemaakt tekst wordt gedetecteerd maar alleen langzamer voorgelezen
- Geen distinctieve toon- of intonatie-aanpassingen

**Screenshots/Logs:**
[Te toevoegen]

**Workaround:**
Geen workaround beschikbaar, functionaliteit werkt niet zoals ontworpen

**Notities:**
SSML-configuratie voor intonatie moet herzien worden. Mogelijk probleem in TextProcessor of adapter-specifieke SSML implementatie.

---

## Gesloten Defects

### DEF-001: Onjuiste foutmelding bij geen internetverbinding

| **Veld** | **Waarde** |
|----------|------------|
| **Defect ID** | DEF-001 |
| **Titel** | Onjuiste foutmelding bij geen internetverbinding |
| **Status** | Gesloten |
| **Opgelost door** | Luuk Lentjes |
| **Opgelost op** | September 10, 2025 |
| **Oplossing** | Error handling volledig geïmplementeerd. Netwerkfouten worden gedetecteerd door beide adapters (ElevenLabs en Azure) en tonen Nederlandse foutmeldingen. TtsOrchestrationService aangepast om ITTSError.message correct door te geven aan UI. Gebruikers zien nu "Geen internetverbinding beschikbaar" in plaats van "Error: Failed to generate audio". |

---

### DEF-002: Intonatie voor vetgedrukte en cursieve tekst werkt niet correct

| **Veld** | **Waarde** |
|----------|------------|
| **Defect ID** | DEF-002 |
| **Titel** | Intonatie voor vetgedrukte en cursieve tekst werkt niet correct |
| **Status** | Gesloten |
| **Opgelost door** | Luuk Lentjes |
| **Opgelost op** | September 10, 2025 |
| **Oplossing** | Adapter-specifieke text processing geïmplementeerd. Azure gebruikt SSML voor correcte intonatie. ElevenLabs gebruikt nieuwe ElevenLabsTextProcessor die SSML converteert naar tekstmodificaties (hoofdletters voor bold, streepjes voor italic, etc.). Beide adapters produceren nu duidelijk onderscheidbare intonatie voor opgemaakt tekst. |

---

### DEF-003: Automatisch doorlezen naar volgende pagina werkt niet

| **Veld** | **Waarde** |
|----------|------------|
| **Defect ID** | DEF-003 |
| **Titel** | Automatisch doorlezen naar volgende pagina werkt niet |
| **Status** | Gesloten |
| **Opgelost door** | Luuk Lentjes |
| **Opgelost op** | September 10, 2025 |
| **Oplossing** | Pagina-navigatie functionaliteit succesvol geïmplementeerd in TtsOrchestrationService. Systeem detecteert nu automatisch het einde van een pagina en gaat door naar de volgende pagina zonder onderbreking van het voorlezen. |

---

## Defect Classificatie Richtlijnen

### Prioriteit Definities

| **Prioriteit** | **Definitie** | **Voorbeelden** |
|----------------|---------------|-----------------|
| **Kritiek** | Blokkeert hoofdfunctionaliteit, maakt systeem onbruikbaar | TTS werkt helemaal niet, applicatie crasht |
| **Hoog** | Belangrijke functionaliteit werkt niet correct | Intonatie werkt niet, belangrijke sneltoetsen falen |
| **Gemiddeld** | Functionaliteit werkt gedeeltelijk of heeft workaround | Menu laadt traag, enkele edge cases falen |
| **Laag** | Cosmetische issues, kleine verbeteringen | Spelfouten, kleine UI verbeteringen |

### Ernst Definities

| **Ernst** | **Definitie** |
|-----------|---------------|
| **Blocker** | Voorkomt verdere testing of productie gebruik |
| **Major** | Significante impact op functionaliteit |
| **Minor** | Kleine impact, heeft workaround |
| **Trivial** | Geen functionele impact |

### Status Definities

| **Status** | **Definitie** |
|------------|---------------|
| **Nieuw** | Defect is net gevonden en nog niet bekeken |
| **In onderzoek** | Ontwikkelaar onderzoekt het probleem |
| **Toegewezen** | Defect is toegewezen aan specifieke ontwikkelaar |
| **In behandeling** | Ontwikkelaar werkt aan de oplossing |
| **Gerepareerd** | Fix is geïmplementeerd, wacht op test |
| **Gesloten** | Defect is opgelost en geverifieerd |

---

## Defect Tracking Log

| **Datum** | **Defect ID** | **Actie** | **Door** | **Opmerkingen** |
|-----------|---------------|-----------|----------|-----------------|
| 2025-09-10 | DEF-001 | Aangemaakt | Luuk Lentjes | Onjuiste foutmelding bij geen internetverbinding |
| 2025-09-10 | DEF-001 | Gerepareerd | Luuk Lentjes | Verbeterde error handling voor netwerkfouten in beide adapters |
| 2025-09-10 | DEF-001 | Gesloten | Luuk Lentjes | UI aangepast om ITTSError.message correct te tonen |
| 2025-09-10 | DEF-002 | Aangemaakt | Luuk Lentjes | Intonatie voor opgemaakt tekst werkt niet correct |
| 2025-09-10 | DEF-002 | Gesloten | Luuk Lentjes | Adapter-specifieke text processing en ElevenLabsTextProcessor geïmplementeerd |
| 2025-09-10 | DEF-003 | Aangemaakt | Luuk Lentjes | Automatisch doorlezen naar volgende pagina werkt niet |
| 2025-09-10 | DEF-003 | Gesloten | Luuk Lentjes | Pagina-navigatie functionaliteit succesvol geïmplementeerd |

---

## Rapportage Template voor Updates

### Wekelijkse Defect Status (Week van [Datum])

**Nieuwe defects deze week:** [X]

**Opgeloste defects deze week:** [X]

**Huidige open defects:** [X]

**Kritieke issues die aandacht nodig hebben:**

1. DEF-XXX: [Korte beschrijving]
2. DEF-XXX: [Korte beschrijving]

**Trends:**

- [Observatie 1]
- [Observatie 2]

**Acties voor volgende week:**

- [Actie 1]
- [Actie 2]
