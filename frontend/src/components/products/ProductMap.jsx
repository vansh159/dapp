import { useEffect, useRef } from 'react'

const ProductMap = ({ currentLocation, locationHistory = [] }) => {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    // Check if Leaflet is available
    if (typeof window !== 'undefined' && window.L && currentLocation?.coordinates) {
      const { latitude, longitude } = currentLocation.coordinates

      // Initialize map if not already initialized
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = window.L.map(mapRef.current).setView([latitude, longitude], 13)

        // Add tile layer
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstanceRef.current)
      }

      // Clear existing markers
      mapInstanceRef.current.eachLayer((layer) => {
        if (layer instanceof window.L.Marker) {
          mapInstanceRef.current.removeLayer(layer)
        }
      })

      // Add current location marker
      const currentMarker = window.L.marker([latitude, longitude])
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div>
            <strong>Current Location</strong><br>
            ${currentLocation.address}<br>
            <small>Updated: ${new Date(currentLocation.updatedAt).toLocaleString()}</small>
          </div>
        `)

      // Add history markers
      locationHistory.forEach((location, index) => {
        if (location.coordinates) {
          const { latitude: lat, longitude: lng } = location.coordinates
          const historyMarker = window.L.marker([lat, lng], {
            opacity: 0.6
          }).addTo(mapInstanceRef.current)
            .bindPopup(`
              <div>
                <strong>Previous Location ${index + 1}</strong><br>
                ${location.address}<br>
                <small>${new Date(location.timestamp).toLocaleString()}</small>
              </div>
            `)
        }
      })

      // Fit map to show all markers
      const allCoordinates = [
        [latitude, longitude],
        ...locationHistory
          .filter(loc => loc.coordinates)
          .map(loc => [loc.coordinates.latitude, loc.coordinates.longitude])
      ]

      if (allCoordinates.length > 1) {
        const group = new window.L.featureGroup(allCoordinates.map(coord => window.L.marker(coord)))
        mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1))
      }
    }

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [currentLocation, locationHistory])

  // Fallback for when Leaflet is not available
  if (!currentLocation?.coordinates) {
    return (
      <div className="map-container flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-500">Location information not available</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div ref={mapRef} className="map-container"></div>
      
      {/* Location Details */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <div>
            <h4 className="font-medium text-green-800">Current Location</h4>
            <p className="text-sm text-green-600">{currentLocation.address}</p>
          </div>
          <div className="text-xs text-green-500">
            {new Date(currentLocation.updatedAt).toLocaleDateString()}
          </div>
        </div>

        {locationHistory.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Location History</h4>
            <div className="space-y-1">
              {locationHistory.slice(0, 3).map((location, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <span className="text-gray-700">{location.address}</span>
                  <span className="text-gray-500">
                    {new Date(location.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {locationHistory.length > 3 && (
                <div className="text-center text-sm text-gray-500 py-1">
                  ... and {locationHistory.length - 3} more locations
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductMap