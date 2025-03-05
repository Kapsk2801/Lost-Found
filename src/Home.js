import React, { useEffect, useState } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase"; // Ensure you export `db` from your firebase.js
import "./Home.css";

const Home = () => {
    const auth = getAuth();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [items, setItems] = useState([]); // To store all items
    const [showDropdown, setShowDropdown] = useState(false); // For profile dropdown

    // Fetch items from Firestore
    const fetchItems = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "items")); // Replace "items" with your Firestore collection name
            const itemsData = [];
            querySnapshot.forEach((doc) => {
                itemsData.push({ id: doc.id, ...doc.data() });
            });
            setItems(itemsData);
        } catch (error) {
            console.error("Error fetching items:", error);
        }
    };

    useEffect(() => {
        auth.onAuthStateChanged((currentUser) => {
            if (!currentUser) {
                navigate("/");
            } else {
                setUser(currentUser);
                fetchItems(); // Fetch items when user logs in
            }
        });
    }, [auth, navigate]);

    const handleLogout = () => {
        signOut(auth).then(() => navigate("/"));
    };

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
    };

    return (
        <div className="home-container">
            <header>
                <h1>Retrievio - Lost & Found</h1>
                <div className="profile-dropdown">
                    <div className="profile-circle" onClick={toggleDropdown}>
                        {user?.email[0].toUpperCase()} {/* Display first letter of email */}
                    </div>
                    {showDropdown && (
                        <div className="dropdown-menu">
                            <button onClick={() => navigate("/report-lost")}>Report Lost Item</button>
                            <button onClick={() => navigate("/report-found")}>Report Found Item</button>
                            <button onClick={handleLogout}>Logout</button>
                        </div>
                    )}
                </div>
            </header>

            <div className="content">
                <h2>Welcome, {user?.email}!</h2>

                {/* Display Items Posted by Other Users */}
                <div className="items-list">
                    <h3>Recent Lost & Found Items</h3>
                    {items.length > 0 ? (
                        items.map((item) => (
                            <div key={item.id} className="item-card">
                                <h4>{item.itemName}</h4>
                                <p>{item.description}</p>
                                <p><strong>Location:</strong> {item.location}</p>
                                <p><strong>Date:</strong> {item.date}</p>
                                <p><strong>Reported by:</strong> {item.reportedBy}</p>
                                <p><strong>Status:</strong> {item.isLost ? "Lost" : "Found"}</p>
                            </div>
                        ))
                    ) : (
                        <p>No items reported yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Home;