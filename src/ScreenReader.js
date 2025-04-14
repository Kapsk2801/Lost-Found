import React, { useState, useEffect } from 'react';
import { FaVolumeUp } from 'react-icons/fa';

const ScreenReader = ({ item }) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speechSynthesis, setSpeechSynthesis] = useState(null);

    useEffect(() => {
        // Initialize speech synthesis
        if (window.speechSynthesis) {
            setSpeechSynthesis(window.speechSynthesis);
        }
        
        // Cleanup function to stop speaking when component unmounts
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    // Handle hover events to start or stop speech synthesis
    const handleHover = (isEntering) => {
        if (!speechSynthesis) return;
        
        if (!isEntering) {
            speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        // Cancel any ongoing speech
        speechSynthesis.cancel();

        // Create descriptive text for the item
        const descriptionText = `
            ${item.title}. 
            This item is currently ${item.status}.
            Category: ${item.category}.
            Location: ${item.location}.
            Description: ${item.description}.
            ${item.claimStatus === 'unclaimed' ? 'This item is available for claiming.' : 
              item.claimStatus === 'pending' ? 'This item has a pending claim.' :
              'This item has been claimed.'
            }
            Use your arrow keys to navigate. Press Enter to view details.
        `;

        const utterance = new SpeechSynthesisUtterance(descriptionText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        setIsSpeaking(true);
        speechSynthesis.speak(utterance);
    };

    return (
        <div 
            className="screen-reader-container"
            onMouseEnter={() => handleHover(true)}
            onMouseLeave={() => handleHover(false)}
            onFocus={() => handleHover(true)}
            onBlur={() => handleHover(false)}
            tabIndex="0"
            role="article"
            aria-label={`${item.title} - ${item.status}`}
        >
            {isSpeaking && (
                <div className="screen-reader-indicator" aria-hidden="true">
                    <FaVolumeUp className="sr-icon" />
                </div>
            )}
        </div>
    );
};

export default ScreenReader; 