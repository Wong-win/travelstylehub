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
   * Chargeurs publicitaires : le script de chaque emplacement est inséré
   * dans le conteneur de l'emplacement, et l'appel getSlot n'a lieu qu'une
   * fois ce script effectivement chargé.
   *
   * Deux modes sont possibles :
   *  - data-ad-display : la creative « display » du réseau est chargée dans
   *    une iframe. La requête porte l'identifiant de suivi, elle vaut donc
   *    impression, et le lien de suivi est à l'intérieur de la creative.
   *    Ce mode est privilégié : le SDK abandonne l'affichage d'une création
   *    demandée avant la fin du chargement de la page.
   *  - data-ad-slot + data-ad-loader : le SDK du réseau est chargé et
   *    l'emplacement lui est demandé.
   */
  function loadAds() {
    var slots = Array.prototype.slice.call(document.querySelectorAll("[data-ad-slot], [data-ad-display]"));
    slots.forEach(function (el) {
      if (el.getAttribute("data-ad-loaded") === "1") return;
      el.setAttribute("data-ad-loaded", "1");
      var display = el.getAttribute("data-ad-display");
      if (display) {
        var frame = document.createElement("iframe");
        frame.width = el.getAttribute("data-ad-width") || "728";
        frame.height = el.getAttribute("data-ad-height") || "90";
        frame.setAttribute("frameborder", "0");
        frame.setAttribute("scrolling", "no");
        frame.style.border = "0";
        frame.style.display = "block";
        frame.src = display;
        el.appendChild(frame);
        return;
      }
      var slotId = el.getAttribute("data-ad-slot");
      var loader = document.createElement("script");
      loader.type = "text/javascript";
      loader.async = true;
      loader.src = el.getAttribute("data-ad-loader");
      loader.onload = function () {
        if (typeof window.KwankoSDKLoader === "undefined") return;
        try {
          new window.KwankoSDKLoader.getSlot(slotId);
        } catch (e) {}
      };
      el.appendChild(loader);
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
    if (ads) scheduleLoadAds();
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
