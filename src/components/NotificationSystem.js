import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { FaBell } from 'react-icons/fa';
import './NotificationSystem.css';

const NotificationSystem = ({ user }) => {
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('userId', 'in', [user.uid, 'admin']),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newNotifications = snapshot.docs.map(doc => {
                const data = doc.data();
                const timestamp = data.timestamp;
                return {
                    id: doc.id,
                    ...data,
                    timestamp: timestamp && typeof timestamp.toDate === 'function' 
                        ? timestamp.toDate() 
                        : new Date(timestamp || Date.now())
                };
            });
            setNotifications(newNotifications);
            setUnreadCount(newNotifications.filter(n => !n.read).length);
        });

        return () => unsubscribe();
    }, [user]);

    const markAsRead = async (notificationId) => {
        try {
            const notificationRef = doc(db, 'notifications', notificationId);
            await updateDoc(notificationRef, {
                read: true
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
        // Handle navigation or other actions based on notification type
        setShowNotifications(false);
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp || !(timestamp instanceof Date)) return '';
        
        const now = new Date();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    // Close notifications when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showNotifications && !event.target.closest('.notification-system')) {
                setShowNotifications(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showNotifications]);

    return (
        <div className="notification-system">
            <div 
                className="notification-bell" 
                onClick={(e) => {
                    e.stopPropagation();
                    setShowNotifications(!showNotifications);
                }}
            >
                <FaBell />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </div>

            {showNotifications && (
                <div className="notifications-dropdown">
                    <div className="notifications-header">
                        <h3>Notifications</h3>
                    </div>
                    <div className="notifications-list">
                        {notifications.length === 0 ? (
                            <div className="no-notifications">No notifications</div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${!notification.read ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-content">
                                        <p>{notification.message}</p>
                                        <span className="notification-time">
                                            {formatTimestamp(notification.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationSystem; 