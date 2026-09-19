import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CRITIC | Socratic AI Critical Thinking Platform',
  description: 'Gamified casefile educational platform empowering high school students through Socratic inquiry and AI scaffolding.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
