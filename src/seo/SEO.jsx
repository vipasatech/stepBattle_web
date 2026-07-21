import { Helmet } from "react-helmet-async";
import { SEO_DEFAULTS } from "./defaults";
import {
  organizationSchema,
  websiteSchema,
  softwareSchema,
} from "./schema";

const SITE_URL = SEO_DEFAULTS.siteUrl;
const SITE_NAME = SEO_DEFAULTS.siteName;

export default function SEO({
  title,
  description,
  keywords,
  image = SEO_DEFAULTS.defaultImage,
  url = SITE_URL,
  type = "website",
  robots = "index, follow",
}) {
  const pageTitle = title
    ? `${title} | ${SITE_NAME}`
    : SEO_DEFAULTS.defaultTitle;

  const pageDescription =
    description || SEO_DEFAULTS.defaultDescription;

  const pageKeywords =
    keywords || SEO_DEFAULTS.defaultKeywords;

  return (
    <Helmet>
      <title>{pageTitle}</title>

      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      <meta name="robots" content={robots} />

      <link rel="canonical" href={url} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={image} />

      <meta name="theme-color" content={SEO_DEFAULTS.themeColor} />

      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>

      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>

      <script type="application/ld+json">
        {JSON.stringify(softwareSchema)}
      </script>
    </Helmet>
  );
}