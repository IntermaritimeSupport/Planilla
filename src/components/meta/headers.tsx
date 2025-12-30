import React from 'react';
import { Helmet } from 'react-helmet-async';

interface HeadersProps {
    title: string;
    description: string;
}  

const Headers: React.FC<HeadersProps> = ({ title, description }) => {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
    </Helmet>
  );
};

export default Headers;
