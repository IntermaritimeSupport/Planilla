import { useEffect, useRef, useState } from "react";
import { LogOut, User } from "lucide-react";
import useUser from "../../hook/useUser";
import { UserProfile } from "../../context/userProfileContext";

type ProfileButtonProps = {
    profile: UserProfile | null;
}

const ProfileButton: React.FC<ProfileButtonProps> = ({profile}) => {
      const [isProfileOpen, setIsProfileOpen] = useState(false);
      const profileRef = useRef<HTMLDivElement>(null);
      const { logout } = useUser();
      useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
          if (
            profileRef.current &&
            !profileRef.current.contains(event.target as Node)
          ) {
            setIsProfileOpen(false);
          }
        }
    
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
        };
      }, []);
    return (
        <div className="relative" ref={profileRef}>
        <button
          className="flex items-center space-x-2 focus:outline-none"
          onClick={() => setIsProfileOpen(!isProfileOpen)}
        >
          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
            <User className="h-6 w-6 text-gray-600" />
          </div>
          <span className="font-medium">{profile?.username || 'user'}</span>
        </button>

        {isProfileOpen && (
          <div className="absolute right-0 mt-2 w-36 bg-white rounded-md shadow-lg py-1 z-10 border">
            <div className="px-4 py-3 border-b">
              <p className="text-sm text-gray-500">Conectado como</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.username}
              </p>
            </div>
            <button
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              onClick={() => {
                logout();
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    )
}
export default ProfileButton;