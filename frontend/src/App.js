import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  createRoutesFromElements
} from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Context Provider
import { QuizProvider } from './context/QuizContext';

// Layout Component
import Layout from './components/Layout';

// Pages
import HomePage from './pages/HomePage';
import CreateQuizPage from './pages/CreateQuizPage';
import LibraryPage from './pages/LibraryPage';
import QuizResultPage from './pages/QuizResultPage';
import ViewQuizPage from './pages/ViewQuizPage';

// สร้าง router ใหม่โดยใช้ createBrowserRouter
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      <Route index element={<HomePage />} />
      <Route path="create" element={<CreateQuizPage />} />
      <Route path="result" element={<QuizResultPage />} />
      <Route path="library" element={<LibraryPage />} />
      <Route path="view/:id" element={<ViewQuizPage />} />
    </Route>
  )
);

function App() {
  return (
    <QuizProvider>
      <RouterProvider 
        router={router} 
        future={{
          v7_startTransition: true
        }}
      />
    </QuizProvider>
  );
}

export default App;