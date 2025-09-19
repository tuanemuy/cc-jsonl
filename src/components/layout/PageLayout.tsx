"use client";

import { ChevronLeft, MessageCirclePlus } from "lucide-react";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { ToggleTheme } from "@/components/navigation/ToggleTheme";
import { Button } from "@/components/ui/button";

interface PageLayoutProps {
  children: React.ReactNode;
  returnTo?: string;
  back?: boolean;
  cwd?: string;
}

export function PageLayout({
  children,
  returnTo,
  back = false,
  cwd,
}: PageLayoutProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col h-dvh bg-background">
      <header
        className={
          "z-2 flex shrink-0 grow-0 items-center justify-between h-14 w-full px-4 sm:px-6 bg-primary text-primary-foreground shadow"
        }
      >
        <div className="flex items-center gap-2">
          {returnTo && (
            <Button aria-label="Back" variant="default" size="icon" asChild>
              <NextLink href={returnTo}>
                <ChevronLeft />
              </NextLink>
            </Button>
          )}
          {!returnTo && back && (
            <Button
              onClick={() => router.back()}
              aria-label="Back"
              variant="default"
              size="icon"
            >
              <ChevronLeft />
            </Button>
          )}
          <h1 className="text-lg font-semibold">
            <Logo className="h-6 [&_path]:fill-primary-foreground" />
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <NextLink
              href={cwd ? `/sessions/new?cwd=${cwd}` : "/sessions/new"}
              aria-label="New Session"
            >
              <MessageCirclePlus />
            </NextLink>
          </Button>
          <ToggleTheme />
        </div>
      </header>
      <main className="relative z-1 shrink-1 grow-1 overflow-y-scroll">
        {children}
      </main>
    </div>
  );
}

export function HeaderPadding() {
  return <div className="h-14 sm:h-16" />;
}
