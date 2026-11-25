# Kostky – Score Tracker

Jednoduchá webová aplikace pro počítání skóre v kouličkové hře (KCD styl).

## Pravidla

- **Výhra přesně na 10 000** – musí se trefit přesně, přehod = 0 bodů
- **Minimál na zápis: 500 bodů** – hod pod 500 se nezapíše (0)
- **Poslední 500 bodů** – pokud do výhry zbývá méně než 500, minimál neplatí, platí cokoliv ≤ zbývajícím bodům
- **Body**: 3×stejné = číslo×100, další stejná ×2 (4× = ×2, 5× = ×4), 1 = 1000/2000/4000, páry = číslo×100

## Ovládání

- **Enter** v poli „Body“ → přidá kolo a automaticky posune na dalšího hráče
- **,** (čárka) → otevře nastavení
- Klik na jméno hráče v tabulce → přejmenování
- Tlačítko **Nastavení** v horní liště → výherní body, minimál na zápis
- Tlačítko **Téma** → přepínání světlý/tmavý režim
- Tlačítko **+ Hráč** → přidání hráče

## Technicky

- 3 soubory: `kostky.html`, `kostky.css`, `kostky.js`
- Žádné závislosti (pouze Google Fonts)
- Data v `localStorage` – uložená pouze v prohlížeči/zařízení
- Funguje offline po prvním načtení

## Spuštění

```bash
cd kostky
python3 -m http.server 8765
# otevřít http://localhost:8765/kostky.html
```

Nebo prostě otevřít `kostky.html` v prohlížeči.