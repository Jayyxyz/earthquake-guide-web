import React, { useRef, useEffect } from 'react';

function MessagingTab({ 
  user, 
  contacts, 
  messages, 
  activeChat, 
  setActiveChat, 
  newMessage, 
  setNewMessage, 
  handleSendMessage,
  handleAddContact,
  contactEmail,
  setContactEmail,
  emergencyContacts,
  handleAddEmergencyContact,
  handleRemoveEmergencyContact,
  users // All registered users
}) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChat]);

  return (
    <section className="messaging-tab">
      <h2>Emergency Messaging</h2>
      
      <div className="messaging-container">
        {/* Contacts List */}
        <div className="contacts-list">
          <h3>Your Contacts</h3>
          
          {/* Add Contact Form */}
          <div className="add-contact-form">
            <input
              type="email"
              placeholder="Add by email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              list="registeredUsers"
            />
            <datalist id="registeredUsers">
              {users.map(user => (
                <option key={user.id} value={user.email}>
                  {user.name}
                </option>
              ))}
            </datalist>
            <button onClick={() => handleAddContact(contactEmail)}>Add</button>
          </div>
          
          <ul>
            {contacts.map(contact => (
              <li 
                key={contact.email}
                className={activeChat === contact.email ? 'active' : ''}
                onClick={() => setActiveChat(contact.email)}
              >
                <span className="contact-name">{contact.name}</span>
                <span className="contact-email">{contact.email}</span>
                <div className="emergency-toggle">
                  {emergencyContacts.includes(contact.email) ? (
                    <button 
                      className="remove-emergency"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveEmergencyContact(contact.email);
                      }}
                    >
                      ★ Remove Emergency
                    </button>
                  ) : (
                    <button 
                      className="add-emergency"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddEmergencyContact(contact.email);
                      }}
                    >
                      ☆ Add Emergency
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Chat Area */}
        <div className="chat-area">
          {activeChat ? (
            <>
              <div className="chat-header">
                <h3>{contacts.find(c => c.email === activeChat)?.name || activeChat}</h3>
                {emergencyContacts.includes(activeChat) && (
                  <span className="emergency-badge">Emergency Contact</span>
                )}
              </div>
              
              <div className="messages-container">
                {(messages[activeChat] || []).map((msg, index) => (
                  <div 
                    key={index} 
                    className={`message ${msg.sender === user.uid ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">
                      {msg.sender === 'system' ? (
                        <div className="system-message">
                          <strong>SYSTEM ALERT:</strong> {msg.text}
                        </div>
                      ) : (
                        msg.text
                      )}
                    </div>
                    <div className="message-time">
                      {msg.timestamp?.toDate()?.toLocaleTimeString() || 'Just now'}
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
                <button onClick={handleSendMessage}>Send</button>
              </div>
            </>
          ) : (
            <div className="no-chat-selected">
              <p>Select a contact to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default MessagingTab;