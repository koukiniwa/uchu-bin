import './globals.css'
import Header from './Header'

export const metadata = {
  title: '宇宙便 - 宇宙開発ニュース',
  description: 'ロケット・衛星・企業の最新ニュースを見やすく',
  openGraph: {
    title: '宇宙便',
    description: 'ロケット・衛星・企業の最新ニュースを見やすく',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-white text-gray-800">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-12">
          {children}
        </main>
        <footer className="border-t border-gray-200 py-8 mt-16">
          <div className="max-w-4xl mx-auto px-4 text-center text-gray-600">
            <p>&copy; 2026 宇宙便. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
