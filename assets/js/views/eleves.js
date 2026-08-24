/* =====================================================================
   views/eleves.js — suivi des élèves : oublis, absences, dispenses
   ===================================================================== */
(function (global) {
  "use strict";

  var recherche = "";
  var classeActive = "";

  /* ================= LISTE ================= */

  function rendre(conteneur) {
    var tous = Store.elevesTries();
    var classes = uniquesClasses(tous);
    var visibles = filtrer(tous);
    var seuil = Number(Store.reglages().seuilAlerte) || 3;
    var alertes = Store.alertes();

    conteneur.innerHTML =
      '<div class="page-head">' +
        "<h1>Élèves</h1>" +
        "<p>" + (tous.length
          ? U.pluriel(tous.length, "élève") + " · " + U.pluriel(classes.length, "classe")
          : "Aucun élève enregistré") +
          (alertes.length ? " · " + alertes.length + " en alerte" : "") + "</p>" +
      "</div>" +

      '<div class="stack">' +
        '<div class="btn-row">' +
          '<button class="btn btn--primary" data-ajout-eleve type="button">' + UI.icone("plus") + "Un élève</button>" +
          '<button class="btn" data-ajout-classe type="button">' + UI.icone("eleves") + "Une classe</button>" +
        "</div>" +
        (tous.length ? UI.barreRecherche("Rechercher un élève…", recherche) : "") +
        (classes.length > 1 ?
        '<div class="chips chips--scroll">' +
          '<button class="chip" type="button" aria-pressed="' + (!classeActive ? "true" : "false") + '" data-classe="">Toutes</button>' +
          classes.map(function (c) {
            return '<button class="chip" type="button" aria-pressed="' + (classeActive === c ? "true" : "false") +
              '" data-classe="' + U.echapper(c) + '">' + U.echapper(c) + "</button>";
          }).join("") +
        "</div>" : "") +
      "</div>" +

      '<section class="section" id="liste-eleves">' + listeHTML(visibles, tous.length, seuil) + "</section>";

    var champRecherche = conteneur.querySelector("[data-recherche]");
    if (champRecherche) {
      champRecherche.addEventListener("input", U.antiRebond(function () {
        recherche = champRecherche.value;
        rafraichirListe(conteneur);
      }, 180));
    }
    U.sur(conteneur, "click", "[data-classe]", function (e, el) {
      classeActive = el.getAttribute("data-classe");
      U.$$("[data-classe]", conteneur).forEach(function (p) {
        p.setAttribute("aria-pressed", p.getAttribute("data-classe") === classeActive ? "true" : "false");
      });
      rafraichirListe(conteneur);
    });
    U.sur(conteneur, "click", "[data-eleve]", function (e, el) { ouvrirFiche(el.getAttribute("data-eleve")); });
    U.sur(conteneur, "click", "[data-ajout-eleve]", function () { ouvrirFormulaire(null); });
    U.sur(conteneur, "click", "[data-ajout-classe]", function () { ouvrirAjoutClasse(); });
  }

  function listeHTML(visibles, total, seuil) {
    if (!total) {
      return UI.vide({
        icone: "eleves",
        titre: "Aucun élève",
        texte: "Ajoutez une classe entière en collant la liste des noms, un par ligne.",
        action: '<button class="btn btn--primary" data-ajout-classe type="button">' +
                UI.icone("plus") + "Ajouter une classe</button>"
      });
    }
    if (!visibles.length) {
      return UI.vide({ icone: "recherche", titre: "Aucun résultat", texte: "Essayez un autre nom ou changez de classe." });
    }
    return U.grouper(visibles, "classe").map(function (groupe) {
      return '<div class="section__head"><h2>' + U.echapper(groupe[0] || "Sans classe") + "</h2>" +
        '<span class="badge">' + U.pluriel(groupe[1].length, "élève") + "</span></div>" +
        '<div class="list">' + groupe[1].map(function (e) { return ligne(e, seuil); }).join("") + "</div>";
    }).join('<div class="divider"></div>');
  }

  function ligne(eleve, seuil) {
    var enAlerte = (eleve.oublis || 0) >= seuil || (eleve.absences || 0) >= seuil || (eleve.dispenses || 0) >= seuil;
    return '<button class="item" type="button" data-eleve="' + eleve.id + '">' +
      '<span class="avatar' + (enAlerte ? " avatar--danger" : "") + '">' + U.echapper(U.initiales(eleve.nom)) + "</span>" +
      '<span class="item__main">' +
        '<span class="item__title">' + U.echapper(eleve.nom) + "</span>" +
        '<span class="tally">' +
          cellule("O", eleve.oublis, seuil) +
          cellule("A", eleve.absences, seuil) +
          cellule("D", eleve.dispenses, seuil) +
        "</span>" +
      "</span>" +
      UI.icone("chevron", "item__chev") +
    "</button>";
  }

  function cellule(lettre, valeur, seuil) {
    valeur = valeur || 0;
    return '<span class="tally__cell' + (valeur >= seuil ? " is-alert" : "") + '">' +
      lettre + " <b>" + valeur + "</b></span>";
  }

  function filtrer(liste) {
    var q = U.normaliser(recherche);
    return liste.filter(function (e) {
      if (classeActive && e.classe !== classeActive) return false;
      if (!q) return true;
      return U.normaliser(e.nom + " " + e.classe).indexOf(q) !== -1;
    });
  }

  function uniquesClasses(liste) {
    var vus = {};
    liste.forEach(function (e) { if (e.classe) vus[e.classe] = 1; });
    return Object.keys(vus).sort(U.comparerClasses);
  }

  function rafraichirListe(conteneur) {
    var zone = conteneur.querySelector("#liste-eleves");
    if (!zone) return;
    var seuil = Number(Store.reglages().seuilAlerte) || 3;
    var tous = Store.elevesTries();
    zone.innerHTML = listeHTML(filtrer(tous), tous.length, seuil);
  }

  /* ================= FICHE ÉLÈVE ================= */

  function ouvrirFiche(id) {
    var eleve = Store.eleves.trouver(id);
    if (!eleve) { UI.toast("Élève introuvable.", "error"); return; }
    var seuil = Number(Store.reglages().seuilAlerte) || 3;

    UI.feuille({
      titre: eleve.nom,
      sousTitre: eleve.classe || "Sans classe",
      corps:
        '<div class="stack">' +
          compteur("oublis", "Oublis de tenue", eleve.oublis || 0, seuil) +
          compteur("absences", "Absences", eleve.absences || 0, seuil) +
          compteur("dispenses", "Dispenses", eleve.dispenses || 0, seuil) +
          '<div id="zone-alerte"></div>' +
          '<div class="divider"></div>' +
          '<div class="btn-row">' +
            '<button class="btn btn--sm" data-modifier type="button">' + UI.icone("crayon") + "Modifier</button>" +
            '<button class="btn btn--sm" data-reset type="button">' + UI.icone("horloge") + "Remettre à zéro</button>" +
          "</div>" +
          '<button class="btn btn--sm btn--ghost" data-supprimer type="button" style="color:var(--danger)">' +
            UI.icone("poubelle") + "Supprimer l'élève</button>" +
        "</div>",
      actions: '<button class="btn btn--primary" data-fermer type="button">Terminé</button>',
      surMontage: function (corps, fermer) {

        function majAffichage() {
          var frais = Store.eleves.trouver(id);
          ["oublis", "absences", "dispenses"].forEach(function (champ) {
            var cellule = corps.querySelector('[data-valeur="' + champ + '"]');
            if (cellule) cellule.textContent = frais[champ] || 0;
          });
          var enAlerte = (frais.oublis || 0) >= seuil || (frais.absences || 0) >= seuil || (frais.dispenses || 0) >= seuil;
          corps.querySelector("#zone-alerte").innerHTML = enAlerte
            ? UI.note("<b>Seuil d'alerte atteint</b> (" + seuil + "). Pensez à prévenir la famille ou la vie scolaire.", "warn")
            : "";
        }

        U.sur(corps, "click", "[data-compteur]", function (e, el) {
          var champ = el.getAttribute("data-compteur");
          var delta = Number(el.getAttribute("data-delta"));
          Store.compteur(id, champ, delta);
          U.vibrer(12);
          majAffichage();
          App.rafraichir({ silencieux: true });
        });

        corps.querySelector("[data-modifier]").addEventListener("click", function () {
          fermer();
          ouvrirFormulaire(Store.eleves.trouver(id));
        });

        corps.querySelector("[data-reset]").addEventListener("click", function () {
          UI.confirmer({
            titre: "Remettre les compteurs à zéro",
            message: "Les oublis, absences et dispenses de " + eleve.nom + " repartiront de zéro.",
            valider: "Remettre à zéro"
          }).then(function (ok) {
            if (!ok) return;
            Store.eleves.modifier(id, { oublis: 0, absences: 0, dispenses: 0 });
            majAffichage();
            UI.toast("Compteurs remis à zéro.");
            App.rafraichir({ silencieux: true });
          });
        });

        corps.querySelector("[data-supprimer]").addEventListener("click", function () {
          UI.confirmer({
            titre: "Supprimer l'élève",
            message: eleve.nom + " et ses compteurs seront définitivement effacés.",
            valider: "Supprimer",
            danger: true
          }).then(function (ok) {
            if (!ok) return;
            Store.eleves.supprimer(id);
            fermer();
            UI.toast("Élève supprimé.");
            App.rafraichir();
          });
        });

        majAffichage();
      },
      surFermeture: function () { App.rafraichir(); }
    });
  }

  function compteur(champ, libelle, valeur, seuil) {
    return '<div class="card card--pad row row--between">' +
      '<div><div style="font-weight:600">' + libelle + "</div>" +
        '<div class="small muted">Alerte à ' + seuil + "</div></div>" +
      '<div class="counter">' +
        '<button class="counter__btn" type="button" data-compteur="' + champ + '" data-delta="-1" aria-label="Retirer un ' + libelle + '">' +
          UI.icone("moins") + "</button>" +
        '<span class="counter__val" data-valeur="' + champ + '">' + valeur + "</span>" +
        '<button class="counter__btn" type="button" data-compteur="' + champ + '" data-delta="1" aria-label="Ajouter un ' + libelle + '">' +
          UI.icone("plus") + "</button>" +
      "</div></div>";
  }

  /* ================= FORMULAIRES ================= */

  function ouvrirFormulaire(eleve) {
    var edition = !!eleve;
    var e = eleve || { nom: "", classe: classeActive || "" };

    UI.feuille({
      titre: edition ? "Modifier l'élève" : "Nouvel élève",
      taille: "sm",
      corps:
        UI.listeOptions("liste-classes-eleves", Store.listeClasses()) +
        UI.champ({ id: "e-nom", label: "Nom et prénom", valeur: e.nom, autofocus: true,
                   placeholder: "Dupont Léa" }) +
        UI.champ({ id: "e-classe", label: "Classe", valeur: e.classe, liste: "liste-classes-eleves",
                   placeholder: "5C" }),
      actions:
        '<button class="btn" data-fermer type="button">Annuler</button>' +
        '<button class="btn btn--primary" data-valider type="button">' + UI.icone("check") + "Enregistrer</button>",
      surMontage: function (corps, fermer, pied) {
        var nom = corps.querySelector("#e-nom");
        var classe = corps.querySelector("#e-classe");

        function valider() {
          if (!nom.value.trim()) { UI.toast("Le nom est obligatoire.", "error"); nom.focus(); return; }
          var donnees = { nom: nom.value.trim(), classe: classe.value.trim() };
          if (edition) {
            Store.eleves.modifier(e.id, donnees);
          } else {
            Store.eleves.ajouter(Object.assign({ oublis: 0, absences: 0, dispenses: 0 }, donnees));
          }
          fermer();
          UI.toast(edition ? "Élève modifié." : "Élève ajouté.");
          App.rafraichir();
        }

        pied.querySelector("[data-valider]").addEventListener("click", valider);
        classe.addEventListener("keydown", function (ev) { if (ev.key === "Enter") valider(); });
      }
    });
  }

  /** Ajout d'une classe entière : un nom par ligne. */
  function ouvrirAjoutClasse() {
    UI.feuille({
      titre: "Ajouter une classe",
      sousTitre: "Un élève par ligne",
      corps:
        UI.listeOptions("liste-classes-lot", Store.listeClasses()) +
        UI.champ({ id: "c-classe", label: "Classe", liste: "liste-classes-lot",
                   placeholder: "5C", autofocus: true, valeur: classeActive }) +
        UI.champ({ id: "c-noms", label: "Élèves", type: "textarea", lignes: 8,
                   placeholder: "Dupont Léa\nMartin Hugo\nBernard Inès",
                   aide: "Collez directement la liste depuis Pronote ou un tableur." }),
      actions:
        '<button class="btn" data-fermer type="button">Annuler</button>' +
        '<button class="btn btn--primary" data-valider type="button">' + UI.icone("check") + "Ajouter</button>",
      surMontage: function (corps, fermer, pied) {
        pied.querySelector("[data-valider]").addEventListener("click", function () {
          var classe = corps.querySelector("#c-classe").value.trim();
          var noms = corps.querySelector("#c-noms").value
            .split(/\r?\n/)
            .map(function (n) { return n.replace(/^\s*[-•*\d.)\t]+\s*/, "").trim(); })
            .filter(Boolean);

          if (!noms.length) { UI.toast("Aucun nom saisi.", "error"); return; }

          var existants = {};
          Store.eleves.tous().forEach(function (el) {
            existants[U.normaliser(el.nom) + "|" + U.normaliser(el.classe)] = 1;
          });

          var ajoutes = 0, ignores = 0;
          noms.forEach(function (nom) {
            if (existants[U.normaliser(nom) + "|" + U.normaliser(classe)]) { ignores++; return; }
            Store.eleves.ajouter({ nom: nom, classe: classe, oublis: 0, absences: 0, dispenses: 0 });
            ajoutes++;
          });

          fermer();
          UI.toast(U.pluriel(ajoutes, "élève") + " ajouté" + (ajoutes > 1 ? "s" : "") +
                   (ignores ? " · " + ignores + " en double ignoré" + (ignores > 1 ? "s" : "") : ""));
          App.rafraichir();
        });
      }
    });
  }

  global.Vues = global.Vues || {};
  global.Vues.eleves = {
    titre: "Élèves",
    sousTitre: "Suivi et alertes",
    onglet: "Élèves",
    icone: "eleves",
    rendre: rendre,
    ouvrirFiche: ouvrirFiche,
    ouvrirFormulaire: ouvrirFormulaire
  };
})(window);
