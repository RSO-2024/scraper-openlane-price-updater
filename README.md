
# Scraper OpenLane Price Updater

**Kratek opis:**  
Aplikacija za posodabljanje cen na platformi OpenLane. Razvita z uporabo **TypeScript**, **Selenium** in **Docker**.

## 📁 Arhitektura projekta  
- **/src:** Izvorna koda projekta.

## ⚙️ Navodila za uporabo  
**Namestitev odvisnosti:**  
```bash
npm install
```

**Zagon aplikacije (lokalno):**  
```bash
npm run dev
```

**Gradnja Docker slike:**  
```bash
docker build -t scraper-openlane-price-updater .
```

**Zagon aplikacije v Dockerju:**  
```bash
docker run -p 3000:3000 scraper-openlane-price-updater
```

## 👥 Avtorji  
- **Gašper Pistotnik**  
- **Martin Korelič**  
- **Jakob Adam Šircelj**