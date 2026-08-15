import { lazy, Suspense } from 'react';
import { AppShell } from './components/AppShell';
import { LoadingState } from './components/DataState';
import { useRouter } from './router';

const OverviewPage = lazy(() => import('./pages/OverviewPage').then((module) => ({ default: module.OverviewPage })));
const ShowDetailPage = lazy(() => import('./pages/ShowDetailPage').then((module) => ({ default: module.ShowDetailPage })));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage').then((module) => ({ default: module.ReviewsPage })));
const MemberSalesPage = lazy(() => import('./pages/MemberSalesPage').then((module) => ({ default: module.MemberSalesPage })));
const TrendDetailPage = lazy(() => import('./pages/TrendDetailPage').then((module) => ({ default: module.TrendDetailPage })));

export default function App() {
  const { pathname } = useRouter();
  let page = <OverviewPage />;
  if (/^\/shows\/\d+$/.test(pathname)) page = <ShowDetailPage />;
  else if (pathname === '/reviews') page = <ReviewsPage />;
  else if (pathname === '/members') page = <MemberSalesPage />;
  else if (pathname === '/trends') page = <TrendDetailPage />;
  return <AppShell><Suspense fallback={<div className="page"><LoadingState /></div>}>{page}</Suspense></AppShell>;
}
