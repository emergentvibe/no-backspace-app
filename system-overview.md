# Frontend System Overview

This document provides a detailed overview of the `no-backspace-app` frontend architecture, features, and technology stack.

## Core Concept

The frontend is a single-page application (SPA) built with React that provides the user interface for the "no-backspace" note-taking application. It allows users to write in a continuous flow and then use AI-powered tools to analyze and make sense of their text.

## System Architecture

The application is a modern React application, likely bootstrapped with `create-react-app`. It follows a component-based architecture, where the UI is broken down into a series of reusable components.

-   **Component Layer (`/src/components`)**: Contains all the React components, which are generally well-encapsulated. The application is divided into several main pages, including `TypingPage`, `ExplorerPage`, and `SensemakingPage`.
-   **Routing**: `react-router-dom` is used to handle client-side routing between the different pages. A check for a user authentication token in `localStorage` protects the main application routes, redirecting to the `LoginPage` if no token is found.
-   **Service Layer (`/src/services`)**: Contains the logic for communicating with the backend API. The `sessionService.js` is a key file, consolidating most of the API calls related to creating, updating, and analyzing sessions.
-   **State Management**: State is primarily managed within individual components using React hooks (`useState`, `useEffect`, `useRef`). There is no global state management library like Redux or MobX; global state (like user info) is managed in the root `App.js` component and passed down via props. State persistence for the current writing session is handled using `localStorage`.
-   **Styling**: Styling is done with plain CSS. A `globalStyles.css` file defines CSS variables for a consistent theme (colors, fonts, spacing), and individual components have their own corresponding CSS files.

## Key Features & Implementation

### 1. User Authentication (`LoginPage.js`)

-   A dedicated login page handles user authentication using Google Sign-In. It leverages the official Google Identity Services (GSI) library for the web.
-   Upon successful authentication, the backend returns a JWT which is stored in the browser's `localStorage`. This token is then included in the `Authorization` header for all subsequent API requests.
-   The root `App.js` component checks for the token's validity on startup to maintain the user's session.

### 2. The Writing Environment (`TypingPage.js`)

-   This is the core page of the application, providing a distraction-free writing interface.
-   It features a three-panel layout: a `ThemesPanel` on the left, the main `TypingArea` in the center, and a `QuestionsPanel` on the right.
-   **Typing Speed Monitor**: A persistent bottom bar (`SpeedMonitor.js` and `TypingSpeedGraph.js`) tracks and visualizes the user's typing speed (WPM) in real-time.
-   **Session Handling**: The page automatically creates or updates a session as the user types, saving progress to `localStorage` to prevent data loss.

### 3. Session Exploration (`ExplorerPage.js`)

-   This page allows users to view, search, and manage their past writing sessions.
-   Users can search across all their notes or search for specific ideas *within* a selected note.
-   The UI features a master-detail view, with a list of sessions in a sidebar and the content of the selected session in the main view.
-   The `HighlightedText.js` component is used to visually highlight search matches within the text.

### 4. Sensemaking (`SensemakingPage.js`)

-   This page provides a UI for the cross-session analysis feature.
-   Users can filter their sessions by author and date range, select multiple sessions, and then trigger the "sensemaking" process on the backend to generate a list of questions that connect the ideas and tensions across the selected notes.

## Technology Stack

-   **Framework**: React (v18)
-   **Routing**: `react-router-dom` (v6)
-   **Authentication**: Google Identity Services (GSI) for Web (via direct script load)
-   **Styling**: Plain CSS with CSS Variables.
-   **Icons**: `react-icons`
-   **Build Tool**: Create React App (`react-scripts`) 