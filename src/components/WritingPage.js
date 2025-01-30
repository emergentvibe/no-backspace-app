const WritingPage = ({ userName }) => {
    // ... existing state ...

    const handleTextChange = async (text) => {
        try {
            if (currentSession) {
                const response = await updateSession(currentSession._id, text, false, userName);
                setCurrentSession(response.session);
            } else {
                const response = await createSession(text, false, userName);
                setCurrentSession(response.session);
            }
        } catch (error) {
            console.error('Error saving text:', error);
        }
    };

    // ... rest of the component code ...
} 