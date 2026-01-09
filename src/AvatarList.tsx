import type { AllPresenceData } from "./types";

interface AvatarListProps {
  presence: AllPresenceData;
  className?: string;
}

export function AvatarList({ presence, className = "" }: AvatarListProps) {
  const onlineUsers = Object.values(presence).filter((p) => p.online);

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {onlineUsers.map((p) => (
        <div
          key={p.userId}
          className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden relative title-tip"
          title={p.userName}
        >
          {p.photoURL ? (
            <img
              src={p.photoURL}
              alt={p.userName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
              {p.userName.charAt(0)}
            </div>
          )}
          {/* Online Indicator */}
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
        </div>
      ))}
    </div>
  );
}