// App.js

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import TypingPage from './components/TypingPage';
import ExplorerPage from './components/ExplorerPage';
import ComposerPage from './components/ComposerPage';
import SettingsPage from './components/SettingsPage';
import SensemakingPage from './components/SensemakingPage';
import NamePrompt from './components/NamePrompt';
import './globalStyles.css'; // Import the global CSS file

function App() {
    const [userName, setUserName] = useState(null);

    if (!userName) {
        return <NamePrompt onSubmit={setUserName} />;
    }

    return (
        <Router>
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                minHeight: '100vh',
                backgroundColor: 'var(--color-bg)'
            }}>
                <header style={{ 
                    height: 'var(--navbar-height)',
                    backgroundColor: 'var(--color-bg-alt)',
                    borderBottom: '1px solid var(--color-border)',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1000
                }}>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        height: '100%',
                        padding: '0 var(--spacing-xl)'
                    }}>
                        <div>
                            <h1>no_backspace_ @yincubator/{userName}</h1>
                            <h2>cooperative sensemaking made easy</h2>
                        </div>
                        <NavBar />
                    </div>
                </header>
                <main style={{ 
                    marginTop: 'var(--navbar-height)',
                    flex: 1
                }}>
                    <Routes>
                        <Route path="/" element={<TypingPage userName={userName} />} />
                        <Route path="/explorer" element={<ExplorerPage userName={userName} />} />
                        <Route path="/composer" element={<ComposerPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/sensemaking" element={<SensemakingPage />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

function NavBar() {
    return (
        <nav>
            <ul style={{ 
                listStyleType: 'none', 
                padding: 0, 
                margin: 0,
                display: 'flex',
                gap: 'var(--spacing-md)'
            }}>
                <li>
                    <NavLink to="/" className="nav-link">Typer</NavLink>
                </li>
                <li>
                    <NavLink to="/explorer" className="nav-link">Explorer</NavLink>
                </li>
                <li>
                    <NavLink to="/sensemaking" className="nav-link">Sensemaking</NavLink>
                </li>
                <li>
                    <NavLink to="/composer" className="nav-link">Composer</NavLink>
                </li>
                <li>
                    <NavLink to="/settings" className="nav-link">Settings</NavLink>
                </li>
            </ul>
        </nav>
    );
}

export default App;
