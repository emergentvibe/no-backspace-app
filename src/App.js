// App.js

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import TypingPage from './components/TypingPage';
import ExplorerPage from './components/ExplorerPage';
import ComposerPage from './components/ComposerPage';
import SettingsPage from './components/SettingsPage';
import SensemakingPage from './components/SensemakingPage';
import LoginPage from './components/LoginPage';
import './globalStyles.css'; // Import the global CSS file

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:4000/auth/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
            } else {
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
        }
        setLoading(false);
    };

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Router>
            {!user ? (
                <LoginPage onLogin={handleLogin} />
            ) : (
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
                                <h1>no_backspace_ @emergentvibe</h1>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                <NavBar />
                                <div 
                                    onClick={handleLogout}
                                    style={{
                                        cursor: 'pointer',
                                        padding: 'var(--spacing-sm)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-sm)'
                                    }}
                                >
                                    {user.picture && (
                                        <img 
                                            src={user.picture} 
                                            alt={user.name}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '50%'
                                            }}
                                        />
                                    )}
                                    <span>Logout</span>
                                </div>
                            </div>
                        </div>
                    </header>
                    <main style={{ 
                        marginTop: 'var(--navbar-height)',
                        flex: 1
                    }}>
                        <Routes>
                            <Route path="/" element={<TypingPage userName={user.name} />} />
                            <Route path="/explorer" element={<ExplorerPage userName={user.name} />} />
                            <Route path="/composer" element={<ComposerPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            <Route path="/sensemaking" element={<SensemakingPage />} />
                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                    </main>
                </div>
            )}
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
