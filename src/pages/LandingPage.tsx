
import React, { useEffect } from 'react';

const LandingPage = () => {
  useEffect(() => {
    window.location.href = 'https://appfinanceiro.com/';
  }, []);

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center">
      <div className="animate-pulse">
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
};

export default LandingPage;
