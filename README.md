# 🎲 Betclic WC Bet Bot v2

Bot Discord de paris pour la Coupe du Monde 2026 — Betclic.

---

## Fonctionnalités

| Feature | Détail |
|---|---|
| 3 niveaux de pari | Chill (2 pts) / Joueur (4 pts) / Vraiiiment joueur (8 pts) |
| Boost quotidien | 1 boost/jour/membre → double les points sur 1 pari |
| Fermeture automatique | La barre passe au rouge, boutons désactivés, titre → (Fermé) |
| Cotes indicatives | Affichées en italique sous chaque choix |
| Image dans l'embed | URL optionnelle passée à `/create-match` |
| Classement | `/classement` général ou du jour |
| Attribution des points | `/set-result` → crédite automatiquement les gagnants |

---

## Variables d'environnement Railway

```
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_GUILD_ID=...
DATA_DIR=/app/data
```

> ⚠️ Crée un Volume Railway monté sur `/app/data` pour la persistance des données.

---

## Commandes slash

### `/create-match` (Admin)
Crée un pari pour un match.

| Option | Requis | Description |
|---|---|---|
| `titre` | ✅ | Nom du match (ex: Mexique vs Afrique du Sud) |
| `fermeture` | ✅ | Date/heure de fermeture : `YYYY-MM-DD HH:MM` (heure Paris) |
| `choix1_label` | ✅ | Libellé du Choix 1 (ex: Victoire Mexique) |
| `choix1_cote` | ✅ | Cote indicative Betclic (ex: 2,10) |
| `choix2_label` | ✅ | Libellé du Choix 2 |
| `choix2_cote` | ✅ | Cote indicative |
| `choix3_label` | ✅ | Libellé du Choix 3 |
| `choix3_cote` | ✅ | Cote indicative |
| `image` | ❌ | URL de l'image à afficher dans l'embed |
| `channel` | ❌ | Channel cible (défaut : courant) |

**Exemple :**
```
/create-match titre:Mexique vs Afrique du Sud fermeture:2026-06-11 20:45 choix1_label:Victoire Mexique choix1_cote:2,10 choix2_label:Match nul choix2_cote:3,20 choix3_label:Victoire Afrique du Sud choix3_cote:4,30 image:https://...
```

### `/set-result` (Admin)
Définit le choix gagnant et crédite les points.
- Le bot ferme automatiquement le pari si ce n'est pas déjà fait.
- La barre de l'embed passe au rouge, les boutons sont désactivés.

### `/classement`
Affiche le top 20.
- `général` : cumul de tous les matchs
- `aujourd'hui` : points gagnés sur les matchs du jour

---

## Système de boost

- Chaque membre a **1 boost disponible par jour** (reset à minuit UTC).
- Le boost **double les points potentiels** sur 1 seul pari.
- Si un membre change de pari après avoir boosté, le boost reste consommé pour la journée.

---

## Déploiement

```bash
# 1. Push sur GitHub
git init && git add . && git commit -m "init"
git remote add origin https://github.com/TOI/betclic-wc-bot.git
git push -u origin main

# 2. Railway : connecter le repo, ajouter les env vars, créer un Volume /app/data

# 3. Déployer les commandes (1 seule fois ou après modification)
npm run deploy
```

---

## Architecture des données (`data/db.json`)

```json
{
  "matches": {
    "match_1234": {
      "id": "match_1234",
      "title": "Mexique vs Afrique du Sud",
      "status": "open",
      "closingTimeUTC": "2026-06-11T19:45:00.000Z",
      "closingTimeLabel": "11/06/2026 21:45",
      "choice1Label": "Victoire Mexique",
      "choice1Odds": "2,10",
      ...
      "imageUrl": "https://...",
      "channelId": "...",
      "messageId": "...",
      "result": null
    }
  },
  "bets": {
    "match_1234": {
      "userId123": { "choice": 2, "boosted": false, "points": null }
    }
  },
  "users": {
    "userId123": { "totalPoints": 12, "boostUsedToday": "2026-06-11", "username": "Jules" }
  }
}
```
