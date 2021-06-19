import { Handler, HandlerResponse } from "@netlify/functions";

const getHeaderIgnoreCase = (
  headers: Record<string, string | undefined>,
  name: string
) =>
  (Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase()
  ) ?? [])?.[1];

const crawlerRegex = new RegExp(
  "(Discourse Forum Onebox|baiduspider|twitterbot|facebookexternalhit|facebot|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|SocialFlow|Net::Curl::Simple|Snipcart|Googlebot|outbrain|pinterestbot|pinterest/0|slackbot|vkShare|W3C_Validator|redditbot|Mediapartners-Google|AdsBot-Google|parsely|DuckDuckBot|whatsapp|Hatena|Screaming Frog SEO Spider|bingbot|Sajaribot|DashLinkPreviews|Discordbot|RankSonicBot|lyticsbot|YandexBot/|YandexWebmaster/|naytev-url-scraper|newspicksbot/|Swiftbot/|mattermost|Applebot/|snapchat|viber|proximic|iframely/|upday|Google Web Preview)"
);

interface TemplateData {
  url: string;
  image: {
    url: string;
    width?: number;
    height?: number;
  };
}

const pageTemplate = ({ url, image }: TemplateData): string => `
<!DOCTYPE>
<html>
<head>
  <meta property="og:title" content="KalkSpace Draw Tool" />
  <meta property="og:description" content="Zeichnung erstellt mit draw.kalk.space" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${image.url}" />
  ${
    image.width
      ? `<meta property="og:image:width" content="${image.width}" />`
      : ""
  }
  ${
    image.height
      ? `<meta property="og:image:height" content="${image.height}" />`
      : ""
  }
</head>
<body></body>
</html>
`;

export const handler: Handler = async (event): Promise<HandlerResponse> => {
  const { s: encodedProject } = event.queryStringParameters ?? {};

  if (!encodedProject) {
    return {
      statusCode: 400,
      body: "Missing image data",
    };
  }

  if (event.httpMethod === "HEAD") {
    return {
      statusCode: 200,
    };
  }

  const appUrl = new URL(`https://${event.headers.host}/`);
  appUrl.pathname = "/";
  appUrl.hash = `#s=${encodedProject}`;

  const userAgent = getHeaderIgnoreCase(event.headers, "User-Agent");
  if (!userAgent || !crawlerRegex.test(userAgent)) {
    console.info("User Agent was not a crawler", { userAgent });
    return {
      statusCode: 301,
      headers: {
        Location: appUrl.toString(),
      },
    };
  }

  const imageUrl = new URL(`https://${event.headers.host}/`);
  imageUrl.pathname = "/export";
  const params = new URLSearchParams();
  params.set("s", encodedProject);
  params.set("type", "png");
  imageUrl.search = params.toString();

  const data = {
    url: appUrl.toString(),
    image: {
      url: imageUrl.toString(),
    },
  };
  const page = pageTemplate(data);

  return {
    statusCode: 200,
    body: page,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  };
};
