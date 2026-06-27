# Hotel Shift Planner

MVP pro automatické plánování večerních směn v hotelové restauraci a baru.

## Funkce

- **Směny** — šablony směn (název, začátek, konec; délka a pauzy dle DE práva se počítají automaticky)
- **Pravidla obsazenosti** — tabulka hosté → počet zaměstnanců podle role
- **Zaměstnanci** — úvazky, kvalifikace, dostupnost a preference volna
- **Generátor rozpisů** — constraint-based algoritmus s fairness scoringem (50+ zaměstnanců)
- **Týdenní kalendář** — drag & drop pro manuální úpravy
- **Historie** — uložené týdny a přehled zatížení

## Omezení generátoru

- max. 1 směna denně na zaměstnance
- minimální odpočinek 11 h (DE Ruhezeit)
- max. po sobě jdoucích pracovních dní (výchozí 6)
- respektování úvazku a historie směn
- preferování 2 dnů volna po sobě

## Spuštění

```bash
cd ~/Projects/hotel-shift-planner
npm install
npm run db:setup    # migrace + seed (55 zaměstnanců, 4 týdny historie)
npm run dev
```

Otevřete [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Prisma 7 + SQLite
- @dnd-kit pro drag & drop
- Vlastní constraint solver (bez AI)

## Struktura

```
src/
  app/              # stránky a API routes
  components/       # UI (kalendář, DnD)
  lib/
    scheduler/      # generátor směn
    german-labor-law.ts
  types/
prisma/
  schema.prisma     # datový model dle PRD
```

## Fáze vývoje (PRD)

1. **MVP** — generátor směn (aktuální stav)
2. **Fairness engine** — pokročilejší optimalizace a výměny směn
3. **SaaS** — multi-hotel, integrace
