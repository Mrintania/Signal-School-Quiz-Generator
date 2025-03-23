import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { setupGlobalErrorHandler } from './utils/globalErrorHandler';


// Setup global error handler
setupGlobalErrorHandler();

// จากการดูโค้ดของคุณ พบว่าคุณไม่ได้ใช้ createBrowserRouter
// แต่ใช้ BrowserRouter ใน App.js ดังนั้นเราต้องแก้ไขใน App.js แทน

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();