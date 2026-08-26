import { notFound } from "next/navigation";
import adminConfig from "../../../admin_config.json";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ admin_slug: string }>;
}

export default async function AdminSlugLayout({ children, params }: LayoutProps) {
  const resolvedParams = await params;

  if (resolvedParams.admin_slug !== adminConfig.admin_route_slug) {
    return <>{children}</>;
  }

  return (
    <div className="dark min-h-screen bg-[#080d1a] text-slate-100 font-sans antialiased">
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      {children}
    </div>
  );
}

