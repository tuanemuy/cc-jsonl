import type { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
  fullHeight?: boolean;
}

export function PageLayout({ children, fullHeight = false }: PageLayoutProps) {
  return (
    <main
      className={`${
        fullHeight ? "h-screen flex flex-col" : "min-h-screen"
      } bg-background`}
    >
      {children}
    </main>
  );
}
