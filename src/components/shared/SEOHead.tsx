import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description?: string;
}

export function SEOHead({ title, description }: SEOHeadProps) {
  const fullTitle = `${title} | FinTrack`;
  const desc = description ?? "Track expenses, manage budgets, and monitor your personal finances with FinTrack.";

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
    </Helmet>
  );
}
