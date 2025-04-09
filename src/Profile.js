import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import './Profile.css';

const Profile = () => {
    const auth = getAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState({
        firstName: '',
        lastName: '',
        sapId: '',
        gender: '',
        email: '',
        userId: '',
        createdAt: null,
        updatedAt: null
    });
    const [saveStatus, setSaveStatus] = useState('');

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!auth.currentUser) return;

            try {
                // Reference the userProfiles collection directly
                const userProfileRef = doc(db, 'userProfiles', auth.currentUser.uid);
                const userProfileDoc = await getDoc(userProfileRef);

                if (userProfileDoc.exists()) {
                    setProfileData(userProfileDoc.data());
                } else {
                    // Initialize with email and userId if no profile exists
                    setProfileData(prev => ({
                        ...prev,
                        email: auth.currentUser.email,
                        userId: auth.currentUser.uid,
                        createdAt: new Date()
                    }));
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [auth.currentUser]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value,
            updatedAt: new Date() // Update the timestamp on every change
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaveStatus('saving');

        try {
            // Create a new document in the userProfiles collection
            const userProfileRef = doc(db, 'userProfiles', auth.currentUser.uid);
            
            // Prepare the data with timestamps
            const updatedProfileData = {
                ...profileData,
                email: auth.currentUser.email,
                userId: auth.currentUser.uid,
                updatedAt: new Date(),
                createdAt: profileData.createdAt || new Date() // Keep existing creation date or set new one
            };

            await setDoc(userProfileRef, updatedProfileData);

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(''), 3000);
        } catch (error) {
            console.error('Error updating profile:', error);
            setSaveStatus('error');
        }
    };

    if (loading) {
        return (
            <div className="profile-page">
                <header className="app-header">
                    <div className="header-content">
                        <h1>Retrivio - Lost and Found</h1>
                        <button className="back-button" onClick={() => navigate('/home')}>
                            Back to Home
                        </button>
                    </div>
                </header>
                <div className="profile-loading">
                    <div className="loading-spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <header className="app-header">
                <div className="header-content">
                    <h1>Retrivio - Lost and Found</h1>
                    <button className="back-button" onClick={() => navigate('/home')}>
                        Back to Home
                    </button>
                </div>
            </header>

            <div className="profile-container">
                <div className="profile-header">
                    <div className="profile-avatar">
                        {profileData.firstName ? profileData.firstName[0].toUpperCase() : auth.currentUser.email[0].toUpperCase()}
                    </div>
                    <div className="profile-title">
                        <h1>{profileData.firstName ? `${profileData.firstName} ${profileData.lastName}` : 'Complete Your Profile'}</h1>
                        <p>{auth.currentUser.email}</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label>First Name</label>
                            <input
                                type="text"
                                name="firstName"
                                value={profileData.firstName}
                                onChange={handleInputChange}
                                placeholder="Enter your first name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Last Name</label>
                            <input
                                type="text"
                                name="lastName"
                                value={profileData.lastName}
                                onChange={handleInputChange}
                                placeholder="Enter your last name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>SAP ID</label>
                            <input
                                type="text"
                                name="sapId"
                                value={profileData.sapId}
                                onChange={handleInputChange}
                                placeholder="Enter your SAP ID"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Gender</label>
                            <select
                                name="gender"
                                value={profileData.gender}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                                <option value="prefer-not-to-say">Prefer not to say</option>
                            </select>
                        </div>
                    </div>

                    <div className="profile-actions">
                        <button
                            type="submit"
                            className="save-button"
                            disabled={saveStatus === 'saving'}
                        >
                            {saveStatus === 'saving' ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>

                    {saveStatus === 'saved' && (
                        <div className="save-success">Profile updated successfully!</div>
                    )}
                    {saveStatus === 'error' && (
                        <div className="save-error">Error updating profile. Please try again.</div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default Profile; 