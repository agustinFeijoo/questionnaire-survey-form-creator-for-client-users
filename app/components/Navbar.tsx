'use client';

import { useRouter } from 'next/navigation';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import onlineTaxmanLogo from "../../public/onlineTaxmanLogo.svg";
import Image from 'next/image';
import { toast } from 'react-toastify';
import React from 'react';
import { deleteSessionCookies } from '../helper';
import Link from 'next/link';

export default function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Call the server-side API to delete session cookies
      await Promise.all([deleteSessionCookies(),signOut(auth)])
      toast.success("Successfully logged out");
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Error logging out. Please try again.');
    }
  };

  if (auth.currentUser === undefined) {
    return null;
  }

  return (
<nav className="bg-white shadow-lg w-full z-10 relative">
  <div className="max-w-6xl mx-auto flex justify-between items-center p-4">
    {/* Logo on the left */}
    <div className="flex items-center cursor-pointer">
      <Image 
        onClick={() => location.replace("/")}
        src={onlineTaxmanLogo} 
        priority
        alt="Online Taxman Logo" 
        width={186.08}  
        height={75.2}  // Adjust as needed
      />
    </div>

    {auth.currentUser && (
      <div className="flex flex-col md:flex-row md:items-center md:justify-end w-full">
        {/* Spacer to push email and logout button to the right on larger screens */}
        <div className="flex-1 hidden md:flex"></div>

        {/* Email and Logout button */}
        <div className="flex flex-col items-end md:flex-row md:items-center md:space-x-4">
          <Link  href="/preferences" className="text-custom-blue-80 hover:text-custom-blue mb-2 md:mb-0">{auth.currentUser.email}</Link>
          <button
            onClick={handleLogout}
            className="text-white bg-custom-blue-80 hover:bg-custom-blue px-4 py-2 rounded cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    )}
  </div>
</nav>



  );
}
