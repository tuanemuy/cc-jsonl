import type { Metadata } from "next";
import "@/styles/index.css";

export const metadata: Metadata = {
  title: "Claude Code Chat Logs",
  description: "Browse and interact with your Claude Code chat sessions",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
