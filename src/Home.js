import React, { useEffect, useState } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./Home.css";

const Home = () => {
    const auth = getAuth();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        auth.onAuthStateChanged((currentUser) => {
            if (!currentUser) {
                navigate("/");
            } else {
                setUser(currentUser);
            }
        });
    }, [auth, navigate]);

    const handleLogout = () => {
        signOut(auth).then(() => navigate("/"));
    };

    return (
        <div className="home-container">
            <header>
                <h1>Retrievio - Lost & Found</h1>
                <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </header>

            <div className="content">
                <h2>Welcome, {user?.email}!</h2>
                <p>Report a lost or found item below.</p>
                <input type="text" placeholder="Item Name" />
                <input type="text" placeholder="Description" />
                <button>Submit</button>
            </div>
        </div>
    );
};

export default Home;
