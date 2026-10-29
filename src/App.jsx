import { useEffect, useState } from 'react';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';

const route = () => (location.hash.startsWith('#/dashboard') ? 'dashboard' : 'landing');

export default function App() {
  const [page, setPage] = useState(route());
  useEffect(() => {
    const on = () => { setPage(route()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return page === 'dashboard' ? <Dashboard /> : <Landing />;
}
