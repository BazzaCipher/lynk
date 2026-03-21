import { Outlet } from 'react-router-dom';
import { Providers } from '../providers/Providers';
import { Header } from '../components/site/Header';
import { Footer } from '../components/site/Footer';

export function SiteLayout() {
  return (
    <Providers>
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </Providers>
  );
}
