import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type UrlProp = {
  title: string;
};

const HideDashboardURL: React.FC<UrlProp> = ({ title }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname.startsWith(`/${title}/`)) {
      navigate(`/${title}`, { replace: true });
    }
  }, [location, navigate, title]);

  return null;
};

export default HideDashboardURL;
