import type { Metadata, Viewport } from 'next';
import './globals.css';
import '../components/audio-player.css';
import { SesionProvider } from '../components/Sesion';

export const metadata: Metadata = {
  title: '24 más — Guía para llevar el duelo',
  description: '24 más, cada día tiene su propio afán. Guía para llevar el duelo en 40 días, de Juan Pablo Mata, con la narración del autor.',
};

export const viewport: Viewport = {
  themeColor: '#F5F2EC',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <SesionProvider>{children}</SesionProvider>
        <footer className="pie">
          <p>
            <strong>24 más</strong> · Juan Pablo Mata
          </p>
          <p>Apostolado Católico Hechos · BienCatólicos</p>
        </footer>
      </body>
    </html>
  );
}
