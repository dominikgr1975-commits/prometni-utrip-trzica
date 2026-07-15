# Prometni utrip Tržiča

Pilotna statična spletna aplikacija za prikaz:
- dnevnega prometa na lokaciji CABLEX,
- sestave prometa po vrstah vozil,
- povprečne hitrosti po tipu vozila,
- tedenske zasedenosti sedmih parkirišč,
- preprostega scenarijskega simulatorja.

## Lokalni zagon

Datoteke se zaradi nalaganja JSON podatkov ne sme odpreti samo z dvoklikom. V mapi projekta zaženite:

```powershell
python -m http.server 8000
```

Nato odprite:

```text
http://localhost:8000
```

## GitHub Pages

1. Ustvarite nov GitHub repozitorij.
2. Naložite vse datoteke iz te mape v koren repozitorija.
3. Odprite Settings → Pages.
4. Pri Build and deployment izberite Deploy from a branch.
5. Izberite vejo `main` in mapo `/ (root)`.
6. Shranite. GitHub bo objavil aplikacijo na naslovu `https://UPORABNIK.github.io/IME-REPOZITORIJA/`.

## Struktura

- `index.html` – uporabniški vmesnik
- `styles.css` – izgled aplikacije
- `app.js` – logika, grafi in simulacija
- `data/data.json` – pripravljeni podatki iz Kibane

## Omejitve pilotne različice

Promet je agregiran po dnevih, hitrosti so skupna povprečja po tipu vozila, parkirišča pa po tednih. Simulacija je demonstracijski scenarij. Za zanesljivejšo napoved so potrebni urni ali 15-minutni podatki, kapacitete parkirišč in podatki o prihodih ter odhodih.
