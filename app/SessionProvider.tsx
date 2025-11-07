'use client';
import { SessionProvider as Provider } from 'next-auth/react';
import { useState, useEffect } from 'react';

type Props = {
  children: React.ReactNode;
}

export default function SessionProvider({children}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Provider>
      {children}
    </Provider>
  )
}