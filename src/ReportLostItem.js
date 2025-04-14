import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import "./ReportLostItem.css";

const ReportLostItem = () => {
    const navigate = useNavigate();
    const [itemName, setItemName] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [date, setDate] = useState("");
    const [reporterName, setReporterName] = useState("");
    const [sapId, setSapId] = useState("");
    const [course, setCourse] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(false);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!itemName || !description || !location || !date || !reporterName || !sapId || !course || !contactEmail) {
            setError("All fields are required!");
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactEmail)) {
            setError("Please enter a valid email address!");
            return;
        }

        setUploading(true);
        setError("");

        try {
            // Save item data to Firestore
            console.log("Saving item data to Firestore...");
            await addDoc(collection(db, "items"), {
                itemName,
                description,
                location,
                date,
                reporterName,
                sapId,
                course,
                contactEmail,
                isLost: true,
                timestamp: new Date().toISOString()
            });
            console.log("Item data saved successfully.");

            alert("Item reported successfully!");
            navigate("/home");
        } catch (error) {
            console.error("Error reporting item:", error);
            setError("Failed to report item. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="report-lost-container">
            <header>
                <h1>Retrievio - Report Lost Item</h1>
                <button className="back-btn" onClick={() => navigate("/home")}>Back to Home</button>
            </header>

            <div className="report-lost-content">
                <h2>Report a Lost Item</h2>
                {error && <p className="error-message">{error}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="form-section">
                        <h3>Item Details</h3>
                        <input
                            type="text"
                            placeholder="Item Name"
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            required
                        />
                        <textarea
                            placeholder="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            required
                        />
                        <input
                            type="date"
                            placeholder="Date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>


                    <div className="form-section">
                        <h3>Reporter Details</h3>
                        <input
                            type="text"
                            placeholder="Your Name"
                            value={reporterName}
                            onChange={(e) => setReporterName(e.target.value)}
                            required
                        />
                        <input
                            type="text"
                            placeholder="SAP ID"
                            value={sapId}
                            onChange={(e) => setSapId(e.target.value)}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Course"
                            value={course}
                            onChange={(e) => setCourse(e.target.value)}
                            required
                        />
                        <input
                            type="email"
                            placeholder="Contact Email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" disabled={uploading}>
                        {uploading ? "Submitting..." : "Submit"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ReportLostItem;
