# Testplan voor TTS-Adapter in Thorium Web Reader

## Document Informatie

| **Eigenschap** | **Waarde** |
|----------------|------------|
| **Auteur** | Luuk Lentjes |
| **Datum** | 10 september 2025 |
| **Versie** | 1.0 |

---

## Inhoudsopgave

1. [Doelstellingen](#1-doelstellingen)
2. [Scope](#2-scope)
3. [Test Items](#3-test-items)
4. [Features te Testen](#4-features-te-testen)
5. [Features Niet te Testen](#5-features-niet-te-testen)
6. [Aanpak](#6-aanpak)
7. [Pass/Fail Criteria](#7-passfail-criteria)
8. [Onderbrekingscriteria en Hervattingsvereisten](#8-onderbrekingscriteria-en-hervattingsvereisten)
9. [Test Deliverables](#9-test-deliverables)
10. [Testtaken](#10-testtaken)
11. [Omgeving](#11-omgeving)
12. [Risico's en Contingenties](#12-risicos-en-contingenties)
13. [Test Cases](#test-cases)

---

## 1. Doelstellingen

Test de TTS-adapterstructuur actief om te verzekeren dat deze spraakondersteuning biedt voor ePub-lezers, met focus op natuurlijke intonatie voor vetgedrukte en cursieve tekst. Identificeer risico's in integratie en gebruikersondersteuning, gebaseerd op use cases en user stories uit de Software Guidebook.

## 2. Scope

### 2.1 In Scope

- Functionele testen van use cases EU-01 t/m EU-07 (lezer)
- Use cases DEV-01 t/m DEV-02 (ontwikkelaar)
- Voorlezen functionaliteit
- Intonatie-aanpassingen
- Adapterintegratie

### 2.2 Out of Scope

- Infrastructuur
- Deployment
- Monitoring

## 3. Test Items

- **TTS-adapter** voor providers zoals ElevenLabs en Azure
- **Integratie** met Thorium Web Reader
- **ePub-tekstverwerking** en spraakoutput

## 4. Features te Testen

| **Use Case** | **Feature** | **Beschrijving** |
|--------------|-------------|------------------|
| EU-01 | Voorlezen | Voorlezen van ePub-tekst |
| EU-02 | Intonatie | Aangepaste intonatie voor vet/cursief |
| EU-03 | Navigatie | Automatische paginanavigatie |
| EU-04 | Bediening | Bediening via sneltoetsen |
| EU-05 | Nadruk | Uniforme auditieve nadruk instellen |
| EU-06 | Context | Contextafhankelijke nadruk |
| EU-07 | Menu | Toegankelijk menu voor instellingen |
| DEV-01 | Integratie | Adapterintegratie voor TTS-diensten |
| DEV-02 | Metadata | Toegang tot semantische metadata |

## 5. Features Niet te Testen

| **Feature** | **Reden** |
|-------------|-----------|
| Externe TTS-service betrouwbaarheid | Afhankelijk van providers |
| Prestatie onder hoge load | Buiten scope van dit testplan |
| Beveiliging van API-keys | Onderdeel van infrastructuur-testing |

## 6. Aanpak

Voer manuele en exploratieve testen uit in een browseromgeving. Gebruik ePub-testbestanden met opmaak. Test op laptop/PC met internet en audio.

## 7. Pass/Fail Criteria

| **Resultaat** | **Criteria** |
|---------------|--------------|
| **Pass** | Verwachte output matcht use case succes-scenario (bijv. tekst klinkt met juiste intonatie) |
| **Fail** | Uitzondering treedt op zonder foutmelding, of alternatieve stroom werkt niet |

## 8. Onderbrekingscriteria en Hervattingsvereisten

**Onderbreking:** Bij kritieke fouten zoals TTS-service outage

**Hervatting:** Na fix en herconfiguratie van adapter

## 9. Test Deliverables

| **Deliverable** | **Beschrijving** |
|-----------------|------------------|
| Testrapport | Overzicht van testresultaten en bevindingen |
| Defect logs | Documentatie van gevonden bugs en issues |
| Use case documentatie | Geüpdatete use case documentatie met testresultaten |

## 10. Testtaken

1. Bereid testomgeving voor
2. Voer test cases uit
3. Log resultaten en defects
4. Valideer fixes

## 11. Omgeving

| **Component** | **Specificatie** |
|---------------|------------------|
| **Browser** | Chrome/Firefox |
| **OS** | Windows/Mac/Linux |
| **Tools** | Thorium Web Reader, ePub-bestanden, API-keys voor de adapters |
| **Connectiviteit** | Internetverbinding en audio-output |

## 12. Risico's en Contingenties

| **Risico** | **Contingentie** |
|------------|------------------|
| TTS-provider downtime | Val terug op Web Speech API |
| ePub-bestand incompatibiliteit | Gebruik standaard testbestanden |
| Tijdsoverschrijding | Prioriteer kern use cases |

---

## Test Cases

### Overzicht Test Cases

**Auteur:** Luuk Lentjes
**Datum:** 10 september 2025
**Versie:** 1.0

Deze test cases zijn gebaseerd op de use cases en user stories uit de Software Guidebook. Elke sectie richt zich op één use case/user story, met test cases in een gestructureerde tabel. Voer tests uit in een browseromgeving met ePub-testbestanden, internet en audio.

### EU-01: Tekst in ePub-bestanden voorlezen

| ID     | Beschrijving                          | Stappen                                                                 | Verwacht Resultaat                                                                 |
|--------|---------------------------------------|-------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| TC-01a | Hoofdscenario: Voorlezen starten      | 1. Open geldig ePub-bestand. 2. Klik 'Tekst to speech'. 3. Selecteer provider en stem. 4. Klik 'Start reading'. | Systeem verwerkt tekst, stuurt naar TTS-service en speelt spraak af; lezer hoort tekst. |
| TC-01b | Alternatief: Stem/provider wisselen   | 1. Volg hoofdscenario tot stap 3. 2. Wissel stem/provider.              | Systeem past aan en speelt af met nieuwe keuze.                                    |
| TC-01c | Uitzondering: Ongeldig bestand        | 1. Open ongeldig ePub-bestand. 2. Probeer voorlezen.                   | Systeem toont foutmelding "Ongeldig bestand" en stopt.                             |
| TC-01d | Uitzondering: Geen internet           | 1. Schakel internet uit. 2. Probeer voorlezen met online TTS.          | Systeem toont foutmelding "Geen verbinding" en stopt.                              |

### EU-02: Vetgedrukte en cursieve tekst anders voorlezen

| ID     | Beschrijving                          | Stappen                                                                 | Verwacht Resultaat                                                                 |
|--------|---------------------------------------|-------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| TC-02a | Hoofdscenario: Opmaak herkennen       | 1. Open ePub met vet/cursief. 2. Start voorlezen.                      | Systeem identificeert opmaak, past intonatie aan (vet: hogere toon, cursief: zachter); lezer hoort aangepaste tekst. |
| TC-02b | Alternatief: Geen ondersteunde intonatie | 1. Volg hoofdscenario met TTS zonder intonatie-ondersteuning.       | Systeem gebruikt standaardstem en speelt af.                                       |
| TC-02c | Alternatief: Geen opmaak in bestand   | 1. Open ePub zonder opmaak. 2. Start voorlezen.                        | Systeem leest in standaardstem af.                                                 |
| TC-02d | Uitzondering: Opmaak niet gedetecteerd| 1. Open ePub met opmaak. 2. Simuleer detectiefout.                     | Systeem leest zonder aanpassing af.                                                |
| TC-02e | Uitzondering: TTS-service niet beschikbaar | 1. Blokkeer TTS-service. 2. Start voorlezen.                       | Systeem toont foutmelding "TTS-service niet beschikbaar".                          |

### EU-03: Automatisch doorlezen naar volgende pagina

| ID     | Beschrijving                          | Stappen                                                                 | Verwacht Resultaat                                                                 |
|--------|---------------------------------------|-------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| TC-03a | Hoofdscenario: Automatische navigatie | 1. Open meerpagina's ePub. 2. Start voorlezen. 3. Wacht tot pagina-einde. | Systeem laadt volgende pagina automatisch en blijft voorlezen.                     |
| TC-03b | Alternatief: Pauzeren voor pagina-einde | 1. Volg hoofdscenario. 2. Pauzeer voor einde. 3. Hervat.             | Systeem slaat positie op en hervat op volgende pagina.                             |
| TC-03c | Alternatief: Einde bestand bereikt    | 1. Start voorlezen op laatste pagina. 2. Wacht tot einde.              | Systeem stopt met voorlezen.                                                       |
| TC-03d | Uitzondering: Volgende pagina niet laden | 1. Simuleer laadfout volgende pagina. 2. Wacht tot einde huidige.   | Systeem toont "Kan pagina niet laden" en pauzeert.                                |
| TC-03e | Uitzondering: Geen internet tijdens navigatie | 1. Schakel internet uit bij pagina-einde.                          | Systeem meldt "Geen verbinding" en stopt.                                          |

### EU-04: Voorlezen bedienen met sneltoetsen

| ID     | Beschrijving                          | Stappen                                                                 | Verwacht Resultaat                                                                 |
|--------|---------------------------------------|-------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| TC-04a | Hoofdscenario: Sneltoetsen gebruiken  | 1. Start voorlezen. 2. Druk Spatie (pauze). 3. Druk Spatie (hervat). 4. Druk Esc (stop). | Systeem pauzeert, hervat vanaf positie en stopt.                                   |
| TC-04b | Alternatief: Stoppen met Esc          | 1. Start voorlezen. 2. Druk Esc.                                        | Systeem stopt en keert naar startpositie.                                          |
| TC-04c | Alternatief: Ongeldige sneltoets      | 1. Start voorlezen. 2. Druk ongeldige toets.                            | Systeem negeert en blijft voorlezen.                                               |
| TC-04d | Uitzondering: Geen toetsenbord detectie | 1. Simuleer geen toetsenbord. 2. Probeer sneltoetsen.                 | Systeem meldt fout of valt terug op alternatieve bediening.                        |

### EU-05: Uniforme en aanpasbare auditieve nadruk instellen

| ID     | Beschrijving                          | Stappen                                                                 | Verwacht Resultaat                                                                 |
|--------|---------------------------------------|-------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| TC-05a | Hoofdscenario: Nadruk instellen       | 1. Open ePub. 2. Ga naar instellingen. 3. Selecteer optie (bijv. standaard). 4. Start voorlezen. | Systeem slaat op, past toe op alle boeken en introduceert bij nieuw boek.          |
| TC-05b | Alternatief: Nadruk uitschakelen      | 1. Volg hoofdscenario. 2. Zet nadruk uit.                              | Systeem leest in standaardstem zonder nadruk.                                      |
| TC-05c | Alternatief: Introductie overslaan    | 1. Volg hoofdscenario. 2. Sla introductie over na eerste keer.         | Systeem schakelt introductie uit voor toekomstige boeken.                          |
| TC-05d | Uitzondering: Instellingen niet opslaan | 1. Simuleer opslagfout. 2. Probeer instellen.                        | Systeem toont "Kan instellingen niet opslaan" en herstelt standaard.               |

### EU-06: Contextafhankelijke auditieve nadruk toepassen

| ID     | Beschrijving                          | Stappen                                                                 | Verwacht Resultaat                                                                 |
|--------|---------------------------------------|-------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| TC-06a | Hoofdscenario: Genre-analyse          | 1. Open ePub met genre-metadata (bijv. roman). 2. Start voorlezen.     | Systeem analyseert, selecteert stijl (bijv. vet=zwaarder), kondigt aan en speelt af. |
| TC-06b | Alternatief: Geen metadata            | 1. Open ePub zonder metadata. 2. Start voorlezen.                      | Systeem gebruikt standaardstijl en meldt dit.                                      |
| TC-06c | Alternatief: Aankondiging uitschakelen| 1. Volg hoofdscenario. 2. Schakel aankondiging uit.                    | Systeem slaat voorkeur op en slaat over bij toekomstige boeken.                    |
| TC-06d | Uitzondering: Metadata-analyse mislukt| 1. Simuleer analysefout. 2. Start voorlezen.                           | Systeem gebruikt standaardnadruk en vermeldt melding.                              |
| TC-06e | Uitzondering: Stijl niet ondersteund  | 1. Gebruik TTS zonder stijl-ondersteuning. 2. Start voorlezen.         | Systeem valt terug op standaardstem en meldt "Beperkte stijlondersteuning".        |

### EU-07: Toegankelijk menu voor nadrukinstellingen

| ID     | Beschrijving                          | Stappen                                                                 | Verwacht Resultaat                                                                 |
|--------|---------------------------------------|-------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| TC-07a | Hoofdscenario: Menu via sneltoets     | 1. Open ePub. 2. Activeer menu via sneltoets/spraak. 3. Selecteer optie. | Systeem presenteert opties, leest voor, bevestigt en past toe.                     |
| TC-07b | Alternatief: Niet-ondersteunde invoer | 1. Volg hoofdscenario. 2. Gebruik niet-ondersteunde methode.           | Systeem schakelt naar standaard spraak/toetsenbord.                               |
| TC-07c | Alternatief: Time-out menu            | 1. Open menu. 2. Wacht 30 seconden zonder keuze.                       | Systeem behoudt huidige instelling en sluit menu.                                  |
| TC-07d | Uitzondering: Spraak niet beschikbaar | 1. Blokkeer spraak. 2. Open menu via spraak.                           | Systeem schakelt naar toetsenbord en meldt "Spraak niet beschikbaar".              |
| TC-07e | Uitzondering: Menu niet laden         | 1. Simuleer laadfout menu. 2. Probeer openen.                          | Systeem meldt "Menu niet beschikbaar" en gebruikt standaardinstellingen.           |

### DEV-01: Integreren met externe TTS-diensten via adapterarchitectuur

| ID      | Beschrijving                          | Stappen                                                                 | Verwacht Resultaat                                                                 |
|---------|---------------------------------------|-------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| TC-DEV01a | Hoofdscenario: TTS-service toevoegen  | 1. Voer API-sleutel in. 2. Voeg service aan factory. 3. Voeg API-call toe. 4. Selecteer service en start reading. | Service verschijnt in menu; applicatie stuurt tekst en ontvangt spraakoutput.      |
| TC-DEV01b | Alternatief: Meerdere services        | 1. Volg hoofdscenario. 2. Herhaal voor tweede service.                 | Systeem integreert meerdere en wisselt dynamisch.                                  |
| TC-DEV01c | Alternatief: Extra authenticatie      | 1. Volg hoofdscenario met service die extra authenticatie vereist.     | Systeem vraagt extra gegevens en gaat door.                                        |
| TC-DEV01d | Uitzondering: Ongeldige API-sleutel  | 1. Voer ongeldige sleutel in. 2. Probeer integreren.                   | Systeem toont "Ongeldige API-sleutel" en vraagt correctie.                         |
| TC-DEV01e | Uitzondering: Service niet bereikbaar | 1. Blokkeer service. 2. Probeer integreren.                            | Systeem logt "Service niet beschikbaar" en stopt integratie.                       |

### DEV-02: Toegang tot semantische metadata voor spraakstijlen

| ID      | Beschrijving                          | Stappen                                                                 | Verwacht Resultaat                                                                 |
|---------|---------------------------------------|-------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| TC-DEV02a | Hoofdscenario: Metadata verwerken     | 1. Laad ePub met metadata. 2. Extraheer metadata. 3. Koppel aan stijlen. 4. Stuur naar TTS. | Systeem extraheert, vertaalt naar stijlen en speelt af met intonatie.              |
| TC-DEV02b | Alternatief: Standaardstijlen gebruiken | 1. Volg hoofdscenario zonder custom koppeling.                       | Systeem past vooraf gedefinieerde stijlen toe.                                     |
| TC-DEV02c | Uitzondering: Metadata niet gedetecteerd | 1. Laad ePub zonder metadata. 2. Probeer verwerken.                 | Systeem leest zonder aanpassingen en logt waarschuwing.                            |
| TC-DEV02d | Uitzondering: TTS-service faalt       | 1. Blokkeer TTS. 2. Probeer verwerken.                                  | Systeem toont "TTS-service niet beschikbaar" en stopt.                              |
