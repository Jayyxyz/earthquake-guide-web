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