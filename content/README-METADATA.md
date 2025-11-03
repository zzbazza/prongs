# Návod k používání metadata.json

Tento soubor slouží k registraci a popisu veškerého obsahu, který se zobrazuje v expozici.

## Umístění souboru

```
content/metadata.json
```

## Jak přidat nový soubor do expozice

1. Nahrajte soubor (foto, PDF, text, video, audio) do složky `content/` přes FTP/SSH
2. Otevřete soubor `content/metadata.json`
3. Přidejte novou položku do pole `items`

## Formát záznamu

```json
{
  "path": "cesta/k/souboru.jpg",
  "type": "image",
  "title": "Název položky",
  "description": "Krátký popis, co soubor obsahuje",
  "categories": ["Kategorie 1", "Kategorie 2"],
  "keywords": ["klíčové", "slovo1", "slovo2"]
}
```

### Vysvětlení polí

- **path**: Cesta k souboru relativně ke složce `content/` (POVINNÉ)
- **type**: Typ souboru (POVINNÉ)
  - `image` - pro fotografie (jpg, png, gif)
  - `document` - pro PDF dokumenty
  - `text` - pro textové soubory (.txt)
  - `video` - pro videa (mp4, webm)
  - `audio` - pro audio soubory (mp3, wav)
- **title**: Název, který se zobrazí návštěvníkům (POVINNÉ)
- **description**: Krátký popis - zobrazí se na kartě položky a v detailu (NEPOVINNÉ)
- **categories**: Seznam kategorií - soubor se zobrazí v těchto kategoriích (POVINNÉ)
  - **Dostupné kategorie:**
    - `chronicles` - Kroniky
    - `photos` - Fotografie a pohledy
    - `exhibition-panels` - Panely výstav
    - `project-docs` - Projektová dokumentace
    - `old-maps` - Staré mapy
    - `newsletter` - Staroběleský zpravodaj
- **keywords**: Klíčová slova pro vyhledávání (POVINNÉ)

## Příklad

```json
{
  "items": [
    {
      "path": "Fotografie/budova_1920.jpg",
      "type": "image",
      "title": "Budova Zlatého jelena v roce 1920",
      "description": "Historická fotografie hlavní budovy ze severní strany",
      "categories": ["photos", "chronicles"],
      "keywords": ["budova", "1920", "historická fotografie", "architektura"]
    },
    {
      "path": "Dokumenty/kronika_1895.pdf",
      "type": "document",
      "title": "Kronika obce - rok 1895",
      "description": "Zápisy z obecní kroniky za rok 1895",
      "categories": ["chronicles"],
      "keywords": ["kronika", "1895", "historie", "dokumenty"]
    },
    {
      "path": "Mapy/katastral_mapa_1850.jpg",
      "type": "image",
      "title": "Katastrální mapa z roku 1850",
      "description": "Historická katastrální mapa Staré Bělé",
      "categories": ["old-maps"],
      "keywords": ["mapa", "katastr", "1850", "území"]
    }
  ]
}
```

## Důležité

- ✅ Vždy zkontrolujte, že je JSON validní (správně uzavřené závorky, čárky mezi položkami)
- ✅ Každá položka musí být oddělena čárkou
- ✅ Za poslední položkou v poli NESMÍ být čárka
- ✅ Všechny texty v uvozovkách
- ✅ Cesta k souboru musí odpovídat skutečné struktuře ve složce content/

## Kontrola JSON

Pro kontrolu správnosti JSON můžete použít:
- https://jsonlint.com/
- Textový editor s podporou JSON (VS Code, Sublime Text)

## Časté chyby

❌ **Chybí čárka mezi položkami**
```json
{
  "items": [
    { "path": "file1.jpg" }
    { "path": "file2.jpg" }  // ← CHYBA: chybí čárka
  ]
}
```

✅ **Správně**
```json
{
  "items": [
    { "path": "file1.jpg" },
    { "path": "file2.jpg" }
  ]
}
```

❌ **Čárka za poslední položkou**
```json
{
  "items": [
    { "path": "file1.jpg" },
    { "path": "file2.jpg" },  // ← CHYBA: čárka za poslední položkou
  ]
}
```

✅ **Správně**
```json
{
  "items": [
    { "path": "file1.jpg" },
    { "path": "file2.jpg" }  // ← Bez čárky
  ]
}
```
