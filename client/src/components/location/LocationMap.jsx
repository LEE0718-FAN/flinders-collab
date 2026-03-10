import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

const statusColors = {
  arrived: '#22c55e',
  on_the_way: '#eab308',
  late: '#ef4444',
};

export default function LocationMap({ members = [], center = [-35.0275, 138.5711] }) {
  if (members.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/30">
        <p className="text-sm text-muted-foreground">No members sharing location</p>
      </div>
    );
  }

  return (
    <div className="h-80 w-full overflow-hidden rounded-lg border">
      <MapContainer center={center} zoom={15} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {members.map((member) => (
          <Marker key={member.id} position={[member.latitude, member.longitude]}>
            <Popup>
              <div className="text-sm">
                <p className="font-medium">{member.name || 'User'}</p>
                <p style={{ color: statusColors[member.status] || '#6b7280' }}>
                  {member.status?.replace('_', ' ') || 'unknown'}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
