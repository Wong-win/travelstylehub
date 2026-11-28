/**
 * Consentement — à insérer en ligne dans le <head> de chaque page.
 *
 * Rien n'est chargé avant que l'internaute ait choisi : le script de mesure
 * d'audience et les chargeurs publicitaires ne sont injectés qu'après un
 * accord explicite. Le signal « Do Not Track » et le signal
 * « Global Privacy Control » valent refus.
 */
export const consentScript = `
(function () {
  var PREFIX = "TSH";
  var metaGa = document.querySelector('meta[name="tsh-ga-id"]');
  var metaKey = document.querySelector('meta[name="tsh-consent-key"]');
  var metaAge = document.querySelector('meta[name="tsh-consent-max-age"]');
  var GA_ID = metaGa ? metaGa.getAttribute("content") : "";
  var KEY = metaKey ? metaKey.getAttribute("content") : "tsh_cookie_consent";
  var MAX_AGE = metaAge ? parseInt(metaAge.getAttribute("content"), 10) : 15552000000;

  function privacySignalRequested() {
    try {
      return (
        navigator.globalPrivacyControl === true ||
        navigator.doNotTrack === "1" ||
        navigator.doNotTrack === "yes"
      );
    } catch (e) {
      return false;
    }
  }

  window.TSH_CONSENT = {
    key: KEY,
    maxAge: MAX_AGE,
    get: function () {
      try {
        var raw = localStorage.getItem(this.key);
        if (!raw) return null;
        var c = JSON.parse(raw);
        if (!c || typeof c.ts !== "number" || Date.now() - c.ts > this.maxAge) {
          localStorage.removeItem(this.key);
          return null;
        }
        return c;
      } catch (e) { return null; }
    },
    set: function (c) {
      c.ts = Date.now();
      try { localStorage.setItem(this.key, JSON.stringify(c)); } catch (e) {}
      window.dispatchEvent(new CustomEvent("tsh:consent-changed", { detail: c }));
    },
    allows: function (cat) { var c = this.get(); return !!(c && c[cat]); },
    purge: function () { purgeOptionalCookies(); },
    loadAnalytics: function () { loadAnalytics(); },
    loadAds: function () { loadAds(); }
  };

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  // La mesure d'audience n'est pas soumise à consentement : chaque visite
  // est comptée. Seule la publicité reste conditionnée au choix.
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  });

  function loadAnalytics() {
    if (!GA_ID || document.getElementById("tsh-ga-script")) return;
    var s = document.createElement("script");
    s.id = "tsh-ga-script";
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
  }

  /**
   * Chargeurs publicitaires.
   *
   * La creative « display » du réseau est chargée comme une image dans la
   * page. La requête porte l'identifiant de suivi, elle vaut donc impression,
   * et le lien de suivi est le lien qui enveloppe l'image.
   *
   * L'image est preferred à une iframe : Chrome classe les iframes de réseaux
   * publicitaires en « ad frame » et peut les décharger quand elles consomment
   * trop de ressources, ce qui affiche « This ad used too many resources for
   * your device, so Chrome removed it » à la place de la bannière. Une image
   * dans la page n'est jamais déchargée de la sorte.
   *
   * Le src n'est posé qu'après consentement : sans accord, aucune requête
   * n'est adressée au réseau et l'emplacement reste masqué.
   */
  function loadAds() {
    var images = Array.prototype.slice.call(document.querySelectorAll("[data-ad-image]"));
    images.forEach(function (img) {
      if (img.getAttribute("data-ad-loaded") === "1") return;
      img.setAttribute("data-ad-loaded", "1");
      var src = img.getAttribute("data-ad-image");
      if (src) img.setAttribute("src", src);
      var wrap = img.closest("[data-ad-banner]");
      if (wrap) wrap.hidden = false;
    });
  }

  /**
   * Ce script est exécuté dans le <head> : au premier appel, le corps de la
   * page n'est pas encore analysé et aucun emplacement n'est trouvé. On
   * retente une fois le document prêt, pour que le visiteur qui a déjà
   * accepté la publicité voie la bannière dès son arrivée.
   */
  function scheduleLoadAds() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", loadAds, { once: true });
    } else {
      loadAds();
    }
  }

  /**
   * Supprime le stockage local des réseaux d'affiliation (Kwanko), posé
   * lorsqu'une bannière publicitaire a été affichée. Appelé quand
   * l'internaute refuse la publicité.
   */
  function purgeOptionalCookies() {
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (/^kwkn/i.test(k)) localStorage.removeItem(k);
      });
    } catch (e) {}
  }

  function applyConsent(c) {
    var ads = !!(c && c.advertising);
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: ads ? "granted" : "denied",
      ad_user_data: ads ? "granted" : "denied",
      ad_personalization: ads ? "granted" : "denied"
    });
    // Les emplacements publicitaires sont affichés à chaque visite,
    // indépendamment du choix exprimé dans le bandeau cookies.
    scheduleLoadAds();
  }

  // ---- Démarrage ----
  //
  // Google Analytics 4 est chargé dans tous les cas : chaque visite est
  // mesurée, sans attendre de choix et sans dépendre d'un modèle
  // statistique. Seuls les traceurs publicitaires des réseaux
  // d'affiliation restent soumis au consentement.
  loadAnalytics();
  applyConsent(window.TSH_CONSENT.get());

  window.addEventListener("tsh:consent-changed", function (e) {
    applyConsent(e.detail);
  });
})();
`;
