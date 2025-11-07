/*"use client";
import { useEffect } from 'react';
import { logInWithCookies } from '../helper';

const useCheckAuth = () => {
  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log("Auth token refreshed successfully.")
      logInWithCookies();
    }, 1200000); // 20 min

    

    return () => clearInterval(intervalId);
  }, []);

  return null;
};

export default useCheckAuth;
*/