import { notFound } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ admin_slug: string }>;
}

export default async function AdminSlugLayout({ children, params }: LayoutProps) {
  const resolvedParams = await params;
  const adminRouteSlug = process.env.NEXT_PUBLIC_ADMIN_ROUTE_SLUG;

  if (!adminRouteSlug) {
    console.error('[MakInvoices Admin] NEXT_PUBLIC_ADMIN_ROUTE_SLUG is not set in environment variables. The admin panel will not be accessible. Set this variable and restart the dev server.');
  }

  if (resolvedParams.admin_slug !== adminRouteSlug) {
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

