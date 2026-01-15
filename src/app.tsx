// src/App.tsx
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Layout from "./components/layouts/main";
import useUser from "./hook/useUser";
import { ThemeProvider } from "./context/themeContext";

const App = () => {
  const { isLogged } = useUser();

  return (
    <ThemeProvider>
      <BrowserRouter>
        <HelmetProvider>
          <Layout isLogged={isLogged}/>
        </HelmetProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
