import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { TideCloakProvider } from '@tidecloak/nextjs'
import tcConfig from '../tidecloak.json'
import { ProfileOnboarding } from '@/app/components/ProfileOnboarding'
import './globals.css'

export const metadata: Metadata = {
  title: 'NeedToKnow',
  description: 'An AI assistant for your most private documents. Nobody else holds the key.',
}

const cfg = tcConfig as Record<string, any>

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TideCloakProvider config={tcConfig}>
          {children}
          <ProfileOnboarding baseUrl={String(cfg['auth-server-url'] ?? '').replace(/\/+$/, '')} realm={cfg.realm} />
        </TideCloakProvider>
      </body>
    </html>
  )
}
