export const metadata = {
  title: 'WiBiz AI Video Audit Tool v2',
  description: 'AI-powered brand audit for WiBiz video content',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#080c10' }}>
        {children}
      </body>
    </html>
  );
}