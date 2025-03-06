import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Settings.css";

// Chevron Icon SVG
const ChevronIcon = () => (
    <svg
        className="chevron-icon"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M19 9L12 16L5 9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const Settings = () => {
    const navigate = useNavigate();
    const [expandedOption, setExpandedOption] = useState(null);
    const [darkMode, setDarkMode] = useState(false); // State for Dark Mode

    // Toggle Dark Mode
    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        document.body.classList.toggle("dark-mode", !darkMode); // Apply dark mode to the entire app
    };

    // Options related to Lost and Found
    const settingsOptions = [
        {
            id: 1,
            title: "Change Password",
            description: "Update your account password.",
            action: () => alert("Change Password clicked!"), // Replace with actual functionality
        },
        {
            id: 2,
            title: "Update Email",
            description: "Change the email address associated with your account.",
            action: () => alert("Update Email clicked!"), // Replace with actual functionality
        },
        {
            id: 3,
            title: "Notification Preferences",
            description: "Manage your notification settings for lost and found items.",
            action: () => alert("Notification Preferences clicked!"), // Replace with actual functionality
        },
        {
            id: 4,
            title: "Delete Account",
            description: "Permanently delete your account and all associated data.",
            action: () => alert("Delete Account clicked!"), // Replace with actual functionality
        },
    ];

    // Handle option click
    const handleOptionClick = (optionId) => {
        if (expandedOption === optionId) {
            setExpandedOption(null); // Collapse if already expanded
        } else {
            setExpandedOption(optionId); // Expand the clicked option
        }
    };

    return (
        <div className={`settings-container ${darkMode ? "dark-mode" : ""}`}>
            <header>
                <h1>Retrievio - Settings</h1>
                <button className="back-btn" onClick={() => navigate("/home")}>Back to Home</button>
            </header>

            <div className="settings-content">
                <h2>Settings</h2>

                {/* List of Settings Options */}
                <div className="settings-options">
                    {/* Account Settings */}
                    <div className="settings-group">
                        <h3 className="group-title">Account Settings</h3>
                        {settingsOptions.slice(0, 2).map((option) => (
                            <div
                                key={option.id}
                                className={`settings-option ${expandedOption === option.id ? "expanded" : ""}`}
                            >
                                <div
                                    className="option-header"
                                    onClick={() => handleOptionClick(option.id)}
                                >
                                    <h4>{option.title}</h4>
                                    <ChevronIcon />
                                </div>

                                {/* Expanded Content */}
                                {expandedOption === option.id && (
                                    <div className="option-content">
                                        <p>{option.description}</p>
                                        <button onClick={option.action}>Go</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Notification Settings */}
                    <div className="settings-group">
                        <h3 className="group-title">Notifications</h3>
                        {settingsOptions.slice(2, 3).map((option) => (
                            <div
                                key={option.id}
                                className={`settings-option ${expandedOption === option.id ? "expanded" : ""}`}
                            >
                                <div
                                    className="option-header"
                                    onClick={() => handleOptionClick(option.id)}
                                >
                                    <h4>{option.title}</h4>
                                    <ChevronIcon />
                                </div>

                                {/* Expanded Content */}
                                {expandedOption === option.id && (
                                    <div className="option-content">
                                        <p>{option.description}</p>
                                        <button onClick={option.action}>Go</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Dark Mode Toggle */}
                    <div className="settings-group">
                        <h3 className="group-title">Appearance</h3>
                        <div className="settings-option">
                            <div className="option-header" onClick={toggleDarkMode}>
                                <h4>Dark Mode</h4>
                                <div className="dark-mode-switch">
                                    <div className={`slider ${darkMode ? "on" : "off"}`}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Delete Account */}
                    <div className="settings-group">
                        <h3 className="group-title">Danger Zone</h3>
                        {settingsOptions.slice(3).map((option) => (
                            <div
                                key={option.id}
                                className={`settings-option ${expandedOption === option.id ? "expanded" : ""}`}
                            >
                                <div
                                    className="option-header"
                                    onClick={() => handleOptionClick(option.id)}
                                >
                                    <h4>{option.title}</h4>
                                    <ChevronIcon />
                                </div>

                                {/* Expanded Content */}
                                {expandedOption === option.id && (
                                    <div className="option-content">
                                        <p>{option.description}</p>
                                        <button onClick={option.action}>Go</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;