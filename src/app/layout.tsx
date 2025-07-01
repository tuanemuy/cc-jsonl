import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/index.css";

export const metadata: Metadata = {
  title: "CC.jsonl",
  description: "Browse and interact with your Claude Code chat sessions",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CC.jsonl",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextTopLoader color="#e9e6dc" showSpinner={false} />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
