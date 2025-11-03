# Zlatý jelen - Historická expozice

Webová aplikace pro historickou expozici "Zlatý jelen - svědek minulosti" s moderním elegantním designem inspirovaným zlatou barvou expozice.

## Vlastnosti

- 🎨 **Elegantní design**: Zlatočervený design s historickou atmosférou
- 👆 **Touch optimalizace**: Velká tlačítka a swipe gesta pro 27" dotykové obrazovky
- 📋 **Metadata systém**: Centrální správa obsahu přes JSON soubor
- 🔍 **Pokročilé vyhledávání**: Fulltextové vyhledávání v názvech, popisech a klíčových slovech
- 🏷️ **Kategorie**: Filtrování obsahu podle kategorií
- 🔠 **Tři velikosti textu**: Malá, střední, velká pro různé čtenáře
- 🖼️ **Podpora médií**: Obrázky, PDF, text, video, audio
- 🎨 **České rozhraní**: Veškerý text v češtině
- 🏛️ **Font Awesome ikony**: Profesionální vzhled

## Instalace

```bash
npm install
```

## Spuštění

### Produkční režim
```bash
npm start
```

### Vývojový režim (s automatickým restartováním)
```bash
npm run dev
```

Aplikace poběží na `http://localhost:3000`

## Konfigurace

Upravte soubor `config.js`:

- **ACCESS_PASSWORD**: Heslo pro přístup k aplikaci (výchozí: `historicka-expozice-2024`)
- **SESSION_SECRET**: Tajný klíč pro sessions (změňte v produkci!)
- **PORT**: Port serveru (výchozí: 3000)
- **CONTENT_DIR**: Složka s obsahem (výchozí: `./content`)

## Správa obsahu

### Metadata systém

Veškerý obsah je spravován pomocí souboru `content/metadata.json`. Tento systém umožňuje:
- Zadávat názvy a popisy položek
- Organizovat obsah do kategorií
- Přidávat klíčová slova pro vyhledávání
- Jednoduchá editace i pro ne-IT pracovníky

**Detailní návod:** Viz `content/README-METADATA.md`

### Přidání nového obsahu

1. **Nahrajte soubor** do složky `content/` (přes FTP/SSH)
2. **Zaregistrujte soubor** v `content/metadata.json`:

```json
{
  "items": [
    {
      "path": "Fotografie/budova_1920.jpg",
      "type": "image",
      "title": "Budova Zlatého jelena v roce 1920",
      "description": "Historická fotografie hlavní budovy",
      "categories": ["Architektura", "20. století"],
      "keywords": ["budova", "1920", "fotografie"]
    }
  ]
}
```

### Podporované typy

- **`image`**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- **`document`**: `.pdf`
- **`text`**: `.txt`, `.md`
- **`video`**: `.mp4`, `.webm`, `.ogg`
- **`audio`**: `.mp3`, `.wav`, `.ogg`

### Struktura složek

```
content/
├── metadata.json          # Registr všech souborů (DŮLEŽITÉ!)
├── README-METADATA.md     # Návod k používání
├── Fotografie/            # Složka s fotografiemi
├── Dokumenty/             # Složka s PDF dokumenty
├── Texty/                 # Textové soubory
├── Videa/                 # Video soubory (budoucí)
└── Audio/                 # Audio soubory (budoucí)
```

## Použití

1. **Přihlášení**: Zadejte heslo (nastavené v `config.js`)
2. **Vyhledávání**: Použijte vyhledávací pole pro hledání v obsahu
3. **Kategorie**: Klikněte na tlačítka kategorií pro filtrování obsahu
4. **Velikost textu**: Použijte tlačítka A-/A+ v pravém horním rohu
5. **Procházení**: Klikněte na položky pro otevření obsahu
6. **Navigace v obrázcích**:
   - Použijte tlačítka ‹ › pro přechod mezi obrázky
   - Nebo použijte swipe gesta vlevo/vpravo
7. **Domů**: Tlačítko 🏠 resetuje filtry a vrátí na hlavní zobrazení

## Nasazení na server

### 1. Příprava serveru

**Požadavky:**
- Node.js 16+
- npm nebo yarn
- Reverse proxy (nginx/Apache) - doporučeno

### 2. Nahrání aplikace

```bash
# Zkopírujte celý projekt na server
scp -r . user@server:/path/to/zlaty_jelen/

# Nebo použijte git
git clone your-repo.git /path/to/zlaty_jelen
cd /path/to/zlaty_jelen
npm install
```

### 3. Konfigurace pro produkci

Upravte `config.js`:
```javascript
module.exports = {
  ACCESS_PASSWORD: 'silne-heslo-zmenit',
  SESSION_SECRET: 'nahodny-dlouhy-retezec-zmenit',
  PORT: 3000,
  CONTENT_DIR: './content',
  SESSION_MAX_AGE: 24 * 60 * 60 * 1000  // 24 hodin
};
```

### 4. Spuštění s PM2 (doporučeno)

```bash
# Instalace PM2
npm install -g pm2

# Spuštění aplikace
pm2 start server.js --name zlaty-jelen

# Auto-start po restartu serveru
pm2 startup
pm2 save
```

### 5. Nastavení Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Větší limity pro nahrávání souborů
    client_max_body_size 100M;
}
```

### 6. SSL/HTTPS (doporučeno)

```bash
# Certbot pro Let's Encrypt
sudo certbot --nginx -d your-domain.com
```

### 7. Nastavení touchscreenů pro kiosk režim

**macOS:**
```bash
open -a "Google Chrome" --args --kiosk http://your-domain.com
```

**Linux:**
```bash
chromium-browser --kiosk --incognito http://your-domain.com
```

**Windows:**
```bash
start chrome --kiosk http://your-domain.com
```

### Bezpečnostní checklist

- ✅ Změnit `ACCESS_PASSWORD` v `config.js`
- ✅ Změnit `SESSION_SECRET` v `config.js`
- ✅ Nastavit HTTPS (SSL certifikát)
- ✅ Pravidelné zálohy `content/` složky
- ✅ Firewall pravidla (pokud je to možné)
- ✅ Aktualizace Node.js a npm balíčků

## Nasazení na platformy

### Heroku

```bash
# Přidejte Procfile
echo "web: node server.js" > Procfile

# Deploy
heroku create zlaty-jelen
git push heroku main
```

### DigitalOcean App Platform

1. Připojte GitHub repository
2. Nastavte build command: `npm install`
3. Nastavte run command: `node server.js`
4. Nastavte environment variables v UI

### VPS (DigitalOcean, Linode, atd.)

Postupujte podle kroků 1-7 výše.

## Technologie

- **Backend**: Node.js, Express
- **Frontend**: Vanilla JavaScript, CSS
- **Session management**: express-session
- **Icons**: Font Awesome 6
- **Fonts**: Google Fonts (Crimson Text, Playfair Display)
- **Styling**: Moderní design inspirovaný zlatou barvou expozice

## Struktura projektu

```
.
├── server.js              # Express server
├── config.js              # Konfigurace
├── package.json           # Závislosti
├── README.md              # Tato dokumentace
├── public/                # Statické soubory
│   ├── index.html         # Hlavní aplikace
│   ├── login.html         # Přihlašovací stránka
│   ├── style.css          # Styly
│   └── app.js             # Client-side JavaScript
└── content/               # Obsah expozice
    ├── metadata.json      # Registr všech souborů
    ├── README-METADATA.md # Návod k metadata
    ├── Fotografie/        # Složka s fotografiemi
    ├── Dokumenty/         # Složka s dokumenty
    └── Texty/             # Složka s texty
```

## API Endpointy

- `GET /` - Hlavní aplikace (vyžaduje autentizaci)
- `GET /login` - Přihlašovací stránka
- `POST /login` - Ověření hesla
- `GET /logout` - Odhlášení
- `GET /api/items` - Seznam položek (s filtry: `?category=X&search=Y`)
- `GET /api/categories` - Seznam všech kategorií
- `GET /content/*` - Statické soubory obsahu

## Licence

ISC
