import type { Metadata } from "next";
import { themeBootstrap } from "@/lib/theme";
import "@fontsource/noto-sans-devanagari/400.css";
import "@fontsource/noto-sans-telugu/400.css";
import "@fontsource/noto-sans-tamil/400.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "Margin · A little more understanding",
  description:
    "A research reading desk. Understand technical words in context, with English and your native language side by side.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
