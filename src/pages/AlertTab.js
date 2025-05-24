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