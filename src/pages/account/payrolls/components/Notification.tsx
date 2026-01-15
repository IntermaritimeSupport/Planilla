import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react"

type NotificationType = "success" | "error" | "warning" | "info"

interface Notification {
  type: NotificationType
  message: string
  show: boolean
  title?: string
  dismissible?: boolean
  autoClose?: number
}

const getNotificationStyles = (type: NotificationType) => {
  const styles = {
    success: {
      container: "bg-green-800 border-green-600 text-green-100",
      icon: "text-green-400",
      closeButton: "text-green-200 hover:bg-green-700",
    },
    error: {
      container: "bg-red-800 border-red-600 text-red-100",
      icon: "text-red-400",
      closeButton: "text-red-200 hover:bg-red-700",
    },
    warning: {
      container: "bg-yellow-800 border-yellow-600 text-yellow-100",
      icon: "text-yellow-400",
      closeButton: "text-yellow-200 hover:bg-yellow-700",
    },
    info: {
      container: "bg-blue-800 border-blue-600 text-blue-100",
      icon: "text-blue-400",
      closeButton: "text-blue-200 hover:bg-blue-700",
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
  if (!notification.show) return null

  const styles = getNotificationStyles(notification.type)
  const icon = getIcon(notification.type)

  return (
    <div
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 rounded-lg p-4 shadow-lg border flex items-start gap-3 ${styles.container}`}
      role="alert"
    >
      {/* Icon */}
      <div className={`mt-0.5 flex-shrink-0 ${styles.icon}`}>{icon}</div>

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