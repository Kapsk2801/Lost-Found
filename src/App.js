import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "./firebase";
import Home from "./Home";
import ReportLostItem from "./ReportLostItem";
import ReportFoundItem from "./ReportFoundItem";
import Settings from "./Settings"; // Import the new Settings component
import Auth from "./Auth";

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) return <p>Loading...</p>;

    return (
        <Router>
            <Routes>
                <Route path="/" element={user ? <Navigate to="/home" replace /> : <Auth />} />
                <Route path="/home" element={user ? <Home /> : <Navigate to="/" replace />} />
                <Route path="/report-lost" element={user ? <ReportLostItem /> : <Navigate to="/" replace />} />
                <Route path="/report-found" element={user ? <ReportFoundItem /> : <Navigate to="/" replace />} />
                <Route path="/settings" element={user ? <Settings /> : <Navigate to="/" replace />} /> {/* New route */}
            </Routes>
        </Router>
    );
}

export default App;