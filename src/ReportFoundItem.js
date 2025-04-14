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

    // Handle image change and preview
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

    // Add a new function for compressing images
    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = event => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Specifically handle JPEG by setting quality
                    const quality = file.type === 'image/jpeg' ? 0.8 : 0.9;
                    const dataUrl = canvas.toDataURL(file.type, quality);
                    resolve(dataUrl);
                };
            };
        });
    };

    // Update handleSubmit function to use image compression
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
            console.log("Processing image...", image.type); // Debug log to show image type
            
            // Compress the image before storing
            const compressedImageData = await compressImage(image);
            console.log("Image compressed successfully");
            
            // Add console logs for debugging
            console.log("Saving found item data to Firestore...");
            
            // Save item data to Firestore - using the same structure as ReportLostItem but with isLost: false
            const docRef = await addDoc(collection(db, "items"), {
                title: itemName,
                itemName: itemName,
                description,
                location,
                date,
                reporterName,
                sapId,
                course,
                contactEmail,
                image: compressedImageData,
                imageUrl: compressedImageData,
                imageType: image.type, // Store the image type for reference
                isLost: false,
                isFound: true, 
                status: "found",
                timestamp: new Date().toISOString()
            });
            
            console.log("Found item data saved successfully with ID:", docRef.id);
            alert("Item reported successfully!");
            navigate("/home");
        } catch (error) {
            console.error("Error reporting item:", error);
            setError("Failed to save item. Please try again. Error: " + error.message);
        } finally {
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