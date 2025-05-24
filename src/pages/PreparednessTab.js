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
          </div>
        )}
      </div>
    </section>
  );
}