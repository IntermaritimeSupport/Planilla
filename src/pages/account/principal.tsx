"use client"
import { FileText } from "lucide-react"
import { Link, Outlet } from "react-router-dom"

type Subroutes = {
  name: string;
  href: string;
}

type DashboardProps = {
  subroutes: Subroutes [];
}

const Dashboard: React.FC<DashboardProps> = ({ subroutes }) => {

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-4 lg:px-8">
        <div className="mb-4">
        <nav className="flex space-x-4 border-b">
          {subroutes.map((route) => (
            <NavButton
              key={route.href}
              to={route.href}
              icon={FileText}
              label={route.name.charAt(0).toUpperCase() + route.name.slice(1)}
              activePath={window.location.pathname}/>
          ))}
          </nav>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
export default Dashboard

function NavButton({ to, icon: Icon, label, activePath }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; activePath: string | undefined }) {
  const isActive = activePath!.includes(to);
  return (
    <Link
      to={to}
      className={`px-4 py-2 font-medium text-sm ${
        isActive ? "border-b-2 border-orange-500 text-orange-600" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      <div className="flex items-center space-x-2">
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </div>
    </Link>
  );
}
