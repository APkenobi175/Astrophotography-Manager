import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import App from "./App.jsx";
import HomePage from "./pages/HomePage.jsx";
import SessionDetailPage from "./pages/SessionDetailPage.jsx";
import "./index.css";
import PublicFeedPage from "./pages/PublicFeedPage.jsx";
import LikedSessionsPage from "./pages/LikedSessionsPage.jsx"; 
import ProfilePage from "./pages/ProfilePage.jsx";

// we will use a hash router like we did in class to avoid server config issues
const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",          // #/
        element: <HomePage />,
      },
      {
        path: "/sessions/:id", // #/sessions/1
        element: <SessionDetailPage />,
      },
      {
        path: "/public", // #/public
        element: <PublicFeedPage />,
      },
      {
        path: "/liked", // #/liked
        element: <LikedSessionsPage />,
      }
      ,
      {
        path: "/profile",
        element: <ProfilePage />,
      }
      // later:
      // { path: "/profile", element: <ProfilePage /> },
      // I Have already spent a ton of time on this project so I am skipping the profile page
      // Most of my time has been spent trying to get the Astronomy API to work
      // but, it works now I had trouble getting the credentials in the .env file to work, hardcoding them fixed it. I think the problem was my .env file was in the wrong directory

    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
