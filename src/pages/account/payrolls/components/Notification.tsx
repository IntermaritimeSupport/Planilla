import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react"
import { useTheme } from "../../../../context/themeContext"

type NotificationType = "success" | "error" | "warning" | "info"

interface Notification {
  type: NotificationType
  message: string
  show: boolean
  title?: string
  dismissible?: boolean
  autoClose?: number
}

const getNotificationStyles = (type: NotificationType, isDarkMode: boolean) => {
  const styles = {
    success: {
      container: isDarkMode
        ? "bg-green-800 border-green-600 text-green-100"
        : "bg-green-50 border-green-400 text-green-900",
      icon: isDarkMode ? "text-green-400" : "text-green-600",
      closeButton: isDarkMode
        ? "text-green-200 hover:bg-green-700"
        : "text-green-700 hover:bg-green-200",
    },
    error: {
      container: isDarkMode
        ? "bg-red-800 border-red-600 text-red-100"
        : "bg-red-50 border-red-400 text-red-900",
      icon: isDarkMode ? "text-red-400" : "text-red-600",
      closeButton: isDarkMode
        ? "text-red-200 hover:bg-red-700"
        : "text-red-700 hover:bg-red-200",
    },
    warning: {
      container: isDarkMode
        ? "bg-yellow-800 border-yellow-600 text-yellow-100"
        : "bg-yellow-50 border-yellow-400 text-yellow-900",
      icon: isDarkMode ? "text-yellow-400" : "text-yellow-600",
      closeButton: isDarkMode
        ? "text-yellow-200 hover:bg-yellow-700"
        : "text-yellow-700 hover:bg-yellow-200",
    },
    info: {
      container: isDarkMode
        ? "bg-blue-800 border-blue-600 text-blue-100"
        : "bg-blue-50 border-blue-400 text-blue-900",
      icon: isDarkMode ? "text-blue-400" : "text-blue-600",
      closeButton: isDarkMode
        ? "text-blue-200 hover:bg-blue-700"
        : "text-blue-700 hover:bg-blue-200",
    },
  }
  return styles[type]
}

const getIcon = (type: NotificationType) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 shrink-0" />,
    info: <Info className="w-5 h-5 shrink-0" />,
  }
  return icons[type]
}

interface NotificationComponentProps {
  notification: Notification
  onClose: () => void
}

const NotificationComponent: React.FC<NotificationComponentProps> = ({
  notification,
  onClose,
}) => {
  const { isDarkMode } = useTheme()

  if (!notification.show) return null

  const styles = getNotificationStyles(notification.type, isDarkMode)
  const icon = getIcon(notification.type)

  return (
    <div
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 rounded-lg p-4 shadow-lg border flex items-start gap-3 transition-colors ${styles.container}`}
      role="alert"
    >
      {/* Icon */}
      <div className={`mt-0.5 flex-shrink-0 transition-colors ${styles.icon}`}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {notification.title && (
          <p className="font-semibold text-sm">{notification.title}</p>
        )}
        <p className="text-sm font-medium">{notification.message}</p>
      </div>

      {/* Close Button */}
      {notification.dismissible !== false && (
        <button
          onClick={onClose}
          className={`-mx-1.5 -my-1.5 rounded focus:ring-2 p-1 inline-flex items-center justify-center h-6 w-6 shrink-0 transition-colors ${styles.closeButton}`}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export { NotificationComponent }
export type { Notification, NotificationType }