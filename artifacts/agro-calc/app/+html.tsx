import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#2D6A4F" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{
          __html: `
            html, body, #root {
              overflow-x: hidden !important;
              max-width: 100vw !important;
              width: 100%;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              -webkit-text-size-adjust: 100%;
            }
            input, textarea, select {
              font-size: 16px !important;
            }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
