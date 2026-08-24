# Audit du code d'origine

Relevé des problèmes trouvés dans le script Tkinter + SQLite de départ
(`legacy/jarvis-eps-tkinter-original.py.txt`), et de ce qu'en fait la version web.

## Bloquants — le programme ne fonctionne pas en l'état

| # | Problème | Conséquence |
|---|----------|-------------|
| 1 | Guillemets typographiques `“ ”` à la place de `"` (introduits par Word) | `SyntaxError` : le script ne démarre pas |
| 2 | Les tables `cahier_texte` et `eleves` ne sont **jamais créées** — seules `apsa`, `attendus` et `competences_eps` le sont | `sqlite3.OperationalError: no such table` au premier enregistrement de séance ou d'élève |
| 3 | `dictee_vocale()` exécute une boucle `while True` bloquante dans le thread de l'interface | Fenêtre figée pendant toute la dictée ; nécessite en plus le modèle Vosk (~50 Mo) sur le disque |

## Défauts de logique

| # | Problème | Conséquence |
|---|----------|-------------|
| 4 | Les élèves sont identifiés par leur nom : `UPDATE eleves … WHERE nom = ?` | Deux homonymes partagent leurs compteurs ; une suppression en efface deux. La colonne `id` existe mais n'est pas utilisée |
| 5 | `ouvrir_ajout_competence()` insère une fiche **sans** `mots_cles`, alors que c'est ce champ qui déclenche la reconnaissance automatique | Les fiches créées par ce formulaire ne sont jamais proposées en séance |
| 6 | Le contenu saisi est écrasé par une f-string qui y réinjecte contenu prioritaire et attendu | La saisie d'origine est noyée, et les mêmes textes sont dupliqués dans chaque séance |
| 7 | `rechercher_seances()` filtre la variable `resultats` chargée une seule fois à l'ouverture | La recherche porte sur des données périmées après un ajout ou une modification |
| 8 | `voir_statistiques()` s'appelle elle-même après `destroy()` pour se rafraîchir | Fenêtres empilées, position et défilement perdus à chaque clic sur « +1 » |
| 9 | `try: ALTER TABLE … except: pass` (except nu) | Masque toutes les erreurs, y compris celles qui n'ont rien à voir |
| 10 | Les champs `Text` sont lus avec `.get("1.0", tk.END)` sans `.strip()` | Un saut de ligne parasite est stocké à la fin de chaque champ |
| 11 | Aucune validation avant `INSERT` | Une séance entièrement vide peut être enregistrée |
| 12 | Connexions SQLite ouvertes/fermées plusieurs fois par action, sans `with` | Connexion laissée ouverte si une exception survient entre les deux |
| 13 | La table `apsa` est créée mais jamais lue ni écrite | Code mort |
| 14 | Pas de confirmation avant suppression d'une compétence ou d'un attendu (il y en a une pour les séances) | Perte de données sur un clic malheureux |

## Ce que la version web en fait

- **1, 3** — Réécriture complète en HTML/CSS/JavaScript. La dictée passe par la reconnaissance
  vocale du navigateur : rien à installer, et l'interface reste réactive pendant l'écoute.
- **2, 12** — SQLite est remplacé par un stockage local versionné (`assets/js/store.js`) avec
  migration automatique des données existantes et export/import de sauvegarde.
- **4** — Chaque élève, séance et fiche porte un identifiant unique ; les homonymes sont distincts.
- **5** — Un seul formulaire de fiche, avec le champ mots-clés, et une aide qui explique son rôle.
- **6** — Le contenu saisi n'est plus modifié. Les compétences reconnues sont proposées sous forme
  de puces et rangées dans leur propre champ, que l'on peut corriger à la main.
- **7, 8** — Les vues sont redessinées à partir des données courantes après chaque modification.
- **10, 11** — Champs nettoyés (`trim`) et contrôle minimal avant enregistrement.
- **14** — Toute suppression passe par une confirmation explicite.

## Points conservés tels quels

La logique métier d'origine a été portée fidèlement, pas réinventée :

- déduction du cycle à partir de la classe (`trouver_cycle`) ;
- analyse d'une phrase dictée en date / classe / APSA / contenu / observations (`analyser_seance`) ;
- correspondance contenu ↔ compétences par mots-clés, avec la même règle : un mot-clé reconnu
  dans le contenu suffit à proposer la fiche ;
- mise en forme « Contenu prioritaire / Compétence construite / Attendu associé » des exports.
