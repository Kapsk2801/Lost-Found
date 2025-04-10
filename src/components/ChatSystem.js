import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, addDoc, onSnapshot, where, serverTimestamp } from 'firebase/firestore';
import { FaComments, FaPaperPlane, FaTimes, FaShare } from 'react-icons/fa';
import './ChatSystem.css';

const ChatSystem = ({ user, isAdmin }) => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const messagesEndRef = useRef(null);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    useEffect(() => {
        if (!user) return;

        // Query messages for current user or all messages if admin
        const messagesQuery = isAdmin 
            ? query(collection(db, 'chatting'), orderBy('timestamp', 'asc'))
            : query(
                collection(db, 'chatting'),
                where('userId', 'in', [user.uid, 'admin']),
                orderBy('timestamp', 'asc')
            );

        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            const messagesList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate() || new Date()
            }));
            setMessages(messagesList);
            setInitialLoadComplete(true);
            scrollToBottom();
        });

        return () => unsubscribe();
    }, [user, isAdmin]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim() || !user) return;

        const currentTime = new Date();
        const newMessage = {
            text: message.trim(),
            userId: user.uid,
            userEmail: user.email,
            isAdmin: isAdmin,
            timestamp: currentTime,
            read: false
        };

        // Optimistically add message to UI
        const tempId = 'temp-' + Date.now();
        setMessages(prevMessages => [...prevMessages, {
            ...newMessage,
            id: tempId,
            pending: true
        }]);
        setMessage('');
        scrollToBottom();

        try {
            // Add message to Firebase
            const docRef = await addDoc(collection(db, 'chatting'), {
                ...newMessage,
                timestamp: serverTimestamp()
            });

            // Create notification for the recipient
            const notificationsRef = collection(db, 'notifications');
            const notificationData = {
                userId: isAdmin ? user.uid : 'admin', // If sender is admin, notify user; if user, notify admin
                message: `New message from ${isAdmin ? 'Admin' : user.email.split('@')[0]}: ${message.trim().substring(0, 50)}${message.trim().length > 50 ? '...' : ''}`,
                type: 'new_message',
                chatMessageId: docRef.id,
                timestamp: serverTimestamp(),
                read: false,
                senderId: user.uid,
                senderEmail: user.email,
                senderIsAdmin: isAdmin
            };
            await addDoc(notificationsRef, notificationData);

            // Update the temporary message with the real ID
            setMessages(prevMessages => 
                prevMessages.map(msg => 
                    msg.id === tempId 
                        ? { ...msg, id: docRef.id, pending: false }
                        : msg
                )
            );
        } catch (error) {
            console.error('Error sending message:', error);
            // Remove the temporary message if sending failed
            setMessages(prevMessages => 
                prevMessages.filter(msg => msg.id !== tempId)
            );
        }
    };

    const handleSharedPost = async (post) => {
        if (!user) return;

        const currentTime = new Date();
        const sharedMessage = {
            text: `Shared a ${post.status} item: ${post.title}`,
            userId: user.uid,
            userEmail: user.email,
            isAdmin: isAdmin,
            timestamp: currentTime,
            read: false,
            isSharedPost: true,
            postDetails: {
                id: post.id,
                title: post.title,
                description: post.description,
                image: post.image,
                status: post.status,
                category: post.category,
                location: post.location
            }
        };

        try {
            await addDoc(collection(db, 'chatting'), {
                ...sharedMessage,
                timestamp: serverTimestamp()
            });
            setIsChatOpen(true);
            scrollToBottom();
        } catch (error) {
            console.error('Error sharing post:', error);
        }
    };

    const formatMessageTime = (timestamp) => {
        if (!timestamp) return '';
        return timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>
            {/* Chat Button */}
            <button 
                className={`chat-button ${isChatOpen ? 'active' : ''}`}
                onClick={() => setIsChatOpen(!isChatOpen)}
            >
                {isChatOpen ? <FaTimes /> : <FaComments />}
            </button>

            {/* Chat Window */}
            {isChatOpen && (
                <div className="chat-window">
                    <div className="chat-header">
                        <h3>{isAdmin ? 'Admin Chat Support' : 'Chat with Admin'}</h3>
                        <button 
                            className="close-chat"
                            onClick={() => setIsChatOpen(false)}
                        >
                            <FaTimes />
                        </button>
                    </div>

                    <div className="chat-messages">
                        {messages.length === 0 && initialLoadComplete ? (
                            <div className="no-messages">
                                No messages yet. Start a conversation!
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div 
                                    key={msg.id}
                                    className={`message ${msg.isAdmin ? 'admin' : 'user'} ${
                                        msg.userId === user.uid ? 'sent' : 'received'
                                    } ${msg.pending ? 'pending' : ''} ${msg.isSharedPost ? 'shared-post' : ''}`}
                                >
                                    <div className="message-content">
                                        {msg.userId !== user.uid && (
                                            <div className="message-sender">
                                                {msg.isAdmin ? 'Admin' : msg.userEmail.split('@')[0]}
                                            </div>
                                        )}
                                        {msg.isSharedPost ? (
                                            <div className="shared-post-content">
                                                <div className="shared-post-header">
                                                    <FaShare className="share-icon" />
                                                    <span>Shared Item</span>
                                                </div>
                                                <div className="shared-post-details">
                                                    <h4>{msg.postDetails.title}</h4>
                                                    <p>{msg.postDetails.description}</p>
                                                    <div className="shared-post-meta">
                                                        <span className="status">{msg.postDetails.status}</span>
                                                        <span className="category">{msg.postDetails.category}</span>
                                                        <span className="location">{msg.postDetails.location}</span>
                                                    </div>
                                                    {msg.postDetails.image && (
                                                        <img 
                                                            src={msg.postDetails.image} 
                                                            alt={msg.postDetails.title}
                                                            className="shared-post-image"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <p>{msg.text}</p>
                                        )}
                                        <span className="message-time">
                                            {formatMessageTime(msg.timestamp)}
                                            {msg.pending && ' ●'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSubmit} className="chat-input-form">
                        <div className="chat-input-container">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="chat-input"
                                autoComplete="off"
                            />
                            <button 
                                type="submit"
                                className="send-button"
                                disabled={!message.trim()}
                                aria-label="Send message"
                            >
                                <FaPaperPlane />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};

export default ChatSystem; 