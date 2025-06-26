import NextLink from "next/link";
import { Button } from "@/components/ui/button";
import { ToggleTheme } from "@/components/navigation/ToggleTheme";
import { Logo } from "@/components/brand/Logo";
import { ChevronLeft } from "lucide-react";

interface PageLayoutProps {
  children: React.ReactNode;
  returnTo?: string;
  fixHeader?: boolean;
}

export function PageLayout({
  children,
  returnTo,
  fixHeader = false,
}: PageLayoutProps) {
  return (
    <div className="bg-background">
      <header
        className={`z-2 flex items-center justify-between h-14 w-full px-4 sm:px-6 bg-primary text-primary-foreground shadow ${fixHeader ? "fixed top-0 left-0 right-0" : "sticky top-0"}`}
      >
        <div className="flex items-center gap-2">
          {returnTo && (
            <Button
              onClick={() => window.history.back()}
              aria-label="Back"
              variant="outline"
              size="icon"
              asChild
            >
              <NextLink href={returnTo}>
                <ChevronLeft />
              </NextLink>
            </Button>
          )}
          <h1 className="text-lg font-semibold">
            <Logo className="h-6 [&_path]:fill-primary-foreground" />
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ToggleTheme />
        </div>
      </header>
      <main className="relative z-1">{children}</main>
    </div>
  );
}
