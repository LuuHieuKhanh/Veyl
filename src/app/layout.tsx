import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Veyl — Talk. Disappear.',
  description: 'Anonymous temporary chat rooms. No accounts. No history. Just conversations. Riêng tư tuyệt đối.',
  keywords: 'chat an danh, chat realtime, veyl chat, tin nhan tu huy, anonymous chat, real-time messaging',
  authors: [{ name: 'Veyl Dev Team' }],
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark h-full antialiased" style={{ colorScheme: 'dark' }}>
      <head>
        {/* Load Inter typography and Google Material Symbols Outlined stylesheet */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full bg-background text-on-background flex flex-col antialiased selection:bg-primary-container/30">
        {children}
      </body>
    </html>
  );
}
