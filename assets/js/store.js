/* =====================================================================
   store.js — persistance locale
   Remplace SQLite : tout est stocké dans le navigateur du professeur.
   Aucune donnée ne quitte le téléphone (RGPD : les élèves sont nommés).
   ===================================================================== */
(function (global) {
  "use strict";

  var CLE = "jarvis-eps";
  var VERSION = 1;

  var vide = {
    version: VERSION,
    seances: [],
    evenements: [],
    eleves: [],
    competences: [],
    attendus: [],
    reglages: {
      theme: "auto",          // auto | clair | sombre
      seuilAlerte: 3,         // nb d'oublis/absences/dispenses déclenchant une alerte
      enseignant: "",
      etablissement: "",
      baseInitialisee: false,
      codeEmpreinte: "",        // empreinte du code d'accès (jamais le code lui-même)
      codeGrain: "",
      codeAlgo: "",
      codeInitialise: false,
      delaiVerrou: 60000,       // reverrouillage après ce temps en arrière-plan
      derniereSauvegarde: "",
      rappelReporteAu: ""
    }
  };

  var etat = null;
  var abonnes = [];
  var dernierEchec = null;

  /* ---------- Lecture / écriture ---------- */

  function lire() {
    try {
      var brut = localStorage.getItem(CLE);
      if (!brut) return clone(vide);
      var donnees = JSON.parse(brut);
      return migrer(donnees);
    } catch (e) {
      dernierEchec = e;
      return clone(vide);
    }
  }

  function ecrire() {
    try {
      localStorage.setItem(CLE, JSON.stringify(etat));
      dernierEchec = null;
      return true;
    } catch (e) {
      // Quota dépassé ou stockage bloqué (navigation privée) : on prévient.
      dernierEchec = e;
      if (global.UI && UI.toast) {
        UI.toast("Sauvegarde impossible : espace de stockage plein ou navigation privée.", "error", 6000);
      }
      return false;
    }
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /** Complète les données anciennes avec les champs manquants. */
  function migrer(donnees) {
    var base = clone(vide);
    if (!donnees || typeof donnees !== "object") return base;
    ["seances", "evenements", "eleves", "competences", "attendus"].forEach(function (t) {
      if (Array.isArray(donnees[t])) base[t] = donnees[t];
    });
    if (donnees.reglages && typeof donnees.reglages === "object") {
      Object.keys(base.reglages).forEach(function (k) {
        if (donnees.reglages[k] !== undefined) base.reglages[k] = donnees.reglages[k];
      });
    }
    base.version = VERSION;
    return base;
  }

  function notifier() {
    abonnes.forEach(function (fn) { fn(etat); });
  }

  /** Écrit puis prévient les vues. */
  function valider() {
    var ok = ecrire();
    notifier();
    return ok;
  }

  /* ---------- API générique de collection ---------- */

  function collection(nom) {
    return {
      tous: function () { return etat[nom].slice(); },

      trouver: function (id) {
        return etat[nom].filter(function (e) { return e.id === id; })[0] || null;
      },

      ajouter: function (objet) {
        var maintenant = new Date().toISOString();
        var enregistrement = Object.assign({}, objet, {
          id: objet.id || U.uid(),
          creeLe: maintenant,
          majLe: maintenant
        });
        etat[nom].push(enregistrement);
        valider();
        return enregistrement;
      },

      modifier: function (id, champs) {
        var enregistrement = this.trouver(id);
        if (!enregistrement) return null;
        Object.assign(enregistrement, champs, { majLe: new Date().toISOString() });
        valider();
        return enregistrement;
      },

      supprimer: function (id) {
        var avant = etat[nom].length;
        etat[nom] = etat[nom].filter(function (e) { return e.id !== id; });
        var supprime = etat[nom].length < avant;
        if (supprime) valider();
        return supprime;
      },

      remplacer: function (liste) {
        etat[nom] = liste;
        valider();
      },

      compter: function () { return etat[nom].length; }
    };
  }

  /* ---------- Objet public ---------- */

  var Store = {
    CLE: CLE,

    init: function () {
      etat = lire();
      return Store;
    },

    etat: function () { return etat; },

    abonner: function (fn) {
      abonnes.push(fn);
      return function () {
        abonnes = abonnes.filter(function (f) { return f !== fn; });
      };
    },

    /* Collections (créées après init) */
    seances: null,
    evenements: null,
    eleves: null,
    competences: null,
    attendus: null,

    /* ---- Réglages ---- */
    reglages: function () { return etat.reglages; },

    majReglages: function (champs) {
      Object.assign(etat.reglages, champs);
      valider();
      return etat.reglages;
    },

    /* ---- Séances : tri et filtres ---- */
    seancesTriees: function () {
      return etat.seances.slice().sort(function (a, b) {
        if (a.date === b.date) return (b.creeLe || "").localeCompare(a.creeLe || "");
        return (b.date || "").localeCompare(a.date || "");
      });
    },

    /* ---- Événements ---- */
    evenementsTries: function () {
      return etat.evenements.slice().sort(function (a, b) {
        var ka = (a.date || "") + " " + (a.heure || "24:00");
        var kb = (b.date || "") + " " + (b.heure || "24:00");
        return ka.localeCompare(kb);
      });
    },

    /* ---- Élèves ---- */
    elevesTries: function () {
      return etat.eleves.slice().sort(function (a, b) {
        var c = U.comparerClasses(a.classe, b.classe);
        return c !== 0 ? c : U.normaliser(a.nom).localeCompare(U.normaliser(b.nom), "fr");
      });
    },

    /** Élèves ayant atteint le seuil d'alerte sur au moins un compteur. */
    alertes: function () {
      var seuil = Number(etat.reglages.seuilAlerte) || 3;
      return etat.eleves.filter(function (e) {
        return (e.oublis || 0) >= seuil || (e.absences || 0) >= seuil || (e.dispenses || 0) >= seuil;
      }).sort(function (a, b) {
        var sa = (a.oublis || 0) + (a.absences || 0) + (a.dispenses || 0);
        var sb = (b.oublis || 0) + (b.absences || 0) + (b.dispenses || 0);
        return sb - sa;
      });
    },

    /** Incrémente un compteur en le bornant à zéro. */
    compteur: function (idEleve, champ, delta) {
      var eleve = Store.eleves.trouver(idEleve);
      if (!eleve) return null;
      var valeur = Math.max(0, (Number(eleve[champ]) || 0) + delta);
      return Store.eleves.modifier(idEleve, (function () {
        var o = {}; o[champ] = valeur; return o;
      })());
    },

    /* ---- Listes dérivées (pour les menus déroulants) ---- */
    listeClasses: function () {
      var vues = {};
      etat.eleves.forEach(function (e) { if (e.classe) vues[e.classe.trim()] = 1; });
      etat.seances.forEach(function (s) { if (s.classe) vues[s.classe.trim()] = 1; });
      return Object.keys(vues).sort(U.comparerClasses);
    },

    listeActivites: function () {
      var vues = {};
      etat.seances.forEach(function (s) { if (s.activite) vues[s.activite.trim()] = 1; });
      etat.competences.forEach(function (c) { if (c.apsa) vues[c.apsa.trim()] = 1; });
      etat.attendus.forEach(function (a) { if (a.apsa) vues[a.apsa.trim()] = 1; });
      return Object.keys(vues).sort(function (a, b) {
        return U.normaliser(a).localeCompare(U.normaliser(b), "fr");
      });
    },

    /* ---- Sauvegarde / restauration ---- */
    exporterJSON: function () {
      return JSON.stringify({
        application: "Jarvis EPS",
        version: VERSION,
        exporteLe: new Date().toISOString(),
        donnees: etat
      }, null, 2);
    },

    /**
     * Restaure une sauvegarde.
     * mode "remplacer" : écrase tout. mode "fusionner" : ajoute ce qui manque.
     */
    importerJSON: function (texte, mode) {
      var lu = JSON.parse(texte);
      var donnees = lu && lu.donnees ? lu.donnees : lu;
      if (!donnees || typeof donnees !== "object") throw new Error("Fichier illisible.");
      var entrant = migrer(donnees);

      if (mode === "fusionner") {
        ["seances", "evenements", "eleves", "competences", "attendus"].forEach(function (t) {
          var connus = {};
          etat[t].forEach(function (e) { connus[e.id] = 1; });
          entrant[t].forEach(function (e) {
            if (!e.id || !connus[e.id]) etat[t].push(Object.assign({}, e, { id: e.id || U.uid() }));
          });
        });
      } else {
        etat = entrant;
      }
      valider();
      return {
        seances: etat.seances.length,
        eleves: etat.eleves.length,
        competences: etat.competences.length,
        attendus: etat.attendus.length
      };
    },

    toutEffacer: function () {
      etat = clone(vide);
      valider();
    },

    /** Volume approximatif occupé, affiché dans les réglages. */
    poids: function () {
      try {
        var octets = new Blob([JSON.stringify(etat)]).size;
        return octets < 1024 ? octets + " o"
             : octets < 1048576 ? (octets / 1024).toFixed(1) + " Ko"
             : (octets / 1048576).toFixed(1) + " Mo";
      } catch (e) { return "—"; }
    },

    stockageDisponible: function () {
      try {
        localStorage.setItem("__test__", "1");
        localStorage.removeItem("__test__");
        return true;
      } catch (e) { return false; }
    },

    dernierEchec: function () { return dernierEchec; }
  };

  Store.init();
  Store.seances = collection("seances");
  Store.evenements = collection("evenements");
  Store.eleves = collection("eleves");
  Store.competences = collection("competences");
  Store.attendus = collection("attendus");

  global.Store = Store;
})(window);
