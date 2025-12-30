import ReactDOM from "react-dom/client";
import "./index.css";
import { UserContextProvider } from "./context/userContext.tsx";
import App from "./app.tsx";
import { UserProfileProvider } from "./context/userProfileContext.tsx";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import 'flag-icon-css/css/flag-icons.min.css';
import en from "./diccionary/en";
import es from "./diccionary/es.tsx";

const savedLanguage = localStorage.getItem("i18nextLng") || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: en,
    es: es
  },
  lng: savedLanguage,
  fallbackLng: "es",
  interpolation: {
    escapeValue: false
  }
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <UserContextProvider>
    <UserProfileProvider>
        <App />
    </UserProfileProvider>
  </UserContextProvider>
);
