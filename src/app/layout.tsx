import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { THEME_STORAGE_KEY } from "@/lib/theme"

export const metadata: Metadata = {
  title: "Humanverse",
  description: "Post what actually happened. The professional network for everything that doesn't fit on a professional profile.",
}

const themeScript = `
  (function () {
    try {
      var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
      var theme = stored === 'dark' ? 'dark' : 'light';
      var root = document.documentElement;
      if (theme === 'dark') root.classList.add('dark');
      root.style.colorScheme = theme;
    } catch (e) {}
  })();
`

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
