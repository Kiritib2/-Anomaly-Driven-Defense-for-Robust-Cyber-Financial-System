import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-mesh-dark">
      <Sidebar />
      <main className="flex-1 ml-72">
        <Navbar />
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
