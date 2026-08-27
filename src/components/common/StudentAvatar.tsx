import React from 'react';
import { User } from 'lucide-react';

interface StudentAvatarProps {
  photoUrl?: string;
  name: string;
  nis: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  photoUrl,
  name,
  nis,
  size = 'md',
  className = '',
  onClick,
}) => {
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };

  const getInitial = (n: string) => {
    if (!n) return 'S';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  // High quality vector avatar fallback based on student NIS
  const svgFallback = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
    nis || name
  )}&backgroundColor=059669,0d9488,047857`;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 rounded-2xl overflow-hidden border-2 border-emerald-500/30 shadow-md transition-all ${
        sizeMap[size]
      } ${onClick ? 'cursor-pointer hover:border-emerald-500 hover:scale-105' : ''} ${className}`}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className="w-full h-full object-cover object-center image-render-crisp"
          onError={(e) => {
            // Fallback if custom photo URL fails to load
            (e.target as HTMLImageElement).src = svgFallback;
          }}
        />
      ) : (
        <img
          src={svgFallback}
          alt={name}
          className="w-full h-full object-cover bg-emerald-950/20"
          onError={(e) => {
            // Ultimate fallback to initials badge if network unavailable
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      )}

      {!photoUrl && (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-extrabold flex items-center justify-center -z-10">
          {getInitial(name)}
        </div>
      )}
    </div>
  );
};
