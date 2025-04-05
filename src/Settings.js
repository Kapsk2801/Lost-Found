import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, updatePassword, updateEmail, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
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
    const auth = getAuth();
    const [expandedOption, setExpandedOption] = useState(null);
    const [darkMode, setDarkMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    
    // Form states
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [notifications, setNotifications] = useState({
        newComments: true,
        itemMatches: true,
        statusUpdates: true
    });

    // Load dark mode preference from localStorage
    useEffect(() => {
        const savedDarkMode = localStorage.getItem("darkMode") === "true";
        setDarkMode(savedDarkMode);
        document.body.classList.toggle("dark-mode", savedDarkMode);
    }, []);

    // Load notification preferences from Firestore
    useEffect(() => {
        const loadNotificationPreferences = async () => {
            if (auth.currentUser) {
                const userRef = doc(db, "users", auth.currentUser.uid);
                try {
                    const docSnap = await getDocs(userRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setNotifications(data.notifications || {
                            newComments: true,
                            itemMatches: true,
                            statusUpdates: true
                        });
                    }
                } catch (error) {
                    console.error("Error loading notification preferences:", error);
                }
            }
        };
        loadNotificationPreferences();
    }, [auth.currentUser]);

    // Toggle Dark Mode
    const toggleDarkMode = () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);
        localStorage.setItem("darkMode", newDarkMode.toString());
        document.body.classList.toggle("dark-mode", newDarkMode);
    };

    // Reauthorize user
    const reauthorizeUser = async (password) => {
        const user = auth.currentUser;
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
    };

    // Change Password
    const handleChangePassword = async () => {
        setLoading(true);
        setError("");
        setSuccess("");
        
        try {
            await reauthorizeUser(currentPassword);
            await updatePassword(auth.currentUser, newPassword);
            setSuccess("Password updated successfully!");
            setCurrentPassword("");
            setNewPassword("");
            setExpandedOption(null);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Update Email
    const handleUpdateEmail = async () => {
        setLoading(true);
        setError("");
        setSuccess("");
        
        try {
            await reauthorizeUser(currentPassword);
            await updateEmail(auth.currentUser, newEmail);
            setSuccess("Email updated successfully!");
            setCurrentPassword("");
            setNewEmail("");
            setExpandedOption(null);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Update Notification Preferences
    const handleNotificationUpdate = async (type) => {
        setLoading(true);
        setError("");
        
        try {
            const newNotifications = {
                ...notifications,
                [type]: !notifications[type]
            };
            
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                notifications: newNotifications
            });
            
            setNotifications(newNotifications);
            setSuccess("Notification preferences updated!");
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Delete Account
    const handleDeleteAccount = async () => {
        if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            return;
        }

        setLoading(true);
        setError("");
        
        try {
            await reauthorizeUser(currentPassword);
            
            // Delete user's posts
            const itemsQuery = query(
                collection(db, "items"),
                where("userEmail", "==", auth.currentUser.email)
            );
            const itemsSnapshot = await getDocs(itemsQuery);
            const deletePromises = itemsSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
            
            // Delete user document
            await deleteDoc(doc(db, "users", auth.currentUser.uid));
            
            // Delete Firebase Auth account
            await deleteUser(auth.currentUser);
            
            navigate("/");
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle option click
    const handleOptionClick = (optionId) => {
        setExpandedOption(expandedOption === optionId ? null : optionId);
        setError("");
        setSuccess("");
    };

    const settingsOptions = [
        {
            id: 1,
            title: "Change Password",
            description: "Update your account password.",
            content: (
                <div className="form-group">
                    <input
                        type="password"
                        placeholder="Current Password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button 
                        onClick={handleChangePassword}
                        disabled={loading || !currentPassword || !newPassword}
                    >
                        {loading ? "Updating..." : "Update Password"}
                    </button>
                </div>
            )
        },
        {
            id: 2,
            title: "Update Email",
            description: "Change the email address associated with your account.",
            content: (
                <div className="form-group">
                    <input
                        type="password"
                        placeholder="Current Password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <input
                        type="email"
                        placeholder="New Email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                    />
                    <button 
                        onClick={handleUpdateEmail}
                        disabled={loading || !currentPassword || !newEmail}
                    >
                        {loading ? "Updating..." : "Update Email"}
                    </button>
                </div>
            )
        },
        {
            id: 3,
            title: "Notification Preferences",
            description: "Manage your notification settings for lost and found items.",
            content: (
                <div className="notification-preferences">
                    <div className="notification-option">
                        <label>
                            <input
                                type="checkbox"
                                checked={notifications.newComments}
                                onChange={() => handleNotificationUpdate("newComments")}
                            />
                            Notify me about new comments
                        </label>
                    </div>
                    <div className="notification-option">
                        <label>
                            <input
                                type="checkbox"
                                checked={notifications.itemMatches}
                                onChange={() => handleNotificationUpdate("itemMatches")}
                            />
                            Notify me about potential item matches
                        </label>
                    </div>
                    <div className="notification-option">
                        <label>
                            <input
                                type="checkbox"
                                checked={notifications.statusUpdates}
                                onChange={() => handleNotificationUpdate("statusUpdates")}
                            />
                            Notify me about status updates
                        </label>
                    </div>
                </div>
            )
        },
        {
            id: 4,
            title: "Delete Account",
            description: "Permanently delete your account and all associated data.",
            content: (
                <div className="form-group">
                    <p className="warning-text">
                        This action cannot be undone. All your posts and data will be permanently deleted.
                    </p>
                    <input
                        type="password"
                        placeholder="Current Password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button 
                        className="delete-account-btn"
                        onClick={handleDeleteAccount}
                        disabled={loading || !currentPassword}
                    >
                        {loading ? "Deleting..." : "Delete Account"}
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className={`settings-container ${darkMode ? "dark-mode" : ""}`}>
            <header>
                <h1>Retrievio - Settings</h1>
                <button className="back-btn" onClick={() => navigate("/home")}>Back to Home</button>
            </header>

            <div className="settings-content">
                <h2>Settings</h2>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

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
                                {expandedOption === option.id && (
                                    <div className="option-content">
                                        <p>{option.description}</p>
                                        {option.content}
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
                                {expandedOption === option.id && (
                                    <div className="option-content">
                                        <p>{option.description}</p>
                                        {option.content}
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
                                {expandedOption === option.id && (
                                    <div className="option-content">
                                        <p>{option.description}</p>
                                        {option.content}
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