import type { Metadata } from "next";

const DEFAULT_SITE_URL = "http://localhost:3000";
const siteUrlValue = (
  process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_SITE_URL
).replace(/\/+$/, "");

function parseSiteUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

export const siteUrl = parseSiteUrl(siteUrlValue);
export const siteName = "Afrigoals";
export const siteDescription =
  "Shop premium sports attire, shoes, and accessories from trusted African vendors at Afrigoals.";
export const defaultOgImage = "/brand/afrigoals-logo.png";

export const noIndexRobots: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}

export function buildMetadata({
  title,
  description = siteDescription,
  path = "/",
  index = true,
  image = defaultOgImage,
  type = "website",
}: {
  title?: string;
  description?: string;
  path?: string;
  index?: boolean;
  image?: string;
  type?: "website" | "article";
}): Metadata {
  const canonicalPath = path || "/";
  const socialTitle = title ? `${title} | ${siteName}` : siteName;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: socialTitle,
      description,
      url: canonicalPath,
      siteName,
      type,
      images: [
        {
          url: image,
          alt: `${siteName} preview image`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [image],
    },
    robots: index ? undefined : noIndexRobots,
  };
}
