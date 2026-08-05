import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import ChatWidget from './ChatWidget';

function BuyerLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-[#fdfbf8] to-[#fdfbf8]">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pt-24 md:pt-28 pb-24 md:pb-12">
        <Outlet />
      </main>
      <BottomNav />
      <ChatWidget />
    </div>
  );
}

export default BuyerLayout;