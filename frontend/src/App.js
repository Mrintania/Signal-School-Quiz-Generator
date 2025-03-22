import React, { Suspense, lazy } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  createRoutesFromElements
} from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Import Providers Wrapper
import Providers from './context/Providers';

// Import Layout Component
import Layout from './components/Layout';
import LoadingOverlay from './components/LoadingOverlay';

// Lazy-loaded pages for better performance
const HomePage = lazy(() => import('./pages/HomePage'));
const CreateQuizPage = lazy(() => import('./pages/CreateQuizPage'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const QuizResultPage = lazy(() => import('./pages/QuizResultPage'));
const ViewQuizPage = lazy(() => import('./pages/ViewQuizPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));

// Loading fallback
const LoadingFallback = () => <LoadingOverlay isLoading={true} message="Loading page..." />;

// Create router with suspense
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      <Route index element={
        <Suspense fallback={<LoadingFallback />}>
          <HomePage />
        </Suspense>
      } />
      <Route path="create" element={
        <Suspense fallback={<LoadingFallback />}>
          <CreateQuizPage />
        </Suspense>
      } />
      <Route path="result" element={
        <Suspense fallback={<LoadingFallback />}>
          <QuizResultPage />
        </Suspense>
      } />
      <Route path="library" element={
        <Suspense fallback={<LoadingFallback />}>
          <LibraryPage />
        </Suspense>
      } />
      <Route path="view/:id" element={
        <Suspense fallback={<LoadingFallback />}>
          <ViewQuizPage />
        </Suspense>
      } />
      <Route path="account" element={
        <Suspense fallback={<LoadingFallback />}>
          <AccountPage />
        </Suspense>
      } />
      <Route path="*" element={
        <div className="container py-5 text-center">
          <h1>404 - Page Not Found</h1>
          <p>The page you are looking for does not exist or has been moved.</p>
          <a href="/" className="btn btn-primary">Go Home</a>
        </div>
      } />
    </Route>
  )
);

function App() {
  return (
    <Providers>
      <RouterProvider 
        router={router} 
        future={{
          v7_startTransition: true
        }}
      />
    </Providers>
  );
}

export default App;