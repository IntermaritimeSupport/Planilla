import Headers from "../meta/headers";
import { UserProfile } from "../../context/userProfileContext";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Toaster } from "sonner"
import SlideBar, { Company } from "./slideBar";
import AdminNavbar from "./adminNavbar";
import { useTheme } from "../../context/themeContext";

const SlideBarComponent: any = SlideBar;

interface CurrentPathname {
  name: string;
}

interface childLayoutProps {
  title: string;
  description: string;
  isLogged: boolean;
  profile: UserProfile | null;
  currentPathname: CurrentPathname;
  children: React.ReactNode;
  publicRoute: boolean;
  companies?: Company[];
}

const EnvolveLayout: React.FC<childLayoutProps> = ({
  title,
  description,
  isLogged,
  profile,
  currentPathname,
  children,
  publicRoute,
  companies,
}) => {
  const { isDarkMode } = useTheme(); // Obtener el estado del tema

  return (
    <>
      <Headers title={title} description={description} />
      <main className="w-full relative h-screen overflow-x-hidden">
        <Toaster richColors position="top-right" />
        <Analytics />
        <SpeedInsights />
        {publicRoute ? (
          <div id="page-content" className={`z-10 h-screen overflow-y-auto transition-colors duration-300 ${
            isDarkMode 
              ? "bg-slate-900 text-white" 
              : "bg-white text-gray-900"
          }`}>
            {children}
          </div>
        ) : (
          <div className={`flex flex-col h-screen overflow-hidden transition-colors duration-300 ${
            isDarkMode 
              ? "bg-slate-900 text-white" 
              : "bg-gray-50 text-gray-900"
          }`}>
            {/* Navbar */}
            <div className="flex-shrink-0">
              <AdminNavbar
                currentPathname={currentPathname}
                profile={profile}
                isLogged={isLogged}
              />
            </div>

            {/* Main content area */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="hidden sm:inline-flex md:block lg:flex xl:flex flex-shrink-0">
                <SlideBarComponent
                  subroutes={[]}
                  currentPathname={currentPathname}
                  isLogged={isLogged}
                  profile={profile}
                  companies={companies}
                />
              </div>

              {/* Page content */}
              <div id="page-content" className="flex-1 overflow-y-auto w-full">
                {children}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default EnvolveLayout;