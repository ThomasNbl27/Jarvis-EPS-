# Jarvis EPS

Assistant pédagogique pour professeur d'EPS : **cahier de texte, suivi des élèves et base de
compétences**, dans une application web qui s'installe sur le téléphone et fonctionne
**hors connexion**.

Version web du script Python (Tkinter + SQLite) d'origine, conservé dans [`legacy/`](legacy/)
et analysé dans [`AUDIT.md`](AUDIT.md).

---

## Ouvrir l'application

Une fois GitHub Pages activé (voir plus bas) :

> **https://thomasnbl27.github.io/Jarvis-EPS-/**

Rien à installer, aucun compte, aucun serveur : tout tient dans le navigateur.

### L'installer sur le téléphone

- **iPhone (Safari)** : ouvrir le lien → bouton **Partager** → *Sur l'écran d'accueil*.
- **Android (Chrome)** : ouvrir le lien → menu **⋮** → *Installer l'application*.

Elle apparaît alors comme une application normale, en plein écran, et fonctionne
**sans réseau** — utile au gymnase ou au stade.

---

## Ce que fait l'application

### Cahier de texte
- Séance = date, classe, activité (APSA), contenu, compétences, observations.
- Le **cycle est déduit automatiquement** de la classe : `6B` → Cycle 3, `4C` → Cycle 4,
  `2nde 5` → Lycée Général, `1 CAP MEC` → Lycée Pro.
- Recherche plein texte et filtres par classe ou par activité, séances groupées par mois.

### Dictée vocale
Bouton **« Dicter toute la séance »** : on parle, l'application remplit les champs.

> « Ajoute une séance aujourd'hui pour les 5C en handball, travail sur la passe et le
> démarquage, pas d'observation »

donne : date = aujourd'hui · classe = 5C · cycle = Cycle 4 · activité = Handball ·
contenu = « Travail sur la passe et le démarquage » · observations = « Aucune ».

Dates reconnues : *aujourd'hui*, *hier*, *demain*, un jour de la semaine, `12/03`, `12 mars 2026`.
Un micro est également disponible sur chaque champ texte.

*La dictée utilise la reconnaissance vocale du navigateur : elle fonctionne sur Chrome
(Android, ordinateur) et Safari récent, et demande une connexion. Sans elle, le micro du
clavier du téléphone fait le même travail.*

### Compétences proposées automatiquement
Chaque fiche de la base EPS porte des **mots-clés**. Dès qu'un de ces mots apparaît dans le
contenu d'une séance, la fiche correspondante est proposée sous forme de puce : un appui
l'ajoute au compte rendu. C'est la règle du script d'origine, rendue visible et corrigeable.

### Suivi des élèves
- Ajout d'une classe entière en collant la liste des noms, un par ligne.
- Compteurs **oublis / absences / dispenses**, avec `+` et `−`.
- **Alerte automatique** au-delà d'un seuil réglable (3 par défaut), signalée par une pastille
  sur l'onglet Élèves et sur l'accueil.

### Base EPS
Fiches de compétences (APSA, cycle, contenu prioritaire, mots-clés, compétence construite,
attendu associé) et attendus de fin de cycle. Créer, modifier, supprimer, rechercher.

Une douzaine de fiches d'**exemple** sont fournies au premier lancement pour montrer le
mécanisme. Elles sont marquées « Exemple » et **doivent être adaptées** : ce ne sont pas les
textes officiels du programme, seulement des modèles de départ.

### Exports
| Format | Usage |
|---|---|
| **PDF** | Via l'impression du système → *Enregistrer au format PDF*. Mise en page A4 soignée |
| **Word** (`.doc`) | S'ouvre dans Word, Pages ou Google Docs, et reste modifiable |
| **CSV** | Pour Excel, Numbers ou LibreOffice (séparateur `;`, accents corrects) |
| **Sauvegarde JSON** | Copie complète des données, à restaurer ou à transférer sur un autre téléphone |

Le cahier peut être exporté en entier ou classe par classe. Sur téléphone, une séance peut
aussi être envoyée directement par message via le bouton **Partager**.

---

## Où sont les données ?

**Dans le navigateur du téléphone, et nulle part ailleurs.** Aucune donnée n'est envoyée sur
un serveur — ce qui compte, puisque des noms d'élèves sont enregistrés.

Deux conséquences pratiques :

- **Effacer les données du site ou désinstaller l'application supprime tout.**
- Un autre appareil ou un autre navigateur = des données différentes.

👉 **Télécharger une sauvegarde régulièrement** (Réglages → *Télécharger une sauvegarde*),
et la conserver dans le cloud ou par mail. C'est aussi la manière de changer de téléphone.

La navigation privée bloque l'enregistrement : l'application prévient si c'est le cas.

---

## Activer le lien (GitHub Pages)

À faire une fois, par le propriétaire du dépôt :

1. Fusionner cette branche dans `main`.
2. Dépôt → **Settings** → **Pages**.
3. *Source* : **Deploy from a branch** → branche `main`, dossier `/ (root)` → **Save**.
4. Attendre une minute : l'adresse s'affiche en haut de la page.

Un workflow est également fourni dans `.github/workflows/pages.yml` si l'on préfère l'option
*Source : GitHub Actions*.

---

## Organisation du code

```
index.html                    ossature de la page
manifest.webmanifest          installation sur l'écran d'accueil
sw.js                         service worker : fonctionnement hors connexion
assets/css/app.css            design system (thème clair/sombre, mobile d'abord)
assets/js/
  utils.js                    dates, texte, DOM
  store.js                    stockage local, sauvegarde, restauration
  seed.js                     fiches d'exemple
  eps.js                      cycle, analyse de la dictée, mots-clés
  speech.js                   reconnaissance vocale
  ui.js                       icônes, panneaux, notifications, champs
  exports.js                  PDF, Word, CSV, sauvegarde
  views/                      accueil, séances, élèves, base EPS, réglages
  app.js                      navigation, thème, démarrage
legacy/                       code Python d'origine (référence)
AUDIT.md                      problèmes relevés dans ce code et corrections apportées
```

Aucune dépendance, aucun outil de construction : ce sont des fichiers statiques, modifiables
directement dans GitHub.

---

## Personnaliser

- **Ajouter une APSA reconnue à la dictée** : `assets/js/eps.js`, tableau `APSA` (nom, variantes
  entendues, champ d'apprentissage).
- **Changer les couleurs** : `assets/css/app.css`, bloc `:root` en haut du fichier.
- **Modifier les fiches d'exemple** : `assets/js/seed.js`.
- **Nom de l'enseignant et de l'établissement sur les exports** : dans l'application, Réglages.

Après toute modification, incrémenter `CACHE` dans `sw.js` pour que les téléphones
récupèrent bien la nouvelle version.
