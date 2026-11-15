/**
 * Publisher identity — single source of truth.
 *
 * Consumed by the legal notices, the privacy policy, the cookie banner and
 * the footer.
 *
 * The publisher's social security number and date of birth are deliberately
 * absent from every file: they are only used to validate the affiliate
 * account.
 */
export const siteInfo = {
  siteName: "Travel Style Hub",
  domain: "travelstylehub.com",
  origin: "https://www.travelstylehub.com",

  publisher: {
    name: "Rosie Gardiner",
    role: "Editor and publisher",
    address: {
      line1: "271 Woodcock Hill",
      city: "Harrow",
      region: "",
      postalCode: "HA3 0PG",
      country: "United Kingdom",
    },
    phone: "+44 7012 474297",
    email: "contact@travelstylehub.com",
  },

  hosting: {
    name: "Cloudflare, Inc.",
    address: "101 Townsend Street, San Francisco, CA 94107, United States",
    phone: "+1 (650) 319-8930",
    url: "https://www.cloudflare.com",
  },

  adNetworks: [
    { name: "Metaffiliation (Kwanko network)", role: "Affiliate network — click tracking", tracker: "action.metaffiliation.com (click redirect) and cgl.spartoo.com (click redirect)", duration: "13 months maximum" },
  ],

  analytics: {
    provider: "Google LLC — Google Analytics 4",
    id: "G-JVGNBDNGV8",
  },

  consent: {
    storageKey: "tsh_cookie_consent",
    maxAgeDays: 180,
  },
} as const;

export const publisherAddress = [
  siteInfo.publisher.address.line1,
  siteInfo.publisher.address.city +
    (siteInfo.publisher.address.region
      ? ", " + siteInfo.publisher.address.region
      : "") +
    " " + siteInfo.publisher.address.postalCode,
  siteInfo.publisher.address.country,
].join(", ");
