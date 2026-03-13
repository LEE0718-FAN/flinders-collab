import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin } from 'lucide-react';

const statusColors = {
  arrived: '#22c55e',
  on_the_way: '#eab308',
  late: '#ef4444',
};

const STATUS_LABEL = {
  on_the_way: 'On the way',
  arrived: 'Arrived',
  late: 'Late',
};

// Default center: Flinders University, Adelaide
const DEFAULT_CENTER = [-35.0275, 138.5711];

// Stale threshold — hide markers older than 30 minutes
const STALE_MS = 30 * 60 * 1000;

export default function LocationMap({ members = [], center }) {
  const now = Date.now();

  // Filter out members with missing coordinates or stale sessions
  const validMembers = useMemo(
    () =>
      members.filter((m) => {
        if (m.latitude == null || m.longitude == null) return false;
        if (m.updated_at) {
          const age = now - new Date(m.updated_at).getTime();
          if (age > STALE_MS) return false;
        }
        return true;
      }),
    [members, now],
  );

  // Compute a center from the valid members if none provided
  const mapCenter = useMemo(() => {
    if (center) return center;
    if (validMembers.length === 0) return DEFAULT_CENTER;
    const avgLat = validMembers.reduce((sum, m) => sum + m.latitude, 0) / validMembers.length;
    const avgLng = validMembers.reduce((sum, m) => sum + m.longitude, 0) / validMembers.length;
    return [avgLat, avgLng];
  }, [center, validMembers]);

  if (validMembers.length === 0) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-border/40 bg-muted/20 gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/40">
          <MapPin className="h-7 w-7 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-medium text-muted-foreground/60">No members sharing location right now</p>
      </div>
    );
  }

  const statusBadgeClass = {
    arrived: 'bg-emerald-100 text-emerald-700',
    on_the_way: 'bg-amber-100 text-amber-700',
    late: 'bg-red-100 text-red-700',
  };

  return (
    <div className="relative h-[400px] w-full overflow-hidden rounded-2xl border border-border/40 shadow-card">
      <MapContainer center={mapCenter} zoom={15} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validMembers.map((member) => (
          <Marker key={member.id} position={[member.latitude, member.longitude]}>
            <Popup>
              <div className="min-w-[140px] space-y-1.5 p-1 text-sm">
                <p className="font-semibold tracking-tight">{member.name || 'User'}</p>
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass[member.status] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABEL[member.status] || member.status?.replace('_', ' ') || 'unknown'}
                </span>
                {member.updated_at && (
                  <p className="text-xs text-muted-foreground/70">
                    Updated {new Date(member.updated_at).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl border border-white/20 bg-white/70 px-3 py-1.5 text-xs font-medium text-foreground/70 shadow-sm backdrop-blur-md">
        {validMembers.length} member{validMembers.length !== 1 ? 's' : ''} sharing
      </div>
    </div>
  );
}
