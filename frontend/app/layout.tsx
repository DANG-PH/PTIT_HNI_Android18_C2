import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { TideCloakProvider } from '@tidecloak/nextjs'
import tcConfig from '../tidecloak.json'
import { ProfileOnboarding } from '@/app/components/ProfileOnboarding'
import { Spotlight } from '@/app/components/Spotlight'
import { I18nProvider } from '@/app/lib/i18n'
import './globals.css'

export const metadata: Metadata = {
  title: 'NeedToKnow',
  description: 'An AI assistant for your most private documents. Nobody else holds the key.',
}

const cfg = tcConfig as Record<string, any>

// Runs before first paint so a remembered light/dark choice is applied with no flash.
const themeScript = `(function(){try{var t=localStorage.getItem('ntk.theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <TideCloakProvider config={tcConfig}>
          <I18nProvider>
            {children}
            <ProfileOnboarding baseUrl={String(cfg['auth-server-url'] ?? '').replace(/\/+$/, '')} realm={cfg.realm} />
          </I18nProvider>
        </TideCloakProvider>
        <Spotlight />
      </body>
    </html>
  )
}
