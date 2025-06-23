"use client";
import { ThStoreProvider, ThPreferencesProvider } from "@edrlab/thorium-web/epub";
import React from "react";
import "./globals.css";

export const runtime = "edge";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThStoreProvider>
          <ThPreferencesProvider>
            {children}
          </ThPreferencesProvider>
        </ThStoreProvider>
      </body>
    </html>
  );
}
