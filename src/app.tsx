// src/App.tsx
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Layout from "./components/layouts/main";
import useUser from "./hook/useUser";

const App = () => {
  const { isLogged } = useUser();

  return (
    <BrowserRouter>
      <HelmetProvider>
        <Layout isLogged={isLogged}/>
      </HelmetProvider>
    </BrowserRouter>
  );
};

export default App;
