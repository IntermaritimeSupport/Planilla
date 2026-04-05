// src/App.tsx
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { SWRConfig } from "swr";
import Layout from "./components/layouts/main";
import useUser from "./hook/useUser";
import { ThemeProvider } from "./context/themeContext";

const App = () => {
  const { isLogged } = useUser();

  return (
    <ThemeProvider>
      <BrowserRouter>
        <HelmetProvider>
          <SWRConfig value={{
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            shouldRetryOnError: false,
            dedupingInterval: 10_000,
          }}>
            <Layout isLogged={isLogged}/>
          </SWRConfig>
        </HelmetProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
