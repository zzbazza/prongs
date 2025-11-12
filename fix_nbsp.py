#!/usr/bin/env python3
"""
Script to fix file paths by replacing regular spaces with NBSP characters
in specific locations where needed
"""

import json

# Files to fix with NBSP characters
files_to_fix = [
    {
        "config": "content/configs/exhibition-panels/1-praveka-obr/items.json",
        "old": "files/Tabule/1-pravěká obr./Tylocidaris nalezena na poli u Výškovic (nálezce Lukáš Klega, foto Jiřina Chalupská).jpg",
        "new": "files/Tabule/1-pravěká\u00A0obr./Tylocidaris nalezena na poli u\u00A0Výškovic (nálezce Lukáš\u00A0Klega, foto\u00A0Jiřina\u00A0Chalupská).jpg"
    },
    {
        "config": "content/configs/exhibition-panels/2-kolonizacni/items.json",
        "old": "files/Tabule/2-kolonizační/Rekonstrukce zalesnění ve středověku před velkou kolonizací ve 13 století dle Emila Opravila (Opravil, E 1974 Moravskoslezský pomezní les do začátku kolonizace).jpg",
        "new": "files/Tabule/2-kolonizační/Rekonstrukce zalesnění ve\u00A0středověku před velkou kolonizací ve\u00A013\u00A0století dle Emila\u00A0Opravila (Opravil,\u00A0E\u00A01974 Moravskoslezský pomezní les do\u00A0začátku kolonizace).jpg"
    },
    {
        "config": "content/configs/exhibition-panels/2-kolonizacni/items.json",
        "old": "files/Tabule/2-kolonizační/Zápis o přítomnosti středověkých jam na katastru Staré Bělé z archivu archeologa Hanse Freisinga (1905–1977), uložen v Archivu Archeologického ústavu v Brně, AVČR.jpg",
        "new": "files/Tabule/2-kolonizační/Zápis o\u00A0přítomnosti středověkých jam na katastru Staré\u00A0Bělé z\u00A0archivu archeologa Hanse\u00A0Freisinga (1905–1977), uložen v\u00A0Archivu Archeologického ústavu v\u00A0Brně, AVČR.jpg"
    },
    {
        "config": "content/configs/exhibition-panels/3-stredoveka/items.json",
        "old": "files/Tabule/3-středověká/Privilegium Jana staršího ze Žerotína z roku 1558 (z pozůstalosti Fr. Dedka, uloženo v Státním okresním archivu v Kroměříži).jpg",
        "new": "files/Tabule/3-středověká/Privilegium Jana staršího ze\u00A0Žerotína z\u00A0roku 1558 (z\u00A0pozůstalosti Fr.\u00A0Dedka, uloženo v\u00A0Státním okresním archivu v\u00A0Kroměříži).jpg"
    },
    {
        "config": "content/configs/exhibition-panels/4-pobelohorska/items.json",
        "old": "files/Tabule/4-pobělohorská/Vyznačení terénních reliktů šancí na katastru Nové Bělé na mapách tzv císařského stabilního katastru z roku 1833.jpg",
        "new": "files/Tabule/4-pobělohorská/Vyznačení terénních reliktů šancí na katastru Nové\u00A0Bělé na mapách tzv\u00A0císařského stabilního katastru z\u00A0roku 1833.jpg"
    },
    {
        "config": "content/configs/exhibition-panels/4-pobelohorska/items.json",
        "old": "files/Tabule/4-pobělohorská/Vyznačení terénních reliktů šancí na katastru Výškovic na mapách tzv císařského stabilního katastru z roku 1833.jpg",
        "new": "files/Tabule/4-pobělohorská/Vyznačení terénních reliktů šancí na katastru Výškovic na mapách tzv\u00A0císařského stabilního katastru z\u00A0roku 1833.jpg"
    },
    {
        "config": "content/configs/exhibition-panels/4-pobelohorska/items.json",
        "old": "files/Tabule/4-pobělohorská/Vyznačení šancí a komunikace z Nové Bělé do Výškovic z II Vojenského mapování z roku 1840 na podkladu Základní mapy ČR Vyznačeno 25 10 2025 v programu Qgis.jpg",
        "new": "files/Tabule/4-pobělohorská/Vyznačení šancí a\u00A0komunikace z\u00A0Nové\u00A0Bělé do Výškovic z\u00A0II\u00A0Vojenského mapování z\u00A0roku 1840 na podkladu Základní mapy ČR\u00A0Vyznačeno 25\u00A010\u00A02025 v\u00A0programu Qgis.jpg"
    },
    {
        "config": "content/configs/exhibition-panels/4-pobelohorska/items.json",
        "old": "files/Tabule/4-pobělohorská/Vyznačení šancí na katastru Nové Bělé na mapách II Vojenského mapování z roku 1840.jpg",
        "new": "files/Tabule/4-pobělohorská/Vyznačení šancí na katastru Nové\u00A0Bělé na mapách II\u00A0Vojenského mapování z\u00A0roku 1840.jpg"
    },
    {
        "config": "content/configs/exhibition-panels/4-pobelohorska/items.json",
        "old": "files/Tabule/4-pobělohorská/Vyznačení šancí na katastru Výškovic na mapách II Vojenského mapování z roku 1840.jpg",
        "new": "files/Tabule/4-pobělohorská/Vyznačení šancí na katastru Výškovic na mapách II\u00A0Vojenského mapování z\u00A0roku 1840.jpg"
    },
    {
        "config": "content/configs/exhibition-panels/4-pobelohorska/items.json",
        "old": "files/Tabule/4-pobělohorská/Zavraždění Ondráše Jurášem Malba patrně z počátku 19 století Zámek Vsetín.jpg",
        "new": "files/Tabule/4-pobělohorská/Zavraždění Ondráše Jurášem Malba patrně z\u00A0počátku 19\u00A0století Zámek Vsetín.jpg"
    },
    {
        "config": "content/configs/exhibition-panels/9-10-druhovalecna/items.json",
        "old": "files/Tabule/9-10 - druhoválečná/Sloup elektrického napětí na Gregárkově ulici po náletech z přelomu dubna a května 1945.jpg",
        "new": "files/Tabule/9-10\u00A0-\u00A0druhoválečná/Sloup elektrického napětí na Gregárkově ulici po náletech z\u00A0přelomu dubna a\u00A0května 1945.jpg"
    }
]

def fix_nbsp_in_file(config_file, old_path, new_path):
    """Fix NBSP in a specific file"""
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        found = False
        for item in data.get('items', []):
            if item.get('path') == old_path:
                item['path'] = new_path
                found = True
                print(f"✓ Fixed: {config_file}")
                print(f"  Old: {old_path}")
                print(f"  New: {new_path}")
                break

        if found:
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        else:
            print(f"✗ Not found in {config_file}: {old_path}")

    except Exception as e:
        print(f"Error processing {config_file}: {e}")

def main():
    print("Fixing NBSP characters in file paths...\n")

    for fix in files_to_fix:
        fix_nbsp_in_file(fix['config'], fix['old'], fix['new'])
        print()

if __name__ == '__main__':
    main()
