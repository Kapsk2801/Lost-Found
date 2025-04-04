import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import "./ReportLostItem.css";

const ReportFoundItem = () => {
    const navigate = useNavigate();
    const [itemName, setItemName] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [date, setDate] = useState("");
    const [reporterName, setReporterName] = useState("");
    const [sapId, setSapId] = useState("");
    const [course, setCourse] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [image, setImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                setImage(file);
                setPreviewUrl(URL.createObjectURL(file));
                setError("");
            } else {
                setError("Please select an image file.");
                setImage(null);
                setPreviewUrl("");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!itemName || !description || !location || !date || !reporterName || !sapId || !course || !contactEmail || !image) {
            setError("All fields including image are required!");
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
            // Convert image to base64 for storage
            const reader = new FileReader();
            reader.readAsDataURL(image);
            reader.onload = async () => {
                try {
                    // Save item data to Firestore
                    await addDoc(collection(db, "items"), {
                        itemName,
                        description,
                        location,
                        date,
                        reporterName,
                        sapId,
                        course,
                        contactEmail,
                        imageData: reader.result,
                        isLost: false,
                        timestamp: new Date().toISOString()
                    });

                    alert("Item reported successfully!");
                    navigate("/home");
                } catch (error) {
                    console.error("Error saving to Firestore:", error);
                    setError("Failed to save item. Please try again.");
                } finally {
                    setUploading(false);
                }
            };
            reader.onerror = (error) => {
                console.error("Error reading file:", error);
                setError("Error processing image. Please try again.");
                setUploading(false);
            };
        } catch (error) {
            console.error("Error reporting item:", error);
            setError("Failed to report item. Please try again.");
            setUploading(false);
        }
    };

    return (
        <div className="report-lost-container">
            <header>
                <h1>Retrievio - Report Found Item</h1>
                <button className="back-btn" onClick={() => navigate("/home")}>Back to Home</button>
            </header>

            <div className="report-lost-content">
                <h2>Report a Found Item</h2>
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

                    <div className="form-section">
                        <h3>Item Image</h3>
                        <div className="image-upload" onClick={() => fileInputRef.current.click()}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                style={{ display: 'none' }}
                                ref={fileInputRef}
                            />
                            <div className="upload-label">
                                <i className="fas fa-cloud-upload-alt"></i>
                                <span className="upload-placeholder">
                                    Click to upload image or drag and drop
                                </span>
                            </div>
                            {previewUrl && (
                                <div className="image-preview">
                                    <img src={previewUrl} alt="Preview" />
                                </div>
                            )}
                        </div>
                        
                        <div className="camera-upload">
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleImageChange}
                                style={{ display: 'none' }}
                                ref={cameraInputRef}
                            />
                            <button 
                                type="button" 
                                className="camera-btn"
                                onClick={() => cameraInputRef.current.click()}
                            >
                                Take Photo with Camera
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={uploading}>
                        {uploading ? "Submitting..." : "Submit"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ReportFoundItem;