import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase"; // Ensure you export `storage` from firebase.js
import "./ReportLostItem.css";

const ReportLostItem = () => {
    const navigate = useNavigate();
    const [itemName, setItemName] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [date, setDate] = useState("");
    const [image, setImage] = useState(null); // To store the selected image file
    const [imagePreview, setImagePreview] = useState(""); // To display the image preview
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(false); // To handle upload state

    // Handle image selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setImagePreview(URL.createObjectURL(file)); // Create a preview URL
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!itemName || !description || !location || !date || !image) {
            setError("All fields are required, including an image!");
            return;
        }

        setUploading(true);
        setError("");

        try {
            console.log("Uploading image to Firebase Storage...");
            // Upload image to Firebase Storage
            const storageRef = ref(storage, `items/${image.name}`);
            await uploadBytes(storageRef, image);
            console.log("Image uploaded successfully.");

            const imageUrl = await getDownloadURL(storageRef);
            console.log("Image URL:", imageUrl);

            // Save item data to Firestore
            console.log("Saving item data to Firestore...");
            await addDoc(collection(db, "items"), {
                itemName,
                description,
                location,
                date,
                imageUrl, // Store the image URL
                reportedBy: "user@example.com", // Replace with actual user email
                isLost: true,
            });
            console.log("Item data saved successfully.");

            alert("Item reported successfully!");
            navigate("/home"); // Redirect to home after submission
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

                    {/* Image Upload Section */}
                    <div className="image-upload">
                        <label htmlFor="image-upload-input" className="upload-label">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="image-preview" />
                            ) : (
                                <div className="upload-placeholder">
                                    <span>Click to upload an image</span>
                                </div>
                            )}
                        </label>
                        <input
                            id="image-upload-input"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            required
                        />
                    </div>

                    <button type="submit" disabled={uploading}>
                        {uploading ? "Uploading..." : "Submit"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ReportLostItem;
