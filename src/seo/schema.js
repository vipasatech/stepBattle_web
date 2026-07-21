import { SEO_DEFAULTS } from "./defaults";

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SEO_DEFAULTS.siteName,
  url: SEO_DEFAULTS.siteUrl,
  logo: SEO_DEFAULTS.defaultImage,
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SEO_DEFAULTS.siteName,
  url: SEO_DEFAULTS.siteUrl,
};

export const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SEO_DEFAULTS.siteName,
  applicationCategory: "HealthApplication",
  operatingSystem: "Android, iOS, Web",
  description: SEO_DEFAULTS.defaultDescription,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
  },
};