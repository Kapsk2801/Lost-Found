import React, { useEffect, useState } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, doc, updateDoc, arrayUnion, Timestamp, query, orderBy, addDoc, serverTimestamp, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import EmojiPicker from 'emoji-picker-react';
import "./Home.css";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaRobot, FaTimes, FaTrash, FaSpinner, FaSync, FaCopy, FaVolumeUp } from 'react-icons/fa';
import ScreenReader from './ScreenReader';

// Category icons and data
const categories = [
    { id: 'electronics', name: 'Electronics', icon: '📱' },
    { id: 'documents', name: 'Documents', icon: '📄' },
    { id: 'accessories', name: 'Accessories', icon: '👜' },
    { id: 'keys', name: 'Keys', icon: '🔑' },
    { id: 'clothing', name: 'Clothing', icon: '👕' },
    { id: 'other', name: 'Other', icon: '📦' }
];

const Home = () => {
    const auth = getAuth();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [items, setItems] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [modalActive, setModalActive] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [activePost, setActivePost] = useState(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [collapsedComments, setCollapsedComments] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const [filteredItems, setFilteredItems] = useState([]);
    const [showShareOptions, setShowShareOptions] = useState({});
    const [selectedPost, setSelectedPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [showComments, setShowComments] = useState(true);
    const [comment, setComment] = useState('');
    const [showAiAnalysis, setShowAiAnalysis] = useState(false);
    const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([
        { sender: 'bot', text: 'Hello! I\'m your Lost & Found Assistant. How can I help you today?' }
    ]);
    const [userMessage, setUserMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [chatContext, setChatContext] = useState({
        lastTopic: null,
        itemDiscussion: null,
        userPreferences: {}
    });
    const [isAdmin, setIsAdmin] = useState(false);
    const [aiDescription, setAiDescription] = useState('');
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [showAiFeature, setShowAiFeature] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speechSynthesis, setSpeechSynthesis] = useState(null);
    const [hoveredItem, setHoveredItem] = useState(null);

    const suggestions = [
        'How do I report a lost item?',
        'How to claim an item?',
        'What should I do if I found something?',
        'Show me my recent items',
        'Search tips',
        'Contact support'
    ];

    // Handle scroll events
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            setShowScrollTop(scrollTop > 300);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Scroll to top function
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // Set up real-time listener for items
    useEffect(() => {
        const itemsQuery = query(collection(db, 'items'), orderBy('timestamp', 'desc'));
        
        const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
            const itemsData = snapshot.docs.map(doc => {
                const data = doc.data();
                // Create a more descriptive title from available information
                let derivedTitle = data.title;
                if (!derivedTitle) {
                    if (data.itemName) {
                        derivedTitle = data.itemName;
                    } else if (data.description) {
                        derivedTitle = data.description.split(' ').slice(0, 4).join(' ') + '...';
                    } else if (data.category) {
                        derivedTitle = data.category.charAt(0).toUpperCase() + data.category.slice(1) + ' Item';
                    } else {
                        derivedTitle = 'Untitled Item';
                    }
                }

                // Determine the status based on available information
                let itemStatus = data.status;
                if (!itemStatus || itemStatus === 'unknown') {
                    if (data.isLost) {
                        itemStatus = 'lost';
                    } else if (data.isFound) {
                        itemStatus = 'found';
                    } else {
                        // Check other properties to determine status
                        if (data.claimStatus === 'unclaimed') {
                            itemStatus = 'available';
                        } else if (data.claimStatus === 'claimed') {
                            itemStatus = 'claimed';
                        } else if (data.lastSeen) {
                            itemStatus = 'reported';
                        } else {
                            itemStatus = 'pending';
                        }
                    }
                }

                return {
                    id: doc.id,
                    title: derivedTitle,
                    description: data.description || 'No description provided',
                    location: data.location || 'Location not specified',
                    status: itemStatus,
                    date: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
                    image: data.imageUrl || data.imageData || 'https://via.placeholder.com/300?text=No+Image',
                    category: data.category || 'other',
                    comments: data.comments || [],
                    contactInfo: data.contactInfo || 'Contact information not provided',
                    reward: data.reward || 'No reward specified',
                    lastSeen: data.lastSeen || 'Last seen location not specified',
                    itemDetails: {
                        brand: data.itemDetails?.brand || '',
                        color: data.itemDetails?.color || '',
                        model: data.itemDetails?.model || '',
                        serialNumber: data.itemDetails?.serialNumber || ''
                    },
                    urgency: data.urgency || 'normal',
                    claimStatus: data.claimStatus || 'unclaimed'
                };
            });
            setItems(itemsData);
            setFilteredItems(itemsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching items:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Fetch user profile data
    useEffect(() => {
        const fetchUserProfile = async (userId) => {
            try {
                const userProfileRef = doc(db, 'users', userId);
                const userProfileDoc = await getDoc(userProfileRef);
                
                if (userProfileDoc.exists()) {
                    const profileData = userProfileDoc.data();
                    setUserProfile(profileData);
                    // Store profile data in localStorage for persistence
                    localStorage.setItem('userProfile', JSON.stringify(profileData));
                } else {
                    // Try to get cached profile data
                    const cachedProfile = localStorage.getItem('userProfile');
                    if (cachedProfile) {
                        setUserProfile(JSON.parse(cachedProfile));
                    }
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
                // Try to get cached profile data on error
                const cachedProfile = localStorage.getItem('userProfile');
                if (cachedProfile) {
                    setUserProfile(JSON.parse(cachedProfile));
                }
            }
        };

        const initializeProfile = (currentUser) => {
            // Try to get cached profile first for immediate display
            const cachedProfile = localStorage.getItem('userProfile');
            if (cachedProfile) {
                setUserProfile(JSON.parse(cachedProfile));
            }
            
            if (currentUser) {
                fetchUserProfile(currentUser.uid);
            }
        };

        auth.onAuthStateChanged((currentUser) => {
            if (!currentUser) {
                navigate("/");
            } else {
                setUser(currentUser);
                initializeProfile(currentUser);
            }
        });
    }, [auth, navigate]);

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (auth.currentUser) {
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                if (userDoc.exists()) {
                    setIsAdmin(userDoc.data().isAdmin === true);
                }
            }
        };
        checkAdminStatus();
    }, [auth.currentUser]);

    const handleLogout = () => {
        signOut(auth).then(() => navigate("/"));
    };

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
    };

    const handleItemClick = (item) => {
        setSelectedItem(item);
    };

    const handleCloseModal = () => {
        setSelectedPost(null);
        setComment('');
        setSelectedItem(null);
        setModalActive(false);
        setShowEmojiPicker(false);
        setNewComment('');
        document.body.style.overflow = 'auto';
        
        // Force scroll to last position
        window.scrollTo({
            top: window.lastScrollPosition || 0,
            behavior: 'smooth'
        });
    };

    const handleCommentClick = (item) => {
        // Store current scroll position
        window.lastScrollPosition = window.pageYOffset;
        
        setSelectedItem(item);
        setModalActive(true);
        setSelectedPost(null); // Ensure the post modal is closed
        setShowEmojiPicker(false);
        document.body.style.overflow = 'hidden';
    };

    const onEmojiClick = (emojiObject) => {
        setNewComment(prev => prev + emojiObject.emoji);
        setShowEmojiPicker(false);
    };

    const handleReply = (postId, commentId) => {
        setActivePost(postId);
        setReplyingTo(commentId);
        // Focus the comment input
        const textarea = document.querySelector(`#post-${postId} .add-comment textarea`);
        if (textarea) {
            textarea.focus();
        }
    };

    const addComment = async (postId, commentData) => {
        try {
            const itemRef = doc(db, 'items', postId);
            await updateDoc(itemRef, {
                comments: arrayUnion({
                    id: Date.now().toString(),
                    text: commentData.text,
                    userEmail: user.email,
                    timestamp: Timestamp.now(),
                    replies: []
                })
            });
        } catch (error) {
            console.error("Error adding comment:", error);
        }
    };

    const addReplyToComment = async (postId, commentId, replyData) => {
        try {
            const itemRef = doc(db, 'items', postId);
            const currentItem = items.find(item => item.id === postId);
            
            if (!currentItem) return;

            const updatedComments = currentItem.comments.map(comment => {
                if (comment.id === commentId) {
                    return {
                        ...comment,
                        replies: [
                            ...(comment.replies || []),
                            {
                                id: Date.now().toString(),
                                text: replyData.text,
                                userEmail: user.email,
                                timestamp: Timestamp.now(),
                                parentId: commentId
                            }
                        ]
                    };
                }
                return comment;
            });

            await updateDoc(itemRef, {
                comments: updatedComments
            });
        } catch (error) {
            console.error("Error adding reply:", error);
        }
    };

    const handleAddComment = async (postId) => {
        if (!commentText.trim()) return;

        try {
            if (replyingTo) {
                await addReplyToComment(postId, replyingTo, {
                    text: commentText,
                    user: user.email,
                    timestamp: Timestamp.now()
                });
            } else {
                await addComment(postId, {
                    text: commentText,
                    user: user.email,
                    timestamp: Timestamp.now()
                });
            }

            setCommentText('');
            setReplyingTo(null);
            setActivePost(null);
        } catch (error) {
            console.error("Error handling comment:", error);
        }
    };

    // Toggle comments collapse state
    const toggleComments = (itemId) => {
        setCollapsedComments(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    // Get comments count
    const getCommentsCount = (comments = []) => {
        return comments.reduce((total, comment) => {
            return total + 1 + (comment.replies?.length || 0);
        }, 0);
    };

    // Filter and sort items
    useEffect(() => {
        if (!items || items.length === 0) {
            setFilteredItems([]);
            return;
        }

        let filtered = [...items];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(item =>
                (item.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (item.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                (item.location?.toLowerCase() || '').includes(searchQuery.toLowerCase())
            );
        }

        // Category filter
        if (selectedCategory) {
            filtered = filtered.filter(item => item.category === selectedCategory);
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'latest') {
                return b.date - a.date;
            }
            return a.date - b.date;
        });

        setFilteredItems(filtered);
    }, [items, searchQuery, selectedCategory, sortBy]);

    // Share functionality
    const handleShare = (item) => {
        if (!item) return;

        const shareData = {
            title: item.title || 'Shared Item',
            text: `Check out this ${item.status || 'item'}: ${item.title || 'Untitled'}`,
            url: window.location.href
        };

        if (navigator.share) {
            navigator.share(shareData).catch(console.error);
        } else {
            setShowShareOptions(prev => ({
                ...prev,
                [item.id]: !prev[item.id]
            }));
        }
    };

    // Function to handle viewing post details
    const handleViewDetails = async (post) => {
        // Store current scroll position
        window.lastScrollPosition = window.pageYOffset;
        
        // Prevent background scrolling
        document.body.style.overflow = 'hidden';
        
        setSelectedPost(post);
        setSelectedItem(post);
        setModalActive(false); // Ensure the comment modal is closed
        // Load comments when post is selected
        if (post) {
            const commentsQuery = query(
                collection(db, 'items', post.id, 'comments'),
                orderBy('timestamp', 'desc')
            );
            
            const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
                const commentsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setComments(commentsData);
            });

            return () => unsubscribe();
        }
    };

    // Function to handle comment submission
    const handleCommentSubmit = async (postId) => {
        if (!comment.trim() || !auth.currentUser) return;

        try {
            await addDoc(collection(db, 'items', postId, 'comments'), {
                text: comment,
                userId: auth.currentUser.uid,
                username: auth.currentUser.email?.split('@')[0] || 'Anonymous',
                timestamp: serverTimestamp(),
            });

            setComment(''); // Clear comment input
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    const handleClaimItem = async (item) => {
        try {
            if (!auth.currentUser) {
                toast.error("Please login to claim this item");
                return;
            }

            // Double check if item is already claimed or has pending claim
            const itemRef = doc(db, "items", item.id);
            const itemSnap = await getDoc(itemRef);
            
            if (!itemSnap.exists()) {
                toast.error("Item not found");
                return;
            }

            const currentItemData = itemSnap.data();
            
            // Check current status
            if (currentItemData.claimStatus === 'claimed') {
                toast.error("This item has already been claimed");
                return;
            }

            if (currentItemData.claimStatus === 'pending') {
                if (currentItemData.claimedBy === auth.currentUser.uid) {
                    toast.info("You have already submitted a claim for this item");
                } else {
                    toast.error("This item already has a pending claim");
                }
                return;
            }

            // First update the item's status to prevent race conditions
            await updateDoc(itemRef, {
                claimStatus: 'pending',
                claimedBy: auth.currentUser.uid,
                claimDate: serverTimestamp()
            });

            // Get user data
            const userRef = doc(db, "users", auth.currentUser.uid);
            const userSnap = await getDoc(userRef);
            
            let userData = {};
            
            if (userSnap.exists()) {
                userData = userSnap.data();
            } else {
                userData = {
                    name: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
                    email: auth.currentUser.email,
                    phone: '',
                    address: '',
                    department: '',
                    rollNo: '',
                    createdAt: new Date()
                };

                try {
                    await setDoc(userRef, userData);
                } catch (error) {
                    console.error("Error creating basic profile:", error);
                }
            }

            // Create claim document
            const claimData = {
                itemId: item.id,
                itemTitle: item.title,
                itemDescription: item.description,
                itemImage: item.image,
                itemLocation: item.location,
                itemCategory: item.category,
                itemStatus: item.status,
                claimDate: serverTimestamp(),
                claimStatus: 'pending',
                userId: auth.currentUser.uid,
                userName: userData.name || userData.firstName || auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
                userEmail: userData.email || auth.currentUser.email,
                userPhone: userData.phone || userData.phoneNumber || '',
                userAddress: userData.address || '',
                userDepartment: userData.department || '',
                userRollNo: userData.rollNo || userData.studentId || '',
                verificationStatus: 'pending',
                adminNotes: '',
                claimNotes: '',
                lastUpdated: serverTimestamp()
            };

            const claimRef = await addDoc(collection(db, "claims"), claimData);

            // Update item with claim reference
            await updateDoc(itemRef, {
                claimId: claimRef.id
            });

            toast.success("Item claimed successfully! Waiting for verification.");

            // Create admin notification
            await addDoc(collection(db, "notifications"), {
                type: 'new_claim',
                itemId: item.id,
                claimId: claimRef.id,
                userId: auth.currentUser.uid,
                userName: claimData.userName,
                itemTitle: item.title,
                status: 'unread',
                createdAt: serverTimestamp(),
                message: `New claim request for ${item.title} by ${claimData.userName}`
            });

        } catch (error) {
            console.error("Error claiming item:", error);
            toast.error("Failed to claim item. Please try again.");
            
            // Attempt to rollback the claim status if there was an error
            try {
                const itemRef = doc(db, "items", item.id);
                await updateDoc(itemRef, {
                    claimStatus: 'unclaimed',
                    claimedBy: null,
                    claimDate: null,
                    claimId: null
                });
            } catch (rollbackError) {
                console.error("Error rolling back claim status:", rollbackError);
            }
        }
    };

    // AI Recovery Analysis Function
    const analyzeItemRecovery = (item) => {
        setIsAnalyzing(true);
        
        // Simulate AI processing with realistic analysis
        setTimeout(() => {
            // Dynamic success rates based on multiple factors
            const categorySuccessRates = {
                'electronics': 0.45,  // Electronics are harder to recover
                'documents': 0.75,    // Documents often end up in lost & found
                'accessories': 0.35,  // Small items are harder to find
                'keys': 0.80,        // Keys are often turned in
                'clothing': 0.65,    // Clothing items are fairly recoverable
                'other': 0.40        // Miscellaneous items vary
            };

            // Time decay factors (exponential decay)
            const hoursSinceLost = (new Date() - item.date) / (1000 * 60 * 60);
            const timeDecayFactor = Math.exp(-hoursSinceLost / 48); // Sharper decline after 48 hours

            // Location-based probability adjustments
            const locationFactors = {
                'Library': 0.85,      // High recovery rate
                'Cafeteria': 0.70,    // Good staff monitoring
                'Classroom': 0.65,    // Contained environment
                'Main Hall': 0.55,    // High traffic area
                'Parking': 0.30,      // Open area, harder to find
                'Unknown': 0.25       // Location not specified
            };

            // Get location factor
            const locationFactor = locationFactors[item.location] || locationFactors['Unknown'];

            // Calculate item value impact (expensive items are more likely to be turned in)
            const valueFactors = {
                'high': 0.85,    // Expensive electronics, jewelry
                'medium': 0.70,  // Regular items
                'low': 0.55      // Common items
            };
            
            // Determine value category based on item category and description
            let valueCategory = 'medium';
            if (item.category === 'electronics' || /laptop|phone|tablet|airpod|watch/.test(item.description.toLowerCase())) {
                valueCategory = 'high';
            } else if (item.category === 'accessories' || item.category === 'clothing') {
                valueCategory = 'low';
            }
            
            const valueFactor = valueFactors[valueCategory];

            // Weather impact (if available)
            const weatherFactor = 0.85; // Assume good weather, would be lower in rain/snow

            // Calculate final probability
            const baseProb = categorySuccessRates[item.category] || categorySuccessRates['other'];
            const adjustedProb = baseProb * timeDecayFactor * locationFactor * valueFactor * weatherFactor;

            // Generate smart search zones based on item type and location
            const commonLocations = {
                'Cr 402': ['Cr 401', 'Cr 403', 'Library', 'Cafeteria'],
                'Library': ['Study Rooms', 'Cafeteria', 'Main Hall', 'Lost & Found Office'],
                'Cafeteria': ['Kitchen Area', 'Seating Area', 'Lost & Found Box', 'Main Hall'],
                'Main Hall': ['Information Desk', 'Security Office', 'Lost & Found', 'Reception']
            };

            // Get primary and secondary search zones
            const primaryZones = commonLocations[item.location] || ['Lost & Found Office', 'Security Desk'];
            const secondaryZones = ['Department Office', 'Student Services', 'Campus Security'];
            const searchZones = [...new Set([...primaryZones, ...secondaryZones])];

            // Generate time-sensitive recommendations
            const timeBasedTips = hoursSinceLost < 24 
                ? [
                    'Critical window: First 24 hours have highest recovery rate',
                    'Immediately retrace your steps in reverse order',
                    'Contact people who were with you',
                    'Check all locations visited in the last 2 hours'
                  ]
                : hoursSinceLost < 48
                ? [
                    'File a detailed report with campus security',
                    'Put up lost item notices in relevant buildings',
                    'Check lost & found locations twice daily',
                    'Monitor online lost & found groups'
                  ]
                : [
                    'Expand search to surrounding areas',
                    'Check with cleaning staff and security',
                    'Post in community forums',
                    'Consider replacement options while continuing search'
                  ];

            // Calculate urgency level based on item value and time
            const urgencyLevel = hoursSinceLost < 24 
                ? 'High'
                : hoursSinceLost < 48 && valueCategory === 'high'
                ? 'High'
                : hoursSinceLost < 48
                ? 'Medium'
                : 'Low';

            // Generate success factors with specific percentages
            const successFactors = [
                `Base Recovery Rate: ${Math.round(baseProb * 100)}% for ${item.category} items`,
                `Time Impact: ${Math.round(timeDecayFactor * 100)}% chance remaining due to ${Math.round(hoursSinceLost)} hours elapsed`,
                `Location Factor: ${Math.round(locationFactor * 100)}% recovery rate in ${item.location || 'this area'}`,
                `Item Value Impact: ${Math.round(valueFactor * 100)}% based on item type and value`,
                `Current Conditions: ${Math.round(weatherFactor * 100)}% favorable search conditions`
            ];

            const result = {
                recoveryProbability: Math.round(adjustedProb * 100),
                recommendedSearchZones: searchZones,
                smartPatterns: [
                    `Check ${item.location} thoroughly first`,
                    `Visit nearby ${searchZones[0]} and ${searchZones[1]}`,
                    `Contact staff in ${item.location}`,
                    'File report with campus security'
                ],
                timeBasedRecommendations: timeBasedTips,
                urgencyLevel: urgencyLevel,
                successFactors: successFactors
            };

            setAiAnalysisResult(result);
            setIsAnalyzing(false);
        }, 2000);
    };

    // Handle contact functionality
    const handleContact = (item) => {
        if (!auth.currentUser) {
            toast.error("Please login to contact the reporter");
            return;
        }

        // Create a mailto link with pre-filled subject and body
        const subject = `Regarding ${item.title} - ${item.status.toUpperCase()}`;
        const body = `Hi,\n\nI am writing regarding the ${item.status} item: ${item.title}\nLocation: ${item.location}\nDescription: ${item.description}\n\nPlease let me know if you have any information about this item.\n\nThank you`;
        
        const mailtoLink = `mailto:${item.contactInfo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    };

    const generateChatResponse = (message) => {
        const lowerMessage = message.toLowerCase();
        setIsTyping(true);

        // Helper function to format item details
        const formatItemDetails = (item) => `
            Item: ${item.title}
            Status: ${item.status}
            Location: ${item.location}
            Category: ${item.category}
        `;

        // Simulate typing delay
        return new Promise(resolve => {
            setTimeout(() => {
                let response = '';
                
                // Context-aware responses
                if (chatContext.itemDiscussion) {
                    if (lowerMessage.includes('where') || lowerMessage.includes('location')) {
                        response = `The item was last seen at ${chatContext.itemDiscussion.location}`;
                    } else if (lowerMessage.includes('when')) {
                        response = `The item was reported on ${chatContext.itemDiscussion.date.toLocaleDateString()}`;
                    } else if (lowerMessage.includes('contact')) {
                        response = "You can contact the person who reported this item using the 'Contact' button on the item card.";
                    }
                }

                // General queries
                if (!response) {
                    if (lowerMessage.includes('report') || lowerMessage.includes('lost')) {
                        response = `To report a lost item:
1. Click the 'Report Lost Item' button in your profile menu
2. Fill in the item details (be as specific as possible)
3. Add a clear description and any unique identifiers
4. Upload clear photos if available
5. Specify the last known location
6. Submit the report

Tips for better results:
• Include serial numbers if applicable
• Mention any distinctive marks or features
• Add multiple photos from different angles
• Be precise about the time and location last seen`;
                        
                        setChatContext({ ...chatContext, lastTopic: 'reporting' });
                    }
                    
                    else if (lowerMessage.includes('claim') || lowerMessage.includes('found item')) {
                        response = `To claim a found item:
1. Click on the item you want to claim
2. Use the 'Claim' button in the item details
3. Provide verification details when prompted
4. Wait for the owner to confirm your claim

Note: You'll need to:
• Verify your identity
• Provide proof of ownership
• Respond to any verification questions
• Meet in a safe location for item retrieval`;
                        
                        setChatContext({ ...chatContext, lastTopic: 'claiming' });
                    }
                    
                    else if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
                        response = `Search Tips:
1. Use specific keywords related to your item
2. Filter by category using the sidebar
3. Check both "Lost" and "Found" sections
4. Use the AI Analysis feature for smart search suggestions
5. Sort by date to find recent items first

Advanced Search Features:
• Use category filters
• Sort by date or relevance
• Check similar items
• Enable notifications for new matches`;
                        
                        setChatContext({ ...chatContext, lastTopic: 'searching' });
                    }
                    
                    else if (lowerMessage.includes('recent') || lowerMessage.includes('my items')) {
                        const userItems = items.filter(item => item.userId === auth.currentUser?.uid);
                        response = userItems.length > 0 
                            ? `Here are your recent items:\n${userItems.slice(0, 3).map(formatItemDetails).join('\n\n')}`
                            : "You haven't reported any items yet. Would you like to report a lost or found item?";
                    }
                    
                    else if (lowerMessage.includes('contact') || lowerMessage.includes('support')) {
                        response = `You can get support through:
1. Email: support@retrievio.com
2. Help Desk: Available 24/7
3. Campus Security: For urgent cases
4. Live Chat: Click the support icon

For immediate assistance:
• Use the AI Analysis feature
• Check our FAQ section
• Contact campus security for urgent cases`;
                    }
                    
                    else {
                        response = `I can help you with:
• Reporting lost items
• Claiming found items
• Searching effectively
• Viewing your items
• Getting support
• Understanding the process

What would you like to know more about?`;
                    }
                }

                setIsTyping(false);
                resolve(response);
            }, 1000);
        });
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (userMessage.trim() === '') return;

        // Add user message to chat
        setChatMessages([...chatMessages, { sender: 'user', text: userMessage }]);
        setUserMessage('');

        // Show typing indicator
        setIsTyping(true);

        // Generate response
        const response = await generateChatResponse(userMessage);
        
        // Add bot response to chat
        setChatMessages(prev => [...prev, { sender: 'bot', text: response }]);
    };

    const handleSuggestionClick = async (suggestion) => {
        setChatMessages(prev => [...prev, { sender: 'user', text: suggestion }]);
        
        // Show typing indicator
        setIsTyping(true);

        // Generate response
        const response = await generateChatResponse(suggestion);
        
        // Add bot response to chat
        setChatMessages(prev => [...prev, { sender: 'bot', text: response }]);
    };

    const clearChat = () => {
        setChatMessages([
            { sender: 'bot', text: 'Hello! I\'m your Lost & Found Assistant. How can I help you today?' }
        ]);
    };

    const generateAiDescription = async (item) => {
        setIsGeneratingDescription(true);
        try {
            // Simulate AI processing with a delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Get item details
            const category = item.category || 'item';
            const color = item.color || '';
            const location = item.location || '';
            const status = item.status || '';
            
            // Arrays of dynamic phrases for variety
            const introductions = [
                `I've analyzed this ${category} and here's what I found:`,
                `Based on my analysis, I can provide the following details:`,
                `After processing the information, here's my detailed description:`,
                `Let me help you with a comprehensive description:`,
            ];
            
            const colorPhrases = color ? [
                `appears to be ${color} in color`,
                `has a ${color} finish`,
                `comes in a ${color} shade`,
                `features a ${color} tone`
            ] : [];
            
            const locationPhrases = location ? [
                `was last seen at ${location}`,
                `was reported in the ${location} area`,
                `is located at ${location}`,
                `was discovered in ${location}`
            ] : [];
            
            const statusPhrases = {
                lost: [
                    "is currently missing",
                    "has been reported lost",
                    "is being searched for",
                    "needs to be located"
                ],
                found: [
                    "has been recovered",
                    "was recently found",
                    "is waiting to be claimed",
                    "has been turned in"
                ],
                claimed: [
                    "has been claimed",
                    "is under verification",
                    "is being processed",
                    "is pending confirmation"
                ]
            };
            
            // Helper function to get random element
            const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
            
            // Build the description with random variations
            let description = getRandom(introductions) + "\n\n";
            
            // Add item details with variations
            const details = [];
            if (colorPhrases.length) details.push(getRandom(colorPhrases));
            if (locationPhrases.length) details.push(getRandom(locationPhrases));
            if (status && statusPhrases[status]) details.push(getRandom(statusPhrases[status]));
            
            // Add category-specific details
            const categoryDetails = {
                electronics: [
                    "Please handle with care as electronic items can be sensitive.",
                    "Make sure to verify the device's identifiers when claiming.",
                    "The device may require charging before verification.",
                    "Consider providing the device's unlock pattern/code for verification."
                ],
                documents: [
                    "Contains potentially important information - handle with discretion.",
                    "May contain sensitive personal or official information.",
                    "Please bring identification when claiming this document.",
                    "Proper verification will be required for document release."
                ],
                accessories: [
                    "Check for any distinctive marks or patterns.",
                    "Note any brand labels or unique features.",
                    "May have sentimental value to the owner.",
                    "Look for any wear patterns that could help identify ownership."
                ],
                clothing: [
                    "Check for any labels or name tags.",
                    "Note any unique patterns or designs.",
                    "Look for any alterations or repairs.",
                    "Consider any specific wear patterns."
                ]
            };
            
            description += details.join(". ") + ".\n\n";
            
            if (categoryDetails[category?.toLowerCase()]) {
                description += "Additional Information:\n" + getRandom(categoryDetails[category.toLowerCase()]);
            }
            
            setAiDescription(description);
        } catch (error) {
            console.error('Error generating AI description:', error);
            toast.error('Failed to generate AI description');
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    useEffect(() => {
        // Initialize speech synthesis
        if (window.speechSynthesis) {
            setSpeechSynthesis(window.speechSynthesis);
        }
        
        // Cleanup function to stop speaking when component unmounts
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const handleSpeechToggle = () => {
        if (!speechSynthesis) {
            toast.error('Speech synthesis not supported in your browser');
            return;
        }

        if (isSpeaking) {
            speechSynthesis.cancel();
            setIsSpeaking(false);
        } else {
            // Start speaking all item descriptions
            filteredItems.forEach(item => {
                if (item) {
                    const utterance = new SpeechSynthesisUtterance(
                        `${item.title}. ${item.description}. Located at ${item.location}. Status: ${item.status}.`
                    );
                    speechSynthesis.speak(utterance);
                }
            });
            setIsSpeaking(true);
        }
    };

    const handleItemHover = (item) => {
        if (!speechSynthesis || !isSpeaking) {
            return;
        }

        setHoveredItem(item);
        speechSynthesis.cancel(); // Cancel any ongoing speech

        const utterance = new SpeechSynthesisUtterance(
            `${item.title}. ${item.description}. Located at ${item.location}. Status: ${item.status}.`
        );
        speechSynthesis.speak(utterance);
    };

    const handleItemLeave = () => {
        if (speechSynthesis) {
            speechSynthesis.cancel();
        }
        setHoveredItem(null);
    };

    return (
        <div className="home-container">
            <header>
                <h1>Retrievio - Lost and Found</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {isAdmin && (
                        <button 
                            onClick={() => navigate('/admin')}
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'linear-gradient(135deg, #4a90e2, #357abd)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <span>👑</span> Admin Panel
                        </button>
                    )}
                    <button 
                        onClick={handleSpeechToggle}
                        style={{
                            padding: '0.5rem 1rem',
                            background: isSpeaking 
                                ? 'linear-gradient(135deg, #ff6b6b, #ff8787)' 
                                : 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <FaVolumeUp /> {isSpeaking ? 'Stop Speech' : 'Start Speech'}
                    </button>
                <div className="profile-dropdown">
                    <div className="profile-circle" onClick={toggleDropdown}>
                            {userProfile?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    {showDropdown && (
                        <div className="dropdown-menu">
                                <button onClick={() => navigate("/profile")}>My Profile</button>
                            <button onClick={() => navigate("/report-lost")}>Report Lost Item</button>
                            <button onClick={() => navigate("/report-found")}>Report Found Item</button>
                                <button onClick={() => navigate("/settings")}>Settings</button>
                            <button onClick={handleLogout}>Logout</button>
                        </div>
                    )}
                    </div>
                </div>
            </header>

            <div className="content">
                {/* Left Sidebar */}
                <div className="sidebar">
                    <div className="welcome-section">
                        <h2>Welcome back, {userProfile?.firstName || 'User'}</h2>
                    </div>

                    <div className="search-filter-container">
                        <div className="search-bar">
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search lost or found items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="category-tags">
                            {categories.map(category => (
                                <button
                                    key={category.id}
                                    className={`category-tag ${selectedCategory === category.id ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(prev => prev === category.id ? '' : category.id)}
                                >
                                    <span>{category.icon}</span>
                                    {category.name}
                                </button>
                            ))}
                        </div>

                        <div className="filter-options">
                            <div className="filter-group">
                                <label className="filter-label">Sort By</label>
                                <select
                                    className="filter-select"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="latest">Latest First</option>
                                    <option value="oldest">Oldest First</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="main-content">
                    {loading ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                        </div>
                    ) : (
                        <div className="items-grid">
                            {filteredItems && filteredItems.length > 0 ? (
                                filteredItems.map((item) => (
                                    <div 
                                        key={item.id} 
                                        id={`post-${item.id}`} 
                                        className="item-card"
                                        onMouseEnter={() => handleItemHover(item)}
                                        onMouseLeave={handleItemLeave}
                                    >
                                        <ScreenReader item={item} />
                                        <div className="item-image">
                                            <img 
                                                src={item.image} 
                                                alt={item.title} 
                                                onError={(e) => {
                                                    e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                                                }}
                                            />
                                            <div className="item-overlay">
                                                <button 
                                                    className="view-details-btn"
                                                    onClick={() => handleViewDetails(item)}
                                                >
                                                    <span>View Details</span>
                                                    <i className="fas fa-arrow-right"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="item-content">
                                            <div className="item-header">
                                                <h3 className="item-title">{item.title}</h3>
                                                <span className={`status-badge status-${item.status}`}>
                                                    {item.status === 'lost' ? 'Lost' :
                                                     item.status === 'found' ? 'Found' :
                                                     item.status === 'available' ? 'Available' :
                                                     item.status === 'claimed' ? 'Claimed' :
                                                     item.status === 'reported' ? 'Reported' :
                                                     item.status === 'pending' ? 'Pending' : 'Processing'}
                                                </span>
                                            </div>
                                            <div className="item-details">
                                                <p className="item-description">{item.description}</p>
                                                <div className="item-info-grid">
                                                    <div className="item-location">
                                                        <i className="fas fa-map-marker-alt"></i>
                                                        <span>{item.location}</span>
                                                    </div>
                                                    {item.lastSeen && (
                                                        <div className="item-last-seen">
                                                            <i className="fas fa-clock"></i>
                                                            <span>Last seen: {item.lastSeen}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="item-footer">
                                                <div className="item-actions">
                                                    <button 
                                                        className="ai-analysis-button"
                                                        onClick={() => {
                                                            analyzeItemRecovery(item);
                                                            setShowAiAnalysis(true);
                                                        }}
                                                    >
                                                        <i className="fas fa-robot"></i>
                                                        AI Analysis
                                                    </button>
                                                    <button 
                                                        className={`contact-button ${item.claimStatus === 'inProcess' ? 'in-process' : ''}`}
                                                        onClick={() => handleContact(item)}
                                                    >
                                                        <i className="fas fa-envelope"></i>
                                                        Contact
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                            </div>
                        ))
                    ) : (
                                <div className="no-results">
                                    <h3>No items found</h3>
                                    <p>Try adjusting your search or filters to find what you're looking for.</p>
                                </div>
                    )}
                </div>
                    )}
            </div>
            </div>

            {/* Scroll to Top Button */}
            <button 
                className={`scroll-to-top ${showScrollTop ? 'visible' : ''}`}
                onClick={scrollToTop}
                aria-label="Scroll to top"
            >
                ↑
            </button>

            {/* Comment Modal */}
            <div className={`comment-modal-overlay ${modalActive ? 'active' : ''}`} onClick={handleCloseModal}>
                <div className="comment-modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3>{selectedItem?.title || 'Item Details'}</h3>
                        <button className="close-modal" onClick={handleCloseModal} aria-label="Close modal"></button>
                    </div>
                    <div className="modal-content">
                        <div className="modal-item-details">
                            <div className="modal-image-container">
                                <img 
                                    src={selectedItem?.image || 'https://via.placeholder.com/300'} 
                                    alt={selectedItem?.title || 'Item image'}
                                    onError={(e) => {e.target.src = 'https://via.placeholder.com/300'}}
                                />
                                <span className={`status-badge status-${selectedItem?.status || 'unknown'}`}>
                                    {(selectedItem?.status?.charAt(0).toUpperCase() + selectedItem?.status?.slice(1)) || 'Unknown'}
                                </span>
                            </div>
                            <div className="modal-info">
                                <div className="modal-title-section">
                                    <h2>{selectedItem?.title || 'Untitled'}</h2>
                                    <p className="modal-date">
                                        {selectedItem?.date.toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <div className="modal-description">
                                    <p>{selectedItem?.description || 'No description available'}</p>
                                </div>
                                <div className="modal-location">
                                    <i className="fas fa-map-marker-alt"></i>
                                    <span>{selectedItem?.location || 'Location not specified'}</span>
                                </div>
                                <div className="modal-category">
                                    <i className="fas fa-tag"></i>
                                    <span>{categories.find(cat => cat.id === selectedItem?.category)?.name || 'Other'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-comments-section">
                            <h4>Comments ({selectedItem?.comments?.length || 0})</h4>
                            <div className="modal-comments">
                                {selectedItem?.comments?.map((comment, index) => (
                                    <div key={`${selectedItem.id}-comment-${index}`} className="comment">
                                        <div className="comment-header">
                                            <div className="comment-user-info">
                                                <div className="comment-user-avatar">
                                                    {comment.userEmail?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <p className="comment-user">{comment.userEmail?.split('@')[0]}</p>
                                            </div>
                                            <p className="comment-time">
                                                {comment.timestamp instanceof Timestamp 
                                                    ? comment.timestamp.toDate().toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                    : new Date().toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                            </p>
                                        </div>
                                        <p className="comment-text">{comment.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="comment-input-container">
                            {showEmojiPicker && (
                                <div className="emoji-picker-container">
                                    <EmojiPicker
                                        onEmojiClick={onEmojiClick}
                                        theme="dark"
                                        width={300}
                                    />
                                </div>
                            )}
                            <button 
                                className="emoji-trigger"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            >
                                😊
                            </button>
                            <textarea
                                placeholder="Write a comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (newComment.trim()) {
                                            handleAddComment();
                                        }
                                    }
                                }}
                            />
                            <button 
                                className="post-comment-btn"
                                onClick={handleAddComment}
                                disabled={!newComment.trim()}
                            >
                                Post
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {selectedPost && (
                <div className="post-modal-overlay" onClick={handleCloseModal}>
                    <div className="post-modal" onClick={e => e.stopPropagation()}>
                        <button className="close-modal" onClick={handleCloseModal} aria-label="Close modal"></button>
                        <div className="post-modal-image">
                            <img src={selectedPost.image} alt={selectedPost.title} />
                        </div>
                        <div className="post-modal-content">
                            <div className="post-modal-header">
                                <h2 className="post-modal-title">{selectedPost.title}</h2>
                            </div>
                            <div className="post-modal-body">
                                <p className="post-modal-description">{selectedPost.description}</p>
                                
                                <div className="claim-section">
                                    <h3>Claim this item</h3>
                                    <p>If this is your item, click below to claim it.</p>
                                    <button 
                                        className={`claim-button ${
                                            selectedPost?.claimStatus === 'pending' ? 'pending' : 
                                            selectedPost?.claimStatus === 'claimed' ? 'claimed' : ''
                                        }`}
                                        onClick={() => handleClaimItem(selectedPost)}
                                        disabled={
                                            !auth.currentUser ||
                                            selectedPost?.claimStatus === 'claimed' || 
                                            (selectedPost?.claimStatus === 'pending' && selectedPost?.claimedBy && selectedPost?.claimedBy !== auth.currentUser?.uid)
                                        }
                                    >
                                        {!auth.currentUser ? 'Login to Claim' :
                                         selectedPost?.claimStatus === 'claimed' ? 'Already Claimed' :
                                         selectedPost?.claimStatus === 'pending' && selectedPost?.claimedBy === auth.currentUser?.uid ? 'Your Claim is Pending' :
                                         selectedPost?.claimStatus === 'pending' ? 'Item Has Pending Claim' :
                                         'Claim Item'}
                                    </button>
                                </div>

                                <div className="comments-section">
                                    <div className="comments-header">
                                        <h3>Comments</h3>
                                        <span className="comments-count">{comments.length} comments</span>
                                    </div>

                                    <div className="comments-list">
                                        {comments.map((comment) => (
                                            <div key={comment.id} className="comment">
                                                <div className="comment-header">
                                                    <div className="comment-user-info">
                                                        <div className="comment-user-avatar">
                                                            {comment.username?.[0]?.toUpperCase()}
                                                        </div>
                                                        <span className="comment-username">{comment.username}</span>
                                                    </div>
                                                    <span className="comment-time">
                                                        {comment.timestamp?.toDate().toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="comment-text">{comment.text}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="comment-input-section">
                                        <div className="comment-input-wrapper">
                                            <input
                                                type="text"
                                                className="comment-input"
                                                placeholder="Add a comment..."
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleCommentSubmit(selectedPost.id);
                                                    }
                                                }}
                                            />
                                        </div>
                                        <button
                                            className="post-comment-button"
                                            disabled={!comment.trim()}
                                            onClick={() => handleCommentSubmit(selectedPost.id)}
                                        >
                                            Post
                                        </button>
                                    </div>
                                </div>

                                <div className="ai-feature-section">
                                    <button 
                                        className="ai-feature-toggle"
                                        onClick={() => setShowAiFeature(!showAiFeature)}
                                    >
                                        <FaRobot /> AI Description Assistant
                                    </button>
                                    
                                    {showAiFeature && (
                                        <div className="ai-description-section">
                                            <div className="ai-feature-header">
                                                <h3>AI Description Generator</h3>
                                                <div className="ai-buttons">
                                                    <button 
                                                        className="generate-button"
                                                        onClick={() => generateAiDescription(selectedItem)}
                                                        disabled={isGeneratingDescription}
                                                    >
                                                        {isGeneratingDescription ? (
                                                            <>
                                                                <FaSpinner className="spin" /> Generating...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <FaRobot /> Generate Description
                                                            </>
                                                        )}
                                                    </button>
                                                    {aiDescription && (
                                                        <button 
                                                            className="regenerate-button"
                                                            onClick={() => generateAiDescription(selectedItem)}
                                                            disabled={isGeneratingDescription}
                                                        >
                                                            <FaSync className={isGeneratingDescription ? 'spin' : ''} />
                                                            Regenerate
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {aiDescription && (
                                                <div className="ai-description-container">
                                                    <div className="ai-description">
                                                        {aiDescription.split('\n').map((line, i) => (
                                                            <p key={i}>{line}</p>
                                                        ))}
                                                    </div>
                                                    <button 
                                                        className="copy-button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(aiDescription);
                                                            toast.success('Description copied to clipboard!');
                                                        }}
                                                    >
                                                        <FaCopy /> Copy
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add AI Analysis Modal */}
            {showAiAnalysis && aiAnalysisResult && (
                <div className="ai-analysis-modal">
                    <div className="ai-analysis-content">
                        <button className="close-button" onClick={() => setShowAiAnalysis(false)}>×</button>
                        <h2>AI Recovery Analysis</h2>
                        
                        <div className="analysis-section">
                            <h3>Recovery Probability</h3>
                            <div className="probability-meter">
                                <div 
                                    className="probability-fill"
                                    style={{width: `${aiAnalysisResult.recoveryProbability}%`}}
                                >
                                    {aiAnalysisResult.recoveryProbability}%
                                </div>
                            </div>
                        </div>

                        <div className="analysis-section">
                            <h3>Urgency Level: {aiAnalysisResult.urgencyLevel}</h3>
                            <div className={`urgency-indicator ${aiAnalysisResult.urgencyLevel.toLowerCase()}`}>
                                {aiAnalysisResult.urgencyLevel}
                            </div>
                        </div>

                        <div className="analysis-section">
                            <h3>Recommended Search Zones</h3>
                            <div className="search-zones">
                                {aiAnalysisResult.recommendedSearchZones.map((zone, index) => (
                                    <div key={index} className="search-zone-tag">
                                        {zone}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="analysis-section">
                            <h3>Smart Search Patterns</h3>
                            <ul className="smart-patterns">
                                {aiAnalysisResult.smartPatterns.map((pattern, index) => (
                                    <li key={index}>{pattern}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="analysis-section">
                            <h3>Time-Based Recommendations</h3>
                            <ul className="time-recommendations">
                                {aiAnalysisResult.timeBasedRecommendations.map((tip, index) => (
                                    <li key={index}>{tip}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="analysis-section">
                            <h3>Success Factors</h3>
                            <ul className="success-factors">
                                {aiAnalysisResult.successFactors.map((factor, index) => (
                                    <li key={index}>{factor}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Add ToastContainer at the end of the component */}
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
            />

            {chatOpen && (
                <div className="chat-interface">
                    <div className="chat-header">
                        <div className="chat-title">
                            Retrievio Assistant
                        </div>
                        <div className="chat-actions">
                            <button onClick={clearChat} className="clear-chat" title="Clear chat">
                                Clear
                            </button>
                        </div>
                    </div>
                    
                    <div className="chat-messages">
                        {chatMessages.map((msg, index) => (
                            <div key={index} className={`message ${msg.sender}-message`}>
                                {msg.text}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        )}
                    </div>

                    <div className="chat-suggestions">
                        {suggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                className="suggestion-chip"
                                onClick={() => handleSuggestionClick(suggestion)}
                            >
                                {suggestion}
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleChatSubmit} className="chat-form">
                        <input
                            type="text"
                            value={userMessage}
                            onChange={(e) => setUserMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="chat-input"
                        />
                        <button 
                            type="submit" 
                            className="chat-submit"
                            disabled={!userMessage.trim()}
                        >
                            Send
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Home;