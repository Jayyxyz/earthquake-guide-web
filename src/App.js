import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // Authentication state
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState(null); // 'signin' or 'signup'
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Earthquake data and location state
  const [earthquakes, setEarthquakes] = useState([
    { id: 1, location: "Davao", magnitude: 7.6, depth: "35km", time: "2 hours ago", alert: "red" },
    { id: 2, location: "Manila", magnitude: 5.2, depth: "15km", time: "5 hours ago", alert: "yellow" },
    { id: 3, location: "Cebu", magnitude: 4.1, depth: "25km", time: "1 day ago", alert: "green" }
  ]);

  const [activeTab, setActiveTab] = useState('preparedness');
  const [userLocation, setUserLocation] = useState(null);

  // Simulate fetching user location
  useEffect(() => {
    // In a real app, this would use the Geolocation API
    setUserLocation({ lat: 8.4542, lng: 124.6319 }); // Default to Cagayan de Oro coordinates
  }, []);

  const handleSOS = () => {
    alert('Emergency contacts notified with your current location!');
    // In a real app, this would send SMS/emails to emergency contacts
  };

  // Authentication handlers
  const handleAuthInputChange = (e) => {
    const { name, value } = e.target;
    setAuthForm({
      ...authForm,
      [name]: value
    });
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    if (authForm.password !== authForm.confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    // In a real app, you would call your backend here
    setUser({
      email: authForm.email,
      name: "User Name" // This would come from your auth system
    });
    setAuthMode(null);
    setActiveTab('alerts'); // Switch to alerts after login
  };

  const handleSignIn = (e) => {
    e.preventDefault();
    // In a real app, you would verify credentials with backend
    setUser({
      email: authForm.email,
      name: "User Name"
    });
    setAuthMode(null);
    setActiveTab('alerts'); // Switch to alerts after login
  };

  const handleSignOut = () => {
    setUser(null);
    setActiveTab('preparedness');
  };

  // Protected content based on auth status
  const renderContent = () => {
    return (
      <>
        {activeTab === 'alerts' && user && <AlertsTab earthquakes={earthquakes} userLocation={userLocation} />}
        {activeTab === 'map' && user && <MapTab />}
        {activeTab === 'sos' && user && <SosTab handleSOS={handleSOS} />}
        {activeTab === 'preparedness' && <PreparednessTab />}
        {activeTab === 'resources' && <ResourcesTab />}
      </>
    );
  };

  return (
    <div className="e-quake-app">
      {/* Header with Auth Status */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">E-QUAKE</h1>
          {user && (
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.email}</span>
            </div>
          )}
        </div>
        <div className="header-right">
          {user ? (
            <button className="auth-btn signout" onClick={handleSignOut}>
              Sign Out
            </button>
          ) : (
            <>
              <button className="auth-btn signin" onClick={() => setAuthMode('signin')}>
                Sign In
              </button>
              <button className="auth-btn signup" onClick={() => setAuthMode('signup')}>
                Sign Up
              </button>
            </>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="app-nav">
        {user && (
          <>
            <button 
              className={`nav-btn ${activeTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              Alerts
            </button>
            <button 
              className={`nav-btn ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              Map
            </button>
            <button 
              className={`nav-btn ${activeTab === 'sos' ? 'active' : ''}`}
              onClick={() => setActiveTab('sos')}
            >
              SOS
            </button>
          </>
        )}
        <button 
          className={`nav-btn ${activeTab === 'preparedness' ? 'active' : ''}`}
          onClick={() => setActiveTab('preparedness')}
        >
          Preparedness
        </button>
        <button 
          className={`nav-btn ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          Resources
        </button>
      </nav>

      {/* Main Content */}
      <main className="app-content">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <h3>E-QUAKE</h3>
              <p>Comprehensive Earthquake Preparedness Hub</p>
            </div>
            <div className="footer-links">
              <div>
                <h4>Quick Links</h4>
                <a href="#about">About</a>
                <a href="#contact">Contact</a>
                <a href="#privacy">Privacy Policy</a>
              </div>
              <div>
                <h4>Resources</h4>
                <a href="#phivolcs">PHIVOLCS</a>
                <a href="#ndrrmc">NDRRMC</a>
                <a href="#redcross">Red Cross</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 University of Science and Technology of Southern Philippines</p>
            <p>IT323 - Application Development Project</p>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      {authMode && (
        <div className="auth-modal">
          <div className="auth-container">
            <button className="close-auth" onClick={() => setAuthMode(null)}>×</button>
            <h2>{authMode === 'signin' ? 'Sign In' : 'Create Account'}</h2>
            
            <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={authForm.email}
                  onChange={handleAuthInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={authForm.password}
                  onChange={handleAuthInputChange}
                  required
                  minLength="6"
                />
              </div>
              
              {authMode === 'signup' && (
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={authForm.confirmPassword}
                    onChange={handleAuthInputChange}
                    required
                    minLength="6"
                  />
                </div>
              )}
              
              <button type="submit" className="auth-submit">
                {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Tab Components (simplified for example)
function AlertsTab({ earthquakes, userLocation }) {
  return (
    <section className="alerts-tab">
      <div className="alert-header">
        <h2>Recent Earthquakes</h2>
        <div className="alert-filter">
          <span>Filter by:</span>
          <select>
            <option>All Alerts</option>
            <option>Red Alerts</option>
            <option>Yellow Alerts</option>
            <option>Green Alerts</option>
          </select>
        </div>
      </div>
      
      <div className="earthquake-list">
        {earthquakes.map(quake => (
          <div key={quake.id} className={`quake-card ${quake.alert}`}>
            <div className="quake-magnitude">
              <span>{quake.magnitude}</span>
              <small>Magnitude</small>
            </div>
            <div className="quake-details">
              <h3>{quake.location}</h3>
              <p>Depth: {quake.depth} • {quake.time}</p>
              {userLocation && <p className="distance">Approx. 120km from you</p>}
            </div>
            <div className={`alert-level ${quake.alert}`}>
              {quake.alert.toUpperCase()} ALERT
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MapTab() {
  return (
    <section className="map-tab">
      <h2>Earthquake Map</h2>
      <div className="map-container">
        <div className="map-placeholder">
          <p>[Interactive Map Displaying Recent Earthquakes]</p>
          <div className="map-legend">
            <div><span className="legend-red"></span> Magnitude 6.0+</div>
            <div><span className="legend-yellow"></span> Magnitude 4.5-5.9</div>
            <div><span className="legend-green"></span> Magnitude &lt;4.5</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SosTab({ handleSOS }) {
  return (
    <section className="sos-tab">
      <h2>Emergency SOS</h2>
      <div className="sos-content">
        <div className="sos-card">
          <h3>Immediate Assistance</h3>
          <p>In case of emergency, click the button below to notify your emergency contacts with your current location.</p>
          <button className="sos-btn" onClick={handleSOS}>
            Send Emergency Alert
          </button>
        </div>
        <div className="emergency-contacts">
          <h3>Emergency Contacts</h3>
          <ul>
            <li>National Emergency Hotline: 911</li>
            <li>Philippine Red Cross: 143</li>
            <li>NDRRMC: (02) 8911-5061 to 65</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function PreparednessTab() {
  const [activeGuide, setActiveGuide] = useState('before');

  return (
    <section className="preparedness-tab">
      <h2>Earthquake Preparedness</h2>
      
      <div className="guide-tabs">
        <button 
          className={activeGuide === 'before' ? 'active' : ''} 
          onClick={() => setActiveGuide('before')}
        >
          Before Earthquake
        </button>
        <button 
          className={activeGuide === 'during' ? 'active' : ''} 
          onClick={() => setActiveGuide('during')}
        >
          During Earthquake
        </button>
        <button 
          className={activeGuide === 'after' ? 'active' : ''} 
          onClick={() => setActiveGuide('after')}
        >
          After Earthquake
        </button>
      </div>
      
      <div className="guide-content">
        {activeGuide === 'before' && (
          <div className="infographic-container">
            <h3>Before an Earthquake</h3>
            <div className="infographic-grid">
              <div className="infographic-card">
                <div className="icon">🏠</div>
                <h4>Secure Your Home</h4>
                <p>Anchor heavy furniture to walls and install cabinet latches</p>
              </div>
              <div className="infographic-card">
                <div className="icon">🛠️</div>
                <h4>Know Your Utilities</h4>
                <p>Learn how to turn off gas, water, and electricity</p>
              </div>
              <div className="infographic-card">
                <div className="icon">🧰</div>
                <h4>Prepare Emergency Kit</h4>
                <p>Include food, water, first aid, flashlight, and batteries</p>
              </div>
              <div className="infographic-card">
                <div className="icon">🗺️</div>
                <h4>Plan Evacuation Routes</h4>
                <p>Identify safe spots in each room and meeting points</p>
              </div>
            </div>
            <div className="infographic-visual">
              <div className="house-visual">
                <div className="roof"></div>
                <div className="walls">
                  <div className="secured-furniture" title="Secured Furniture"></div>
                  <div className="emergency-kit" title="Emergency Kit"></div>
                  <div className="safe-zone" title="Safe Zone"></div>
                </div>
                <div className="foundation"></div>
              </div>
              <div className="visual-labels">
                <span>🔒 Secured Furniture</span>
                <span>🧰 Emergency Kit</span>
                <span>✅ Safe Zone</span>
              </div>
            </div>
          </div>
        )}
        
        {activeGuide === 'during' && (
          <div className="infographic-container">
            <h3>During an Earthquake</h3>
            <div className="action-steps">
              <div className="step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>DROP</h4>
                  <p>Drop down to your hands and knees</p>
                  <div className="visual-person">🧎</div>
                </div>
              </div>
              <div className="step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>COVER</h4>
                  <p>Take cover under sturdy furniture</p>
                  <div className="visual-person">🪑</div>
                </div>
              </div>
              <div className="step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>HOLD ON</h4>
                  <p>Hold on until shaking stops</p>
                  <div className="visual-person">🤲</div>
                </div>
              </div>
            </div>
            <div className="location-specific">
              <h4>Wherever You Are:</h4>
              <div className="location-grid">
                <div className="location-card">
                  <div className="location-icon">🏠</div>
                  <h5>Indoors</h5>
                  <p>Stay inside, away from windows</p>
                </div>
                <div className="location-card">
                  <div className="location-icon">🌳</div>
                  <h5>Outdoors</h5>
                  <p>Move to open area away from buildings</p>
                </div>
                <div className="location-card">
                  <div className="location-icon">🚗</div>
                  <h5>In a Vehicle</h5>
                  <p>Pull over and stop in safe area</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeGuide === 'after' && (
          <div className="infographic-container">
            <h3>After an Earthquake</h3>
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <h4>Immediately After</h4>
                  <ul>
                    <li>Check for injuries</li>
                    <li>Expect aftershocks</li>
                    <li>Put on sturdy shoes</li>
                  </ul>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <h4>First Few Hours</h4>
                  <ul>
                    <li>Check for damage and hazards</li>
                    <li>Listen to emergency broadcasts</li>
                    <li>Use text messages to communicate</li>
                  </ul>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-marker"></div>
                <div className="timeline-content">
                  <h4>Coming Days</h4>
                  <ul>
                    <li>Follow official instructions</li>
                    <li>Help neighbors if safe</li>
                    <li>Document damage for insurance</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="damage-assessment">
              <h4>Damage Assessment Guide</h4>
              <div className="damage-grid">
                <div className="damage-card minor">
                  <h5>Minor Damage</h5>
                  <p>Cracked plaster, fallen objects</p>
                  <p>✅ Generally safe</p>
                </div>
                <div className="damage-card moderate">
                  <h5>Moderate Damage</h5>
                  <p>Cracked walls, broken windows</p>
                  <p>⚠️ Proceed with caution</p>
                </div>
                <div className="damage-card severe">
                  <h5>Severe Damage</h5>
                  <p>Collapsed walls, structural damage</p>
                  <p>❌ Evacuate immediately</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="emergency-kit-infographic">
        <h3>Emergency Kit Essentials</h3>
        <div className="kit-visual">
          <div className="kit-item" style={{ top: '10%', left: '15%' }}>
            <div className="item-icon">💧</div>
            <p>Water</p>
          </div>
          <div className="kit-item" style={{ top: '30%', left: '70%' }}>
            <div className="item-icon">🍞</div>
            <p>Food</p>
          </div>
          <div className="kit-item" style={{ top: '50%', left: '25%' }}>
            <div className="item-icon">🩹</div>
            <p>First Aid</p>
          </div>
          <div className="kit-item" style={{ top: '70%', left: '60%' }}>
            <div className="item-icon">🔦</div>
            <p>Flashlight</p>
          </div>
          <div className="kit-item" style={{ top: '20%', left: '50%' }}>
            <div className="item-icon">📻</div>
            <p>Radio</p>
          </div>
          <div className="kit-item" style={{ top: '60%', left: '75%' }}>
            <div className="item-icon">🔋</div>
            <p>Batteries</p>
          </div>
          <div className="kit-item" style={{ top: '40%', left: '40%' }}>
            <div className="item-icon">📄</div>
            <p>Documents</p>
          </div>
          <div className="kit-base"></div>
        </div>
        <button className="print-btn">Print Checklist</button>
      </div>
    </section>
  );
}

function ResourcesTab() {
  const [activeResource, setActiveResource] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const resources = {
    basics: {
      title: "Earthquake Basics",
      content: (
        <div>
          <h3>What Causes Earthquakes?</h3>
          <p>Earthquakes are caused by the sudden release of energy in the Earth's lithosphere that creates seismic waves. This typically occurs along fault lines where tectonic plates meet.</p>
          
          <h3>How Earthquakes Are Measured</h3>
          <p>Earthquakes are measured using seismographs that record seismic waves. The magnitude is most commonly measured using the Richter scale:</p>
          <ul>
            <li><strong>2.5 or less:</strong> Usually not felt</li>
            <li><strong>2.5 to 5.4:</strong> Often felt, minor damage</li>
            <li><strong>5.5 to 6.0:</strong> Slight damage to buildings</li>
            <li><strong>6.1 to 6.9:</strong> May cause considerable damage</li>
            <li> <strong>7.0 to 7.9:</strong> Major earthquake, serious damage</li>
            <li><strong>8.0 or greater:</strong> Great earthquake, massive destruction</li>
          </ul>
          
          <h3>Philippine Earthquake Risks</h3>
          <p>The Philippines sits on the Pacific Ring of Fire, making it prone to earthquakes. Major fault lines include the Philippine Fault Zone and the Valley Fault System near Metro Manila.</p>
        </div>
      )
    },
    building: {
      title: "Building Safety Guide",
      content: (
        <div>
          <h3>Earthquake-Resistant Construction</h3>
          <p>Buildings in earthquake-prone areas should follow these principles:</p>
          <ul>
            <li>Strong foundations anchored to bedrock</li>
            <li>Reinforced concrete frames with shear walls</li>
            <li>Properly secured non-structural elements</li>
            <li>Flexible utility connections</li>
          </ul>
          
          <h3>Home Safety Checklist</h3>
          <p>Make your home safer with these steps:</p>
          <ol>
            <li>Secure heavy furniture to walls</li>
            <li>Install latches on cabinets</li>
            <li>Place heavy objects on lower shelves</li>
            <li>Know how to shut off gas, water, and electricity</li>
            <li>Identify safe spots in each room</li>
          </ol>
        </div>
      )
    },
    family: {
      title: "Family Emergency Plan",
      content: (
        <div>
          <h3>Creating Your Plan</h3>
          <p>Every family should have an earthquake preparedness plan:</p>
          
          <h4>1. Communication Plan</h4>
          <ul>
            <li>Identify an out-of-area contact person</li>
            <li>Ensure all family members know how to send text messages</li>
            <li>Agree on meeting places (one near home, one outside neighborhood)</li>
          </ul>
          
          <h4>2. Emergency Contacts</h4>
          <ul>
            <li>Local emergency numbers</li>
            <li>School/work contacts</li>
            <li>Medical information for each family member</li>
          </ul>
          
          <h4>3. Practice Drills</h4>
          <p>Conduct earthquake drills every 6 months. Practice:</p>
          <ul>
            <li>Drop, Cover, and Hold On</li>
            <li>Evacuation routes</li>
            <li>Emergency kit locations</li>
          </ul>
        </div>
      )
    },
    quiz: {
      title: "Earthquake Preparedness Quiz",
      content: (
        <div className="quiz-container">
          {!quizSubmitted ? (
            <>
              <h3>Test Your Knowledge</h3>
              <p>Answer these questions to check your earthquake preparedness knowledge.</p>
              
              <div className="quiz-question">
                <p>1. What should you do FIRST when an earthquake starts?</p>
                <label>
                  <input 
                    type="radio" 
                    name="q1" 
                    value="a"
                    onChange={() => setQuizAnswers({...quizAnswers, q1: "a"})}
                  />
                  Run outside to an open area
                </label>
                <label>
                  <input 
                    type="radio" 
                    name="q1" 
                    value="b"
                    onChange={() => setQuizAnswers({...quizAnswers, q1: "b"})}
                  />
                  Drop, cover, and hold on
                </label>
                <label>
                  <input 
                    type="radio" 
                    name="q1" 
                    value="c"
                    onChange={() => setQuizAnswers({...quizAnswers, q1: "c"})}
                  />
                  Stand in a doorway
                </label>
              </div>
              
              <div className="quiz-question">
                <p>2. What should be in your emergency kit?</p>
                <label>
                  <input 
                    type="checkbox" 
                    onChange={(e) => setQuizAnswers({
                      ...quizAnswers, 
                      q2a: e.target.checked
                    })}
                  />
                  Water (1 gallon per person per day)
                </label>
                <label>
                  <input 
                    type="checkbox" 
                    onChange={(e) => setQuizAnswers({
                      ...quizAnswers, 
                      q2b: e.target.checked
                    })}
                  />
                  Flashlight with extra batteries
                </label>
                <label>
                  <input 
                    type="checkbox" 
                    onChange={(e) => setQuizAnswers({
                      ...quizAnswers, 
                      q2c: e.target.checked
                    })}
                  />
                  First aid kit
                </label>
                <label>
                  <input 
                    type="checkbox" 
                    onChange={(e) => setQuizAnswers({
                      ...quizAnswers, 
                      q2d: e.target.checked
                    })}
                  />
                  All of the above
                </label>
              </div>
              
              <div className="quiz-question">
                <p>3. True or False: You should use elevators during an earthquake.</p>
                <label>
                  <input 
                    type="radio" 
                    name="q3" 
                    value="true"
                    onChange={() => setQuizAnswers({...quizAnswers, q3: "true"})}
                  />
                  True
                </label>
                <label>
                  <input 
                    type="radio" 
                    name="q3" 
                    value="false"
                    onChange={() => setQuizAnswers({...quizAnswers, q3: "false"})}
                  />
                  False
                </label>
              </div>
              
              <button 
                className="quiz-submit"
                onClick={() => setQuizSubmitted(true)}
              >
                Submit Answers
              </button>
            </>
          ) : (
            <div className="quiz-results">
              <h3>Your Quiz Results</h3>
              
              <div className="result-item">
                <p><strong>Question 1:</strong> Correct answer is "Drop, cover, and hold on"</p>
                <p className={quizAnswers.q1 === "b" ? "correct" : "incorrect"}>
                  {quizAnswers.q1 === "b" ? "✓ You got it right!" : "✗ Your answer was incorrect"}
                </p>
              </div>
              
              <div className="result-item">
                <p><strong>Question 2:</strong> All of these should be in your emergency kit</p>
                <p className={
                  quizAnswers.q2a && quizAnswers.q2b && quizAnswers.q2c ? "correct" : "incorrect"
                }>
                  {quizAnswers.q2a && quizAnswers.q2b && quizAnswers.q2c ? 
                    "✓ You selected all the essentials!" : 
                    "✗ You missed some important items"}
                </p>
              </div>
              
              <div className="result-item">
                <p><strong>Question 3:</strong> False - Never use elevators during an earthquake</p>
                <p className={quizAnswers.q3 === "false" ? "correct" : "incorrect"}>
                  {quizAnswers.q3 === "false" ? "✓ Correct!" : "✗ Incorrect"}
                </p>
              </div>
              
              <button 
                className="quiz-retake"
                onClick={() => {
                  setQuizAnswers({});
                  setQuizSubmitted(false);
                }}
              >
                Retake Quiz
              </button>
            </div>
          )}
        </div>
      )
    }
  };

  return (
    <section className="resources-tab">
      <h2>Educational Resources</h2>
      
      {activeResource ? (
        <div className="resource-viewer">
          <button 
            className="back-button"
            onClick={() => setActiveResource(null)}
          >
            ← Back to Resources
          </button>
          <h3>{resources[activeResource].title}</h3>
          <div className="resource-content">
            {resources[activeResource].content}
          </div>
        </div>
      ) : (
        <>
          <div className="resource-cards">
            <div 
              className="resource-card"
              onClick={() => setActiveResource('basics')}
            >
              <h3>Earthquake Basics</h3>
              <p>Learn about what causes earthquakes and how they're measured.</p>
              <div className="resource-link">Read Article →</div>
            </div>
            <div 
              className="resource-card"
              onClick={() => setActiveResource('building')}
            >
              <h3>Building Safety</h3>
              <p>How to earthquake-proof your home and identify structural risks.</p>
              <div className="resource-link">View Guide →</div>
            </div>
            <div 
              className="resource-card"
              onClick={() => setActiveResource('family')}
            >
              <h3>Family Plan</h3>
              <p>Create an earthquake preparedness plan for your family.</p>
              <div className="resource-link">Download Template →</div>
            </div>
            <div 
              className="resource-card"
              onClick={() => setActiveResource('quiz')}
            >
              <h3>Interactive Quiz</h3>
              <p>Test your earthquake knowledge with our preparedness quiz.</p>
              <div className="resource-link">Take Quiz →</div>
            </div>
          </div>
          
          <div className="official-resources">
            <h3>Official Resources</h3>
            <div className="official-links">
              <a href="https://www.phivolcs.dost.gov.ph" target="_blank" rel="noopener noreferrer">
                PHIVOLCS - Philippine Institute of Volcanology and Seismology
              </a>
              <a href="https://ndrrmc.gov.ph" target="_blank" rel="noopener noreferrer">
                NDRRMC - National Disaster Risk Reduction and Management Council
              </a>
              <a href="https://redcross.org.ph" target="_blank" rel="noopener noreferrer">
                Philippine Red Cross
              </a>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default App;