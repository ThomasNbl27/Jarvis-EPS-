/* =====================================================================
   views/reglages.js — exports, sauvegarde, préférences, aide
   ===================================================================== */
(function (global) {
  "use strict";

  function rendre(conteneur) {
    var r = Store.reglages();
    var classes = Store.listeClasses();

    conteneur.innerHTML =
      '<div class="page-head">' +
        "<h1>Réglages</h1>" +
        "<p>Exports, sauvegarde et préférences</p>" +
      "</div>" +

      /* ---- Exports ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Exporter le cahier de texte</h2></div>' +
        '<div class="stack">' +
          (classes.length > 1 ?
            UI.champ({ id: "x-classe", label: "Limiter à une classe", type: "select", valeur: "",
                       options: [{ valeur: "", libelle: "Toutes les classes" }].concat(classes) }) : "") +
          '<div class="list">' +
            action("document", "Export PDF", "Onglet dédié : période, classe, options", "aller-pdf") +
            action("document", "Document Word", "Fichier .doc modifiable dans Word, Pages ou Google Docs", "word-seances") +
            action("tableur", "Tableur (CSV)", "S'ouvre dans Excel, Numbers ou LibreOffice", "csv-seances") +
          "</div>" +
        "</div>" +
      "</section>" +

      '<section class="section">' +
        '<div class="section__head"><h2>Exporter le suivi des élèves</h2></div>' +
        '<div class="list">' +
          action("document", "PDF du suivi", "Tableau récapitulatif par classe", "pdf-eleves") +
          action("document", "Document Word", "Tableau des oublis, absences et dispenses", "word-eleves") +
          action("tableur", "Tableur (CSV)", "Pour vos propres calculs", "csv-eleves") +
        "</div>" +
      "</section>" +

      /* ---- Sauvegarde ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Sauvegarde</h2></div>' +
        '<div class="stack">' +
          UI.note("Les données sont enregistrées <b>dans ce navigateur uniquement</b>. " +
                  "Téléchargez une sauvegarde régulièrement : elle sert à restaurer ou à changer de téléphone.", "warn") +
          '<div class="list">' +
            action("export", "Télécharger une sauvegarde", "Fichier .json contenant tout", "sauvegarder") +
            action("import", "Restaurer une sauvegarde", "Depuis un fichier .json", "restaurer") +
          "</div>" +
          '<input type="file" id="fichier-restauration" accept="application/json,.json" hidden>' +
          '<p class="small muted">Espace utilisé : ' + Store.poids() + " · " +
            Store.seances.compter() + " séances · " + Store.eleves.compter() + " élèves · " +
            Store.competences.compter() + " fiches · " + Store.attendus.compter() + " attendus</p>" +
        "</div>" +
      "</section>" +

      /* ---- Préférences ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Préférences</h2></div>' +
        '<div class="stack">' +
          UI.champ({ id: "p-enseignant", label: "Enseignant", valeur: r.enseignant,
                     placeholder: "Nom affiché sur les exports" }) +
          UI.champ({ id: "p-etablissement", label: "Établissement", valeur: r.etablissement,
                     placeholder: "Collège Jean Moulin" }) +
          UI.champ({ id: "p-seuil", label: "Seuil d'alerte élève", type: "number", valeur: r.seuilAlerte,
                     attributs: ' min="1" max="20" step="1"',
                     aide: "Nombre d'oublis, d'absences ou de dispenses déclenchant une alerte." }) +
          UI.champ({ id: "p-theme", label: "Apparence", type: "select", valeur: r.theme,
                     options: [
                       { valeur: "auto", libelle: "Automatique (système)" },
                       { valeur: "clair", libelle: "Clair" },
                       { valeur: "sombre", libelle: "Sombre" }
                     ] }) +
        "</div>" +
      "</section>" +

      /* ---- Base d'exemples ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Base de démarrage</h2></div>' +
        '<div class="list">' +
          action("etincelle", "Réinjecter les fiches d'exemple", "Ajoute les fiches fournies avec l'application", "exemples") +
        "</div>" +
      "</section>" +

      /* ---- Installation ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Installer sur le téléphone</h2></div>' +
        '<div class="card card--pad stack">' +
          '<p class="small">Ouvrez ce lien dans le navigateur du téléphone, puis :</p>' +
          '<p class="small muted"><b>iPhone (Safari)</b> : bouton Partager → « Sur l\'écran d\'accueil ».<br>' +
          '<b>Android (Chrome)</b> : menu ⋮ → « Installer l\'application ».</p>' +
          '<button class="btn btn--primary" id="btn-installer" type="button" hidden>' +
            UI.icone("telephone") + "Installer maintenant</button>" +
          '<p class="small muted">L\'application fonctionne ensuite <b>hors connexion</b>, même au gymnase.</p>' +
        "</div>" +
      "</section>" +

      /* ---- Zone sensible ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Zone sensible</h2></div>' +
        '<button class="btn btn--danger btn--block" data-effacer type="button">' +
          UI.icone("poubelle") + "Effacer toutes les données</button>" +
      "</section>" +

      '<p class="small muted" style="margin-top:32px;text-align:center">Jarvis EPS · version ' +
        U.echapper(App.VERSION) + '<br>Données locales, aucun compte, aucun serveur.</p>';

    brancher(conteneur);
  }

  function action(ico, titre, sousTitre, cle) {
    return '<button class="item" type="button" data-do="' + cle + '">' +
      '<span class="avatar avatar--accent">' + UI.icone(ico) + "</span>" +
      '<span class="item__main">' +
        '<span class="item__title">' + U.echapper(titre) + "</span>" +
        '<span class="item__sub">' + U.echapper(sousTitre) + "</span>" +
      "</span>" + UI.icone("chevron", "item__chev") + "</button>";
  }

  function brancher(conteneur) {
    var selecteurClasse = conteneur.querySelector("#x-classe");
    var filtre = function () {
      return selecteurClasse && selecteurClasse.value ? { classe: selecteurClasse.value } : {};
    };
    var titre = function () {
      return selecteurClasse && selecteurClasse.value
        ? "Cahier de texte EPS — " + selecteurClasse.value
        : "Cahier de texte EPS";
    };

    U.sur(conteneur, "click", "[data-do]", function (e, el) {
      switch (el.getAttribute("data-do")) {
        case "aller-pdf":    App.aller("pdf"); break;
        case "word-seances": Exports.exporterWordSeances(filtre(), titre()); break;
        case "csv-seances":  Exports.exporterCSVSeances(filtre()); break;
        case "pdf-eleves":
          try { U.telecharger("suivi-eleves-" + U.aujourdhui() + ".pdf", Vues.pdf.documentEleves()); UI.toast("PDF créé."); }
          catch (err) { UI.toast("Création du PDF impossible.", "error"); }
          break;
        case "word-eleves":  Exports.exporterWordEleves(); break;
        case "csv-eleves":   Exports.exporterCSVEleves(); break;
        case "sauvegarder":  Exports.sauvegarder(); break;
        case "restaurer":    conteneur.querySelector("#fichier-restauration").click(); break;
        case "exemples":     reinjecterExemples(); break;
      }
    });

    /* Restauration */
    conteneur.querySelector("#fichier-restauration").addEventListener("change", function (e) {
      var fichier = e.target.files && e.target.files[0];
      if (!fichier) return;
      var lecteur = new FileReader();
      lecteur.onload = function () {
        choisirModeRestauration(String(lecteur.result));
        e.target.value = "";
      };
      lecteur.onerror = function () { UI.toast("Lecture du fichier impossible.", "error"); };
      lecteur.readAsText(fichier);
    });

    /* Préférences : enregistrement au fil de la saisie */
    var lien = function (id, cle, transformer) {
      var champ = conteneur.querySelector("#" + id);
      if (!champ) return;
      champ.addEventListener("change", function () {
        var valeur = transformer ? transformer(champ.value) : champ.value;
        Store.majReglages((function () { var o = {}; o[cle] = valeur; return o; })());
        if (cle === "theme") App.appliquerTheme();
        UI.toast("Préférence enregistrée.");
        if (cle === "seuilAlerte") App.rafraichir({ silencieux: true });
      });
    };
    lien("p-enseignant", "enseignant");
    lien("p-etablissement", "etablissement");
    lien("p-seuil", "seuilAlerte", function (v) { return Math.max(1, Math.min(20, Number(v) || 3)); });
    lien("p-theme", "theme");

    /* Installation PWA */
    var boutonInstaller = conteneur.querySelector("#btn-installer");
    if (App.invitationInstallation) {
      boutonInstaller.hidden = false;
      boutonInstaller.addEventListener("click", function () {
        App.invitationInstallation.prompt();
        App.invitationInstallation = null;
        boutonInstaller.hidden = true;
      });
    }

    /* Effacement */
    U.sur(conteneur, "click", "[data-effacer]", function () {
      UI.confirmer({
        titre: "Tout effacer",
        message: "Séances, élèves et base EPS seront définitivement supprimés de ce navigateur. " +
                 "Téléchargez d'abord une sauvegarde si besoin.",
        valider: "Tout effacer",
        danger: true
      }).then(function (ok) {
        if (!ok) return;
        Store.toutEffacer();
        UI.toast("Données effacées.");
        App.aller("accueil");
      });
    });
  }

  function choisirModeRestauration(texte) {
    UI.feuille({
      titre: "Restaurer la sauvegarde",
      taille: "sm",
      corps: '<p class="detail__text">Comment souhaitez-vous intégrer ce fichier ?</p>' +
        UI.note("<b>Fusionner</b> conserve vos données actuelles et ajoute ce qui manque. " +
                "<b>Remplacer</b> écrase tout par le contenu du fichier."),
      actions:
        '<button class="btn" data-fusionner type="button">Fusionner</button>' +
        '<button class="btn btn--danger" data-remplacer type="button">Remplacer</button>',
      surMontage: function (corps, fermer, pied) {
        function restaurer(mode) {
          try {
            var bilan = Store.importerJSON(texte, mode);
            fermer();
            UI.toast(bilan.seances + " séances, " + bilan.eleves + " élèves restaurés.");
            App.aller("accueil");
          } catch (err) {
            fermer();
            UI.toast("Fichier invalide : " + err.message, "error", 5000);
          }
        }
        pied.querySelector("[data-fusionner]").addEventListener("click", function () { restaurer("fusionner"); });
        pied.querySelector("[data-remplacer]").addEventListener("click", function () { restaurer("remplacer"); });
      }
    });
  }

  function reinjecterExemples() {
    UI.confirmer({
      titre: "Réinjecter les exemples",
      message: "Les fiches d'exemple seront ajoutées à votre base actuelle (sans rien supprimer).",
      valider: "Ajouter"
    }).then(function (ok) {
      if (!ok) return;
      var n = Seed.reinjecter();
      UI.toast(n + " fiches ajoutées.");
      App.rafraichir();
    });
  }

  global.Vues = global.Vues || {};
  global.Vues.reglages = {
    titre: "Réglages",
    sousTitre: "Exports et sauvegarde",
    onglet: "Réglages",
    icone: "reglages",
    rendre: rendre
  };
})(window);
