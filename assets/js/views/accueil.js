/* =====================================================================
   views/accueil.js — tableau de bord
   ===================================================================== */
(function (global) {
  "use strict";

  function salutation() {
    var h = new Date().getHours();
    if (h < 6) return "Bonne nuit";
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  }

  function rendre(conteneur) {
    var seances = Store.seancesTriees();
    var eleves = Store.elevesTries();
    var alertes = Store.alertes();
    var classes = Store.listeClasses();
    var reglages = Store.reglages();
    var recentes = seances.slice(0, 3);

    var moisCourant = U.aujourdhui().slice(0, 7);
    var seancesDuMois = seances.filter(function (s) { return (s.date || "").slice(0, 7) === moisCourant; });

    conteneur.innerHTML =
      /* ---- Bandeau ---- */
      '<section class="hero">' +
        '<p class="hero__eyebrow">' + U.echapper(U.dateAvecJour(U.aujourdhui())) + "</p>" +
        "<h1>" + salutation() + (reglages.enseignant ? " " + U.echapper(reglages.enseignant.split(" ")[0]) : "") + "</h1>" +
        "<p>" + (seancesDuMois.length
            ? U.pluriel(seancesDuMois.length, "séance") + " notée" + (seancesDuMois.length > 1 ? "s" : "") + " ce mois-ci."
            : "Aucune séance notée ce mois-ci.") +
          (alertes.length ? " " + U.pluriel(alertes.length, "élève") + " à surveiller." : "") + "</p>" +
        '<div class="hero__actions">' +
          '<button class="btn btn--primary" data-action="nouvelle-seance" type="button">' +
            UI.icone("plus") + "Nouvelle séance</button>" +
          (Voix.disponible()
            ? '<button class="btn btn--ghost" data-action="dicter-seance" type="button">' + UI.icone("micro") + "Dicter</button>"
            : "") +
        "</div>" +
      "</section>" +

      /* ---- Chiffres clés ---- */
      '<section class="section">' +
        '<div class="stats">' +
          tuile(seances.length, "Séances", "accent") +
          tuile(eleves.length, "Élèves", "") +
          tuile(classes.length, "Classes", "") +
          tuile(alertes.length, "Alertes", alertes.length ? "danger" : "") +
        "</div>" +
      "</section>" +

      /* ---- Alertes ---- */
      (alertes.length ?
      '<section class="section">' +
        '<div class="section__head"><h2>Élèves à surveiller</h2>' +
          '<button class="link" data-aller="eleves" type="button">Tout voir</button></div>' +
        '<div class="list">' +
          alertes.slice(0, 4).map(ligneAlerte).join("") +
        "</div>" +
      "</section>" : "") +

      /* ---- Dernières séances ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Dernières séances</h2>' +
          (seances.length > 3 ? '<button class="link" data-aller="seances" type="button">Tout voir</button>' : "") +
        "</div>" +
        (recentes.length
          ? '<div class="list">' + recentes.map(Vues.seances.ligne).join("") + "</div>"
          : UI.vide({
              icone: "seances",
              titre: "Le cahier est vide",
              texte: "Ajoutez votre première séance : à la main ou à la voix, en quelques secondes.",
              action: '<button class="btn btn--primary" data-action="nouvelle-seance" type="button">' +
                      UI.icone("plus") + "Ajouter une séance</button>"
            })) +
      "</section>" +

      /* ---- Raccourcis ---- */
      '<section class="section">' +
        '<div class="section__head"><h2>Raccourcis</h2></div>' +
        '<div class="list">' +
          raccourci("imprimer", "Imprimer / PDF", "Le cahier de texte, prêt à rendre", "imprimer-cahier") +
          raccourci("base", "Base EPS", Store.competences.compter() + " fiches de compétences", "aller:base") +
          raccourci("export", "Sauvegarder mes données", "Fichier de secours à conserver", "sauvegarder") +
        "</div>" +
      "</section>";

    /* ---- Interactions ---- */
    U.sur(conteneur, "click", "[data-aller]", function (e, el) {
      App.aller(el.getAttribute("data-aller"));
    });
    U.sur(conteneur, "click", "[data-raccourci]", function (e, el) {
      var quoi = el.getAttribute("data-raccourci");
      if (quoi === "imprimer-cahier") Exports.imprimerSeances();
      else if (quoi === "sauvegarder") Exports.sauvegarder();
      else if (quoi.indexOf("aller:") === 0) App.aller(quoi.slice(6));
    });
    U.sur(conteneur, "click", "[data-eleve]", function (e, el) {
      Vues.eleves.ouvrirFiche(el.getAttribute("data-eleve"));
    });
    U.sur(conteneur, "click", "[data-seance]", function (e, el) {
      Vues.seances.ouvrirDetail(el.getAttribute("data-seance"));
    });
  }

  function tuile(valeur, libelle, variante) {
    return '<div class="stat' + (variante ? " stat--" + variante : "") + '">' +
      '<span class="stat__value">' + valeur + "</span>" +
      '<span class="stat__label">' + libelle + "</span></div>";
  }

  function ligneAlerte(eleve) {
    var seuil = Number(Store.reglages().seuilAlerte) || 3;
    return '<button class="item" type="button" data-eleve="' + eleve.id + '">' +
      '<span class="avatar avatar--danger">' + U.echapper(U.initiales(eleve.nom)) + "</span>" +
      '<span class="item__main">' +
        '<span class="item__title">' + U.echapper(eleve.nom) + "</span>" +
        '<span class="item__meta">' +
          '<span class="badge badge--outline">' + U.echapper(eleve.classe || "—") + "</span>" +
          cellule("Oublis", eleve.oublis, seuil) +
          cellule("Absences", eleve.absences, seuil) +
          cellule("Dispenses", eleve.dispenses, seuil) +
        "</span>" +
      "</span>" +
      UI.icone("chevron", "item__chev") +
    "</button>";
  }

  function cellule(libelle, valeur, seuil) {
    valeur = valeur || 0;
    if (!valeur) return "";
    return '<span class="badge' + (valeur >= seuil ? " badge--danger" : "") + '">' +
      libelle + " " + valeur + "</span>";
  }

  function raccourci(ico, titre, sousTitre, action) {
    return '<button class="item" type="button" data-raccourci="' + action + '">' +
      '<span class="avatar avatar--accent">' + UI.icone(ico) + "</span>" +
      '<span class="item__main">' +
        '<span class="item__title">' + U.echapper(titre) + "</span>" +
        '<span class="item__sub">' + U.echapper(sousTitre) + "</span>" +
      "</span>" +
      UI.icone("chevron", "item__chev") +
    "</button>";
  }

  global.Vues = global.Vues || {};
  global.Vues.accueil = {
    titre: "Jarvis EPS",
    sousTitre: "Assistant pédagogique",
    onglet: "Accueil",
    icone: "accueil",
    rendre: rendre
  };
})(window);
