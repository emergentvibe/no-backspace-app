import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = ({ onLogin }) => {
    const navigate = useNavigate();

    useEffect(() => {
        // Load Google's OAuth script
        const loadGoogleScript = () => {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = initializeGoogleSignIn; // Initialize after script loads
            document.body.appendChild(script);

            return () => {
                document.body.removeChild(script);
            };
        };

        loadGoogleScript();
    }, []);

    const initializeGoogleSignIn = () => {
        if (window.google) {
            console.log('Initializing Google Sign-In...');
            window.google.accounts.id.initialize({
                client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse,
            });

            window.google.accounts.id.renderButton(
                document.getElementById('google-signin'),
                { 
                    theme: 'outline', 
                    size: 'large',
                    type: 'standard',
                    shape: 'rectangular',
                    text: 'continue_with',
                    width: '250'
                }
            );

            // Also display the One Tap dialog
            window.google.accounts.id.prompt();
        } else {
            console.error('Google script not loaded correctly');
        }
    };

    const handleCredentialResponse = async (response) => {
        console.log('Google Sign-In response received:', response);
        try {
            const result = await fetch('http://localhost:4000/auth/google', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: response.credential,
                }),
            });

            const data = await result.json();
            console.log('Backend response:', data);
            
            if (data.token && data.user) {
                localStorage.setItem('token', data.token);
                onLogin(data.user);
                navigate('/');
            }
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'var(--color-bg)'
        }}>
            <div style={{
                backgroundColor: 'var(--color-bg-alt)',
                padding: 'var(--spacing-xl)',
                borderRadius: 'var(--border-radius)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                textAlign: 'center'
            }}>
                <h1 style={{ 
                    marginBottom: 'var(--spacing-xl)',
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-mono)'
                }}>
                    Welcome to no_backspace_
                </h1>
                <div 
                    id="google-signin"
                    style={{
                        minHeight: '40px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                ></div>
            </div>
        </div>
    );
};

export default LoginPage; 