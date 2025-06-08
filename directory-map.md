# Frontend Directory Map

This document provides an overview of the directory structure for the `no-backspace-app` frontend.

```
no-backspace-app/
├── public/ - Contains the static assets for the application.
│   └── index.html - The main HTML file that serves as the entry point for the React application.
├── src/ - Contains the main source code for the React application.
│   ├── components/ - Contains all the React components used to build the user interface.
│   │   ├── AnimatedLetter.js - A React component for animating individual letters (or words, as the component is named AnimatedWord).
│   │   ├── AnimatedWord.js - A React component for animating individual words.
│   │   ├── CategorizedIdeasPanel.js - A React component that displays ideas categorized by life areas.
│   │   ├── ComposerPage.js - A placeholder React component for a "Composer" page.
│   │   ├── ExplorerPage.js - A React component that allows users to explore and search their past sessions.
│   │   ├── HighlightedText.js - A React component to display text with specific segments highlighted.
│   │   ├── LoginPage.js - A React component that handles user login via Google Sign-In.
│   │   ├── NamePrompt.css - CSS styles for the NamePrompt component.
│   │   ├── NamePrompt.js - A React component that prompts the user to enter their name.
│   │   ├── Questions.js - A React component for displaying a list of questions.
│   │   ├── QuestionsPanel.css - CSS styles for the QuestionsPanel component.
│   │   ├── QuestionsPanel.js - A React component that displays a panel of questions.
│   │   ├── SensemakingPage.js - A React component for the "Sensemaking" feature, which analyzes multiple sessions.
│   │   ├── SettingsPage.js - A placeholder React component for a "Settings" page.
│   │   ├── SpeedMonitor.css - CSS styles for the SpeedMonitor component.
│   │   ├── SpeedMonitor.js - A React component that displays typing speed statistics.
│   │   ├── ThemesPanel.css - CSS styles for the ThemesPanel component.
│   │   ├── ThemesPanel.js - A React component that displays a panel of themes and categorized ideas.
│   │   ├── TypingArea.css - CSS styles for the TypingArea component.
│   │   ├── TypingArea.js - A React component that provides the main text input area for the user.
│   │   ├── TypingControls.css - CSS styles for the TypingControls component.
│   │   ├── TypingControls.js - A React component that contains the control buttons for the typing page.
│   │   ├── TypingPage.css - CSS styles for the main TypingPage component.
│   │   ├── TypingPage.js - The main React component for the typing interface, integrating all the typing-related components.
│   │   ├── TypingSpeedGraph.js - A React component that visualizes the user's typing speed over time.
│   │   └── WritingPage.js - A partial/leftover React component related to the writing page.
│   ├── services/ - Contains the services responsible for making API calls to the backend.
│   │   ├── sessionService.js - A service that handles all API calls to the backend related to sessions.
│   │   └── themeService.js - A service that handles API calls to the backend related to themes.
│   ├── App.js - The root React component that sets up the application's routing and layout.
│   ├── config.js - A configuration file that exports the base URL for the backend API.
│   ├── globalStyles.css - A CSS file that contains the global styles for the application.
│   └── index.js - The main entry point for the React application, which renders the App component.
├── .gitignore - Specifies which files and directories to ignore in version control.
├── package-lock.json - Records the exact version of each installed dependency.
├── package.json - Defines the project's metadata, dependencies, and scripts.
└── README.md - The main README file for the project. 