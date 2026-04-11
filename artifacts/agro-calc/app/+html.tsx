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
            html, body {
              overflow-x: hidden;
              max-width: 100vw;
              overscroll-behavior-x: none;
              margin: 0;
              padding: 0;
              -webkit-text-size-adjust: 100%;
            }
            input, textarea, select {
              font-size: 16px !important;
            }
          `
        }} />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function () {
              function lockHScroll() {
                if (window.scrollX !== 0) {
                  window.scrollTo(0, window.scrollY);
                }
              }

              window.addEventListener('scroll', lockHScroll, { passive: true });

              document.addEventListener('focusin', function(e) {
                var tag = e.target && e.target.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
                  setTimeout(lockHScroll, 50);
                  setTimeout(lockHScroll, 200);
                  setTimeout(lockHScroll, 500);
                }
              }, true);

              if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', lockHScroll);
                window.visualViewport.addEventListener('scroll', lockHScroll);
              }
            })();
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
