
import React from 'react';
import { Navigate } from 'react-router-dom';

const LandingPage = () => {
  return <Navigate to="/login" replace />;
};

export default LandingPage;
