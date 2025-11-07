import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ErrorScreenProps {
  errorMessage: string;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({ errorMessage }) => {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <h2 className="text-3xl font-extrabold text-red-600">Oops! Something went wrong</h2>
        <p className="mt-4 text-lg text-gray-600">
          {errorMessage || "We encountered an error while processing your request."}
        </p>

        <div className="mt-6">
          <Link
            href="/"
            className="text-custom-blue-80 hover:text-custom-blue transition duration-200 underline text-lg cursor-pointer"
          >
            ← Go back
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ErrorScreen;
