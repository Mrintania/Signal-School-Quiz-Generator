// frontend/src/App.js
import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  createRoutesFromElements
} from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CreateQuizPage from './pages/CreateQuizPage';
import LibraryPage from './pages/LibraryPage';
import QuizResultPage from './pages/QuizResultPage';
import ViewQuizPage from './pages/ViewQuizPage';
import { QuizProvider } from './context/QuizContext'; // ต้องมีการ import QuizProvider

// Create router
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      <Route index element={<HomePage />} />
      <Route path="create" element={<CreateQuizPage />} />
      <Route path="result" element={<QuizResultPage />} />
      <Route path="library" element={<LibraryPage />} />
      <Route path="view/:id" element={<ViewQuizPage />} />
      <Route path="*" element={<div className="p-5 text-center">ไม่พบหน้าที่ต้องการ</div>} />
    </Route>
  )
);

function App() {
  return (
    <QuizProvider> {/* ครอบ RouterProvider ด้วย QuizProvider */}
      <RouterProvider 
        router={router}
      />
    </QuizProvider>
  );
}

export default App;