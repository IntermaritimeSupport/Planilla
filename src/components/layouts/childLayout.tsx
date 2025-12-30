import Headers from "../meta/headers";
import { UserProfile } from "../../context/userProfileContext";
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { Toaster } from "sonner"
import SlideBar, { Company } from "./slideBar";
import AdminNavbar from "./adminNavbar";

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
  isDarkMode?: boolean;
  onThemeChange?: (isDark: boolean) => void;
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
  isDarkMode = true,
  onThemeChange,
}) => {
  return (
    <>
      <Headers title={title} description={description} />
      <main className="w-full relative min-h-screen overflow-x-hidden">
        <Toaster richColors position="top-right" />
        <Analytics />
        <SpeedInsights />
        {publicRoute ? (
          <div id="page-content" className="z-10 bg-gray-900 text-white min-h-screen">
            {children}
          </div>
        ) : (
          <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
            {/* Navbar */}
            <div className="flex-shrink-0">
              <AdminNavbar
                currentPathname={currentPathname}
                profile={profile}
                isLogged={isLogged}
                isDarkMode={isDarkMode}
                onThemeChange={onThemeChange}
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
                  isDarkMode={isDarkMode}
                />
              </div>

              {/* Page content */}
              <div id="page-content" className="flex-1 overflow-y-auto">
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