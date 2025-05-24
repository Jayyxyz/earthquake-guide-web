import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, doc, setDoc, getDoc, getDocs, query, where, 
  onSnapshot, serverTimestamp, writeBatch, arrayUnion, 
  arrayRemove, updateDoc, deleteDoc 
} from 'firebase/firestore';
import { db } from './firebase';

const MessagingTab = ({ user }) => {
  // State management
  const [contacts, setContacts] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [activeGroupChat, setActiveGroupChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [groupMessages, setGroupMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [showGroupChatModal, setShowGroupChatModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  const [showGroupList, setShowGroupList] = useState(false);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const messagesEndRef = useRef(null);

  // Helper function to generate chat ID
  const getChatId = (uid1, uid2) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  };

  // Fetch user data and set up listeners
  useEffect(() => {
    if (!user?.uid) return;

    const fetchInitialData = async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setContacts(userDoc.data().contacts || []);
        setEmergencyContacts(userDoc.data().emergencyContacts || []);
        
        // Fetch user's group chats
        const groupChatsQuery = query(
          collection(db, 'groupChats'),
          where('members', 'array-contains', user.uid)
        );
        const groupChatsSnapshot = await getDocs(groupChatsQuery);
        setGroupChats(groupChatsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));
      }
    };

    fetchInitialData();

    // Real-time listeners
    const userUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setContacts(doc.data().contacts || []);
        setEmergencyContacts(doc.data().emergencyContacts || []);
      }
    });

    const requestsUnsubscribe = onSnapshot(
      collection(db, 'users', user.uid, 'pendingRequests'),
      (snapshot) => {
        setPendingRequests(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));
      }
    );

    const groupChatsUnsubscribe = onSnapshot(
      query(
        collection(db, 'groupChats'),
        where('members', 'array-contains', user.uid)
      ),
      (snapshot) => {
        setGroupChats(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));
      }
    );

    return () => {
      userUnsubscribe();
      requestsUnsubscribe();
      groupChatsUnsubscribe();
    };
  }, [user?.uid]);

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChat && !activeGroupChat) return;

    let unsubscribe;

    if (activeChat) {
      const chatId = getChatId(user.uid, activeChat);
      unsubscribe = onSnapshot(
        collection(db, 'chats', chatId, 'messages'),
        (snapshot) => {
          const chatMessages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setMessages(prev => ({
            ...prev,
            [activeChat]: chatMessages.sort((a, b) => 
              (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0))
          }));
          scrollToBottom();
        }
      );
    } else if (activeGroupChat) {
      unsubscribe = onSnapshot(
        collection(db, 'groupChats', activeGroupChat, 'messages'),
        (snapshot) => {
          const chatMessages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setGroupMessages(prev => ({
            ...prev,
            [activeGroupChat]: chatMessages.sort((a, b) => 
              (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0))
          }));
          scrollToBottom();
        }
      );
    }

    return () => unsubscribe && unsubscribe();
  }, [activeChat, activeGroupChat, user?.uid]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Message handling
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      if (activeChat) {
        const chatId = getChatId(user.uid, activeChat);
        const messageRef = doc(collection(db, 'chats', chatId, 'messages'));
        
        await setDoc(messageRef, {
          text: newMessage,
          sender: user.uid,
          timestamp: serverTimestamp()
        });
      } else if (activeGroupChat) {
        const messageRef = doc(collection(db, 'groupChats', activeGroupChat, 'messages'));
        
        await setDoc(messageRef, {
          text: newMessage,
          sender: user.uid,
          senderName: user.displayName || user.email,
          timestamp: serverTimestamp()
        });
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Group chat functions
  const handleCreateGroupChat = async () => {
    if (!groupName.trim() || selectedContacts.length < 1) {
      alert('Please provide a group name and select at least one contact');
      return;
    }

    try {
      const groupRef = doc(collection(db, 'groupChats'));
      
      await setDoc(groupRef, {
        name: groupName,
        creator: user.uid,
        members: [user.uid, ...selectedContacts],
        createdAt: serverTimestamp()
      });

      setGroupName('');
      setSelectedContacts([]);
      setShowGroupChatModal(false);
      alert('Group chat created successfully!');
    } catch (error) {
      console.error('Error creating group chat:', error);
      alert('Failed to create group chat');
    }
  };

  const toggleContactSelection = (contactId) => {
    setSelectedContacts(prev => 
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleLeaveGroupChat = async (groupId) => {
    if (!window.confirm('Are you sure you want to leave this group chat?')) return;

    try {
      const groupRef = doc(db, 'groupChats', groupId);
      
      // Remove user from members list
      await updateDoc(groupRef, {
        members: arrayRemove(user.uid)
      });

      // If user was the creator, assign new creator or delete if last member
      const groupDoc = await getDoc(groupRef);
      if (groupDoc.exists()) {
        const groupData = groupDoc.data();
        if (groupData.creator === user.uid && groupData.members.length === 1) {
          // User was the last member, delete the group
          await deleteDoc(groupRef);
          
          // Delete all messages in the group
          const messagesRef = collection(db, 'groupChats', groupId, 'messages');
          const messagesSnapshot = await getDocs(messagesRef);
          const batch = writeBatch(db);
          messagesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
        } else if (groupData.creator === user.uid) {
          // Assign new creator (first other member)
          const newCreator = groupData.members.find(member => member !== user.uid);
          await updateDoc(groupRef, {
            creator: newCreator
          });
        }
      }

      // Reset active group if leaving the current one
      if (activeGroupChat === groupId) {
        setActiveGroupChat(null);
      }

      alert('You have left the group chat');
    } catch (error) {
      console.error('Error leaving group chat:', error);
      alert('Failed to leave group chat');
    }
  };

  const handleDeleteGroupChat = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group chat? This cannot be undone.')) return;

    try {
      const groupRef = doc(db, 'groupChats', groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (!groupDoc.exists()) return;
      
      const groupData = groupDoc.data();
      
      // Only creator can delete the group
      if (groupData.creator !== user.uid) {
        alert('Only the group creator can delete the group');
        return;
      }

      // Delete all messages first
      const messagesRef = collection(db, 'groupChats', groupId, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      const batch = writeBatch(db);
      messagesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Then delete the group
      await deleteDoc(groupRef);

      // Reset active group if deleting the current one
      if (activeGroupChat === groupId) {
        setActiveGroupChat(null);
      }

      alert('Group chat deleted successfully');
    } catch (error) {
      console.error('Error deleting group chat:', error);
      alert('Failed to delete group chat');
    }
  };

  // Friend request handling
  const handleSendFriendRequest = async (email) => {
    if (!email || !user?.uid) return;

    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(
        query(usersRef, where('email', '==', email))
      );

      if (querySnapshot.empty) {
        alert('User not found');
        return;
      }

      const recipient = querySnapshot.docs[0];
      if (recipient.id === user.uid) {
        alert("You can't add yourself");
        return;
      }

      const existingContact = contacts.find(c => c.id === recipient.id);
      if (existingContact) {
        alert('This user is already in your contacts');
        return;
      }

      const existingRequest = pendingRequests.find(
        req => req.fromId === user.uid && req.fromEmail === email
      );
      if (existingRequest) {
        alert('Request already sent');
        return;
      }

      const requestRef = doc(collection(db, 'users', recipient.id, 'pendingRequests'));
      await setDoc(requestRef, {
        fromId: user.uid,
        fromName: user.displayName || user.email.split('@')[0],
        fromEmail: user.email,
        timestamp: serverTimestamp()
      });

      alert('Friend request sent!');
      setContactEmail('');
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send request');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const requestRef = doc(db, 'users', user.uid, 'pendingRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      
      if (!requestDoc.exists()) return;

      const requestData = requestDoc.data();
      
      const batch = writeBatch(db);
      
      const currentUserRef = doc(db, 'users', user.uid);
      batch.update(currentUserRef, {
        contacts: arrayUnion({
          id: requestData.fromId,
          name: requestData.fromName,
          email: requestData.fromEmail
        })
      });
      
      const requesterRef = doc(db, 'users', requestData.fromId);
      batch.update(requesterRef, {
        contacts: arrayUnion({
          id: user.uid,
          name: user.displayName || user.email.split('@')[0],
          email: user.email
        })
      });
      
      batch.delete(requestRef);
      
      await batch.commit();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'pendingRequests', requestId));
    } catch (error) {
      console.error('Error declining request:', error);
    }
  };

  // Friend removal
  const handleRemoveFriend = async (contactId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;

    try {
      const contactToRemove = contacts.find(c => c.id === contactId);
      if (!contactToRemove) return;

      const batch = writeBatch(db);

      // Remove from current user's contacts
      const currentUserRef = doc(db, 'users', user.uid);
      batch.update(currentUserRef, {
        contacts: arrayRemove(contactToRemove)
      });

      // Remove from emergency contacts if present
      if (emergencyContacts.includes(contactId)) {
        batch.update(currentUserRef, {
          emergencyContacts: arrayRemove(contactId)
        });
      }

      // Remove current user from the contact's friend list
      const contactUserRef = doc(db, 'users', contactId);
      const currentUserAsContact = {
        id: user.uid,
        name: user.displayName || user.email.split('@')[0],
        email: user.email
      };
      batch.update(contactUserRef, {
        contacts: arrayRemove(currentUserAsContact)
      });

      // Remove from their emergency contacts if needed
      const contactDoc = await getDoc(contactUserRef);
      if (contactDoc.exists() && contactDoc.data().emergencyContacts?.includes(user.uid)) {
        batch.update(contactUserRef, {
          emergencyContacts: arrayRemove(user.uid)
        });
      }

      await batch.commit();

      if (activeChat === contactId) {
        setActiveChat(null);
      }

      alert('Friend removed successfully');
    } catch (error) {
      console.error('Error removing friend:', error);
      alert('Failed to remove friend');
    }
  };

  // Emergency contact handling
  const handleAddEmergencyContact = async (contactId) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        emergencyContacts: arrayUnion(contactId)
      });
    } catch (error) {
      console.error('Error adding emergency contact:', error);
    }
  };

  const handleRemoveEmergencyContact = async (contactId) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        emergencyContacts: arrayRemove(contactId)
      });
    } catch (error) {
      console.error('Error removing emergency contact:', error);
    }
  };

  return (
    <section className="messaging-tab">
      <h2>Messaging</h2>

      <div className="messaging-container">
        <div className="contacts-list">
          <div className="contacts-header">
            <h3>Your Contacts</h3>
            <div className="contacts-header-buttons">
              {pendingRequests.length > 0 && (
                <button 
                  onClick={() => setShowRequests(!showRequests)}
                  className={`requests-button ${showRequests ? 'active' : ''}`}
                >
                  {showRequests ? 'Show Contacts' : `Requests (${pendingRequests.length})`}
                </button>
              )}
              <button 
                onClick={() => setShowGroupChatModal(true)}
                className="create-group-button"
              >
                Create Group
              </button>
            </div>
          </div>

          <div className="add-contact-form">
            <input
              type="email"
              placeholder="Add by email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            <button 
              onClick={() => handleSendFriendRequest(contactEmail)}
              disabled={!contactEmail.includes('@')}
            >
              Send Request
            </button>
          </div>

          {showRequests ? (
            <div className="requests-section">
              <div className="requests-header">
                <button 
                  onClick={() => setShowRequests(false)}
                  className="back-button"
                >
                  ← Back to Contacts
                </button>
                <h4>Pending Friend Requests</h4>
              </div>
              {pendingRequests.length === 0 ? (
                <p className="no-requests">No pending requests</p>
              ) : (
                <ul className="requests-list">
                  {pendingRequests.map((request) => (
                    <li key={request.id} className="request-item">
                      <div className="request-info">
                        <span className="request-name">{request.fromName}</span>
                        <span className="request-email">{request.fromEmail}</span>
                      </div>
                      <div className="request-actions">
                        <button 
                          onClick={() => handleAcceptRequest(request.id)}
                          className="accept-btn"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => handleDeclineRequest(request.id)}
                          className="decline-btn"
                        >
                          Decline
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              <div className="chat-type-tabs">
                <button 
                  className={!showGroupList ? 'active' : ''}
                  onClick={() => setShowGroupList(false)}
                >
                  Individual Chats
                </button>
                <button 
                  className={showGroupList ? 'active' : ''}
                  onClick={() => setShowGroupList(true)}
                >
                  Group Chats
                </button>
              </div>

              {!showGroupList ? (
                <ul className="contacts">
                  {contacts.map((contact) => (
                    <li
                      key={contact.id}
                      className={`contact-item ${activeChat === contact.id ? 'active' : ''}`}
                    >
                      <div 
                        className="contact-info"
                        onClick={() => {
                          setActiveChat(contact.id);
                          setActiveGroupChat(null);
                        }}
                      >
                        <span className="contact-name">{contact.name || contact.email.split('@')[0]}</span>
                        <span className="contact-email">{contact.email}</span>
                      </div>
                      <div className="contact-actions">
                        {emergencyContacts.includes(contact.id) ? (
                          <button
                            className="emergency-btn active"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveEmergencyContact(contact.id);
                            }}
                            title="Remove from emergency contacts"
                          >
                            ★ Remove Emergency Contact
                          </button>
                        ) : (
                          <button
                            className="emergency-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddEmergencyContact(contact.id);
                            }}
                            title="Add to emergency contacts"
                          >
                            ☆ Add Emergency Contact
                          </button>
                        )}
                        <button
                          className="delete-friend-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFriend(contact.id);
                          }}
                          title="Remove friend"
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="group-chats">
                  {groupChats.map((group) => (
                    <li
                      key={group.id}
                      className={`group-item ${activeGroupChat === group.id ? 'active' : ''}`}
                      onClick={() => {
                        setActiveGroupChat(group.id);
                        setActiveChat(null);
                      }}
                    >
                      <div className="group-info">
                        <span className="group-name">{group.name}</span>
                        <span className="group-members">
                          {group.members.length} members • {group.creator === user.uid ? 'Owner' : 'Member'}
                        </span>
                      </div>
                      <div className="group-actions">
                        <button
                          className="group-action-btn leave-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLeaveGroupChat(group.id);
                          }}
                          title="Leave group"
                        >
                          Leave
                        </button>
                        {group.creator === user.uid && (
                          <button
                            className="group-action-btn delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroupChat(group.id);
                            }}
                            title="Delete group"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="chat-area">
          {activeChat ? (
            <>
              <div className="chat-header">
                <h3>
                  {contacts.find(c => c.id === activeChat)?.name || contacts.find(c => c.id === activeChat)?.email.split('@')[0]}
                  {emergencyContacts.includes(activeChat) && (
                    <span className="emergency-badge">Emergency Contact</span>
                  )}
                </h3>
              </div>

              <div className="messages-container">
                {messages[activeChat]?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message ${msg.sender === user.uid ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">
                      {msg.text}
                    </div>
                    <div className="message-time">
                      {msg.timestamp?.toDate().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) || 'Now'}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="message-input">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                >
                  Send
                </button>
              </div>
            </>
          ) : activeGroupChat ? (
            <>
              <div className="chat-header">
                <div className="chat-header-info">
                  <h3>
                    {groupChats.find(g => g.id === activeGroupChat)?.name || 'Group Chat'}
                    <span className="group-members-count">
                      ({groupChats.find(g => g.id === activeGroupChat)?.members.length || 0} members)
                    </span>
                  </h3>
                  {groupChats.find(g => g.id === activeGroupChat)?.creator === user.uid && (
                    <span className="group-owner-badge">Owner</span>
                  )}
                </div>
                <button
                  className="group-management-btn"
                  onClick={() => setShowGroupManagement(!showGroupManagement)}
                  title="Group options"
                >
                  ⋮
                </button>
                {showGroupManagement && (
                  <div className="group-management-menu">
                    <button
                      onClick={() => {
                        handleLeaveGroupChat(activeGroupChat);
                        setShowGroupManagement(false);
                      }}
                    >
                      Leave Group
                    </button>
                    {groupChats.find(g => g.id === activeGroupChat)?.creator === user.uid && (
                      <button
                        onClick={() => {
                          handleDeleteGroupChat(activeGroupChat);
                          setShowGroupManagement(false);
                        }}
                        className="delete-option"
                      >
                        Delete Group
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="messages-container">
                {groupMessages[activeGroupChat]?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message ${msg.sender === user.uid ? 'sent' : 'received'}`}
                  >
                    <div className="message-sender">
                      {msg.sender === user.uid ? 'You' : msg.senderName}
                    </div>
                    <div className="message-content">
                      {msg.text}
                    </div>
                    <div className="message-time">
                      {msg.timestamp?.toDate().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) || 'Now'}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="message-input">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="no-chat-selected">
              <p>Select a contact or group to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {/* Group Chat Creation Modal */}
      {showGroupChatModal && (
        <div className="modal-overlay">
          <div className="group-chat-modal">
            <div className="modal-header">
              <h3>Create New Group Chat</h3>
              <button 
                onClick={() => {
                  setShowGroupChatModal(false);
                  setGroupName('');
                  setSelectedContacts([]);
                }}
                className="close-button"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="group-name-input"
              />
              <h4>Select Contacts to Add</h4>
              <ul className="contact-selection-list">
                {contacts.map(contact => (
                  <li key={contact.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => toggleContactSelection(contact.id)}
                      />
                      <span className="contact-name">{contact.name || contact.email.split('@')[0]}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button
                onClick={handleCreateGroupChat}
                disabled={!groupName.trim() || selectedContacts.length === 0}
              >
                Create Group
              </button>
              <button
                onClick={() => {
                  setShowGroupChatModal(false);
                  setGroupName('');
                  setSelectedContacts([]);
                }}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default MessagingTab;