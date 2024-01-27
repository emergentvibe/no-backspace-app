// App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import TypingPage from './components/TypingPage';
import ExplorerPage from './components/ExplorerPage';
import ComposerPage from './components/ComposerPage';
import SettingsPage from './components/SettingsPage';
import './globalStyles.css'; // Import the global CSS file

function App() {
    return (
        <Router>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 20px', alignItems: 'center' }}>
                    <div>
                        <h1>no_backspace_</h1>
                        <h2>the minimalist note taking app</h2>
                    </div>
                    <NavBar />
                </div>
                <Routes>
                    <Route path="/" exact element={<TypingPage />} />
                    <Route path="/explorer" element={<ExplorerPage />} />
                    <Route path="/composer" element={<ComposerPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Routes>
            </div>
        </Router>
    );
}

function NavBar() {
    return (
        <nav>
            <ul style={{ listStyleType: 'none', padding: '0', margin: '0' }}>
                <li style={{ display: 'inline', margin: '0 10px' }}>
                    <NavLink to="/" className="nav-link" activeClassName="active">Typer</NavLink>
                </li>
                <li style={{ display: 'inline', margin: '0 10px' }}>
                    <NavLink to="/explorer" className="nav-link" activeClassName="active">Explorer</NavLink>
                </li>
                <li style={{ display: 'inline', margin: '0 10px' }}>
                    <NavLink to="/composer" className="nav-link" activeClassName="active">Composer</NavLink>
                </li>
                <li style={{ display: 'inline', margin: '0 10px' }}>
                    <NavLink to="/settings" className="nav-link" activeClassName="active">Settings</NavLink>
                </li>
            </ul>
        </nav>
    );
}

export default App;
