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
  window.gtag("consent", "default", {
    analytics_storage: "denied",
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
   */
  function loadAds() {
    var slots = Array.prototype.slice.call(document.querySelectorAll("[data-ad-slot]"));
    slots.forEach(function (el) {
      if (el.getAttribute("data-ad-loaded") === "1") return;
      el.setAttribute("data-ad-loaded", "1");
      var loader = document.createElement("script");
      loader.type = "text/javascript";
      loader.async = true;
      loader.src = el.getAttribute("data-ad-loader");
      loader.onload = function () {
        if (typeof window.KwankoSDKLoader === "undefined") return;
        try {
          new window.KwankoSDKLoader.getSlot(el.getAttribute("data-ad-slot"));
        } catch (e) {}
      };
      el.appendChild(loader);
    });
  }

  /**
   * Supprime les cookies de mesure d'audience déjà déposés (Google les
   * pose en first party sur notre domaine) et le stockage local des réseaux
   * d'affiliation. Indispensable : un signal « Do Not Track » émis après
   * une acceptation doit effacer ce qui a déjà été déposé.
   */
  function purgeOptionalCookies() {
    try {
      var cookies = document.cookie ? document.cookie.split(";") : [];
      cookies.forEach(function (c) {
        var n = c.trim().split("=")[0];
        if (!n) return;
        if (!/^_ga/.test(n) && n !== "_gcs" && !/^kwkn/i.test(n)) return;
        var host = location.hostname.replace(/^www\./, "");
        document.cookie = n + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        document.cookie = n + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + host;
      });
      Object.keys(localStorage).forEach(function (k) {
        if (/^kwkn/i.test(k)) localStorage.removeItem(k);
      });
    } catch (e) {}
  }

  function applyConsent(c) {
    if (!c) return;
    if (c.analytics) {
      window.gtag("consent", "update", { analytics_storage: "granted" });
      loadAnalytics();
    } else {
      window.gtag("consent", "update", { analytics_storage: "denied" });
    }
    if (c.advertising) {
      window.gtag("consent", "update", {
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted"
      });
      loadAds();
    } else {
      window.gtag("consent", "update", {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      });
    }
  }

  applyConsent(window.TSH_CONSENT.get());

  // Signal « Do Not Track » / « Global Privacy Control » : refus mémorisé,
  // aucun bandeau, aucun traceur facultatif chargé.
  if (!window.TSH_CONSENT.get() && privacySignalRequested()) {
    window.TSH_CONSENT.set({ necessary: true, analytics: false, advertising: false });
    purgeOptionalCookies();
  } else if (window.TSH_CONSENT.get() && privacySignalRequested()) {
    // Le signal a été émis après une acceptation : on efface ce qui a déjà
    // été déposé et on passe en refus.
    window.TSH_CONSENT.set({ necessary: true, analytics: false, advertising: false });
    purgeOptionalCookies();
  }

  window.addEventListener("tsh:consent-changed", function (e) {
    applyConsent(e.detail);
  });
})();
`;
