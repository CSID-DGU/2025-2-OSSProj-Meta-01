import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { BookmarkProvider } from "./contexts/BookmarkContext"; // ✅ 정확한 경로
import App from "./App";
import Login from "./pages/Login";
import "./index.css";
import Signup from "./pages/Signup";
import SignupStep2 from "./pages/SignupStep2";
import Main from "./pages/Main";
import ScholarshipList from "./pages/ScholarshipList";
import ScholarshipDetail from "./pages/ScholarshipDetail";
import NoticeList from "./pages/NoticeList";
import NoticeDetail from "./pages/NoticeDetail";
import NoticeBoard from "./pages/NoticeBoard";
import NotificationCenter from "./pages/NotificationCenter";
import ScholarshipCalendar from "./pages/ScholarshipCalendar";
import Profile from "./pages/Profile";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BookmarkProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/signup-step2" element={<SignupStep2 />} />
          <Route path="/main" element={<Main />} />

          <Route path="/scholarship" element={<ScholarshipList />} />
          <Route path="/scholarship/:id" element={<ScholarshipDetail />} />

          <Route path="/notices" element={<NoticeBoard />} />
          <Route path="/notices/list" element={<NoticeList />} />
          <Route path="/notice/:id" element={<NoticeDetail />} />
          <Route path="/notice" element={<Navigate to="/notices" replace />} />

          <Route path="/notifications" element={<NotificationCenter />} />
          <Route path="/calendar" element={<ScholarshipCalendar />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </BrowserRouter>
    </BookmarkProvider>
  </React.StrictMode>
);
