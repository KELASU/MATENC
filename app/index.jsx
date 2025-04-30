import { useEffect } from 'react';
import { router } from 'expo-router';

const Index = () => {
  useEffect(() => {
    const timeout = requestAnimationFrame(() => {
      router.replace('/Logins/Onboarding');
    });

    return () => cancelAnimationFrame(timeout);
  }, []);

  return null;
};

export default Index;
