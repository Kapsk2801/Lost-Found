import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase"; // Ensure you export `storage` from firebase.js
import "./ReportLostItem.css"; // Reuse the same CSS as ReportLostItem

const ReportFoundItem = () => {
    const navigate = useNavigate();
    const [itemName, setItemName] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [date, setDate] = useState("");
    const [image, setImage] = useState(null); // To store the selected image file
    const [imagePreview, setImagePreview] = useState(""); // To display the image preview
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(false); // To handle upload state
    const [cameraActive, setCameraActive] = useState(false); // To toggle camera
    const videoRef = useRef(null); // Reference for video stream
    const canvasRef = useRef(null); // Reference for capturing image

    // Start camera when component mounts and cameraActive is true
    useEffect(() => {
        if (cameraActive) {
            startCamera();
        } else {
            stopCamera();
        }
    }, [cameraActive]);

    // Handle image selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setImagePreview(URL.createObjectURL(file)); // Create a preview URL
        }
    };

    // Handle camera capture
    const handleCapture = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            const file = new File([blob], "capture.png", { type: "image/png" });
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
            setCameraActive(false); // Stop camera after capture
        }, "image/png");
    };

    // Start camera
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            setError("Failed to access camera. Please allow camera permissions.");
            setCameraActive(false); // Disable camera if access is denied
        }
    };

    // Stop camera
    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
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
            const docRef = await addDoc(collection(db, "items"), {
                itemName,
                description,
                location,
                date,
                imageUrl, // Store the image URL
                reportedBy: "user@example.com", // Replace with actual user email
                isLost: false, // Mark as found item
            });
            console.log("Item data saved successfully with ID:", docRef.id);

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
                <h1>Retrievio - Report Found Item</h1>
                <button className="back-btn" onClick={() => navigate("/home")}>Back to Home</button>
            </header>

            <div className="report-lost-content">
                <h2>Report a Found Item</h2>
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

                    {/* Camera Section */}
                    <div className="camera-section">
                        {cameraActive ? (
                            <>
                                <video ref={videoRef} autoPlay className="camera-preview"></video>
                                <button type="button" onClick={handleCapture} className="capture-btn">
                                    Capture
                                </button>
                                <button type="button" onClick={() => setCameraActive(false)} className="stop-camera-btn">
                                    Stop Camera
                                </button>
                            </>
                        ) : (
                            <button type="button" onClick={() => setCameraActive(true)} className="start-camera-btn">
                                Take a Picture
                            </button>
                        )}
                        <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
                    </div>

                    <button type="submit" disabled={uploading}>
                        {uploading ? "Uploading..." : "Submit"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ReportFoundItem;