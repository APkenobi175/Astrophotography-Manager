# Astrophotography Session Manager Project Plan

## Project Overview
The Astrophotography Session Manager is a web application designed to help astrophotography hobbyists document, and share their sessions. Users can create accounts, log their imaging sessions with detailed equipment and settings information, and share their results with a community of like-minded individuals.

## Key Features

1. **User Authentication**: Secure login and registration system to manage user accounts.
2. **Session Creation**: Users can create detailed records of their astrophotography sessions, including:
   - Title
   - Target (with integration to [Astronomy API](#astronomyapi) for target name lookup)
   - Date and time
   - Location
   - Imaging statistics (number of light frames, exposure time, ISO, camera model, lens/telescope model)
   - Caption/description
   - Public/private visibility option
3. **Public Feed**: A feed where users can view public sessions shared by others, with options to like. It should also show how long ago the session was created.
4. **Liked Sessions**: A dedicated section where users can view sessions they have liked for
5. **Profile Page**: A user profile page to view and manage personal information and session history. 
(Unfortunately, profile features will not be implemented in this version.)

---

### Logging in

- Logging in will use the already implemented authentication system from the starter code.

### Pages and Routing

- I will be using HashRouter for client-side routing to maintain a single-page application.

- The logic for this routing will be handled in main.jsx. This will include routes for:
  - My Sessions
  - Create Session
  - Public Feed
  - Liked Sessions
  - Profile Page
  - Session Detail Page

```jsx
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
    ],
  },
]);
```

- This will help manage the multiple pages of the "single-page" application.

- The .jsx files will be placed in the `src/pages` directory for organization.

### App.jsx

- This file will contain the logic for the header and nagivation bar. We will fetch the user's first and last name and display their initial in the profile picture circle in the top right corner. The navigation bar will use the hashrouter link component to navigate between pages.

### Assets

- The `src/assets` directory will contain any images, icons, or other static assets used in the application. Currently it contains:
  - The csrf token fetcher `csrfhelper.js`, which is used to get the CSRF token for secure API requests.
  - `sessiondiv.jsx`, a reusable component for displaying session information in a card format.
  - `timeago.js`, contains a function that converts time stamps to a "time ago" format
  
## AstronomyAPI

- The AstronomyAPI will be used to search for the full names of imaging targets. This will help users filter sessions based on target if that is implemented in the future.
- The API endpoint for searching targets is:
  `https://api.astronomyapi.com/api/v2/studio/catalog/search/objects?q={query}`
- Users will type in a partial name of their target, and the application will fetch matching results from the AstronomyAPI and display them in a dropdown for selection.

- An example of fetching data from the AstronomyAPI:

```javascript
const response = await fetch(`https://api.astronomyapi.com/api/v2/studio/catalog/search/objects?q=${query}`, {
  headers: {
    'Authorization': 'the api key goes here'
    }
});
const data = await response.json();
setSearchResults(data.data);
```

## Image Upload and Display

- Users can upload up to 3 images per session when creating or editing a session.
- Uploaded images are stored in the Django backend using the `SessionImage` model, which saves files to the `media/session_images/` folder.
- The frontend displays session images:
  - In the session detail view, all images are shown in a responsive row, equally sized.
  - In the "My Sessions" list, the first image is shown as a small thumbnail next to the session title and caption.
  - If a session has no image, a placeholder box labeled "No image" is shown in place of the thumbnail, matching the image size and style.
- Images are served via Django's static file handling in development, and the frontend fetches them using their `/media/session_images/...` URLs.
- All image display uses flexbox


---

