import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import SessionDetailPage from "./pages/SessionDetailPage.jsx";
import "./index.css";
import PublicFeedPage from "./pages/PublicFeedPage.jsx";
import LikedSessionsPage from "./pages/LikedSessionsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { path: "/",               element: <PublicFeedPage /> },
      { path: "/public",         element: <PublicFeedPage /> },
      { path: "/liked",          element: <LikedSessionsPage /> },
      { path: "/sessions/:id",   element: <SessionDetailPage /> },
      { path: "/profile/:username", element: <ProfilePage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
