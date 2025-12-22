"use client";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState,  useEffect } from 'react';
import { auth } from '../../../firebase';
import genericLogo from "../../../../public/genericLogo.png";
import Image from 'next/image';
import { confirmPasswordReset} from 'firebase/auth';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Link from 'next/link';
import ErrorScreen from '@/app/components/ErrorScreen';
import { checkIfUserExists } from '../../forgot-password/helper';


export default function SignUpPage() {
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordAgainTouched, setPasswordAgainTouched] = useState(false);// touched is for when the focus went in and out
  const [passwordAgainFocused, setPasswordAgainFocused] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordAgain, setPasswordAgain] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordAgain, setShowPasswordAgain] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const router = useRouter();
  const [passwordMatchError, setPasswordMatchError] = useState("");
  const searchParams = useSearchParams();
  const params = useParams();
  const emailEncoded = Array.isArray(params.email) ? params.email[0] : params.email;
  const email = decodeURIComponent(emailEncoded || '');
  const oobCode = searchParams.get("oobCode");


  useEffect(() => {
    if (passwordTouched) {
      validatePassword(password);
    }
  }, [password, passwordTouched]);

  useEffect(() => {
    const runCheck = async () => {
      if (!oobCode) {
        setError("This page is only for requests that have the oobCode defined in the URL");
        return;
      }
  
      if (!email) {
        setError("This page is only for requests that have the email defined in the URL");
        return;
      }
  
      const hasAnAccount = (await checkIfUserExists(email)).hasSignedUp;
      if (!hasAnAccount) {
        setError("This email account is not enabled (if we've sent you a questionnaire you should be able to sign up).");
      }
    };
  
    runCheck();
  }, []);
  
  
  useEffect(() => {
      validatePasswordMatch();
  }, [passwordAgain, password, passwordAgainTouched]);

    // Password Validation Function
    const validatePassword = (value: string) => {
      if (value === "") {
        setPasswordErrors([]);
        return;
      }
  
      let errors: string[] = [];
      if (value.length < 10) errors.push("Must contain at least 10 characters.");
      if (!/[A-Z]/.test(value)) errors.push("Must contain an uppercase letter.");
      if (!/[a-z]/.test(value)) errors.push("Must contain a lowercase letter.");
      if (!/[0-9]/.test(value)) errors.push("Must contain a number.");
      if (!/[^A-Za-z0-9]/.test(value)) errors.push("Must contain a special character.");
  
      setPasswordErrors(errors);
    };


    const validatePasswordMatch = () => {
      if (password !== passwordAgain && passwordAgainTouched && passwordTouched) {
        setPasswordMatchError("Passwords do not match.");
      } else {
        setPasswordMatchError("");
      }
    };
    
    const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {

      e.preventDefault();
      if (passwordErrors.length > 0 || passwordMatchError || password !== passwordAgain || !oobCode){
        console.log(passwordErrors.length > 0, passwordMatchError, password !== passwordAgain,!oobCode);
        setError("There has been an error (our fault), please refresh"); //this shouldn't ever happen
        return;
      } 

      try {
        await confirmPasswordReset(auth, oobCode, password)
        
      } catch (error: any) {
        setPasswordErrors([
          error.code === "auth/weak-password"
            ? "The password is too weak. Please choose a stronger password."
            : error.code === "auth/expired-action-code"
            ? "The password reset link has expired. Please request a new one."
            : error.code === "auth/invalid-action-code"
            ? "The password reset link is invalid. Please request a new one."
            : "Failed to reset password: " + error.message
        ]);
        setLoading(false);
      }
      setSuccess(true);
    };

    if (error) 
      return <ErrorScreen errorMessage={error} />;
    if (success) {
      return (
        <main className="flex items-center justify-center min-h-screen px-4">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-custom-green">Password reset successful</h2>
            <p className="mb-4">Changes applied, you can <Link href="/" className='cursor-pointer font-semibold text-custom-blue-80 hover:text-custom-blue'>sign in </Link>with your new password now.</p>
            <Link href="/" className="text-custom-blue-80 hover:text-custom-blue">Back to login</Link>
          </div>
        </main>
      );
    }
  return (
    <form onSubmit={handleResetPassword}>
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <Image className="mx-auto h-20 w-auto" priority src={genericLogo} alt="Generic logo" />
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight  ">
            Reset your password
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm ">
          <div className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 ">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  required
                  disabled={true}
                  className="custom-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium leading-6 ">
                New password
              </label>
              <div className="mt-2 relative">
                <input
                  id="password"
                  name="password"
                  autoFocus={!password}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  onChange={(e) =>{ setPassword(e.target.value);
                    if(!passwordTouched) setPasswordTouched(true);
                  }}
                  
                  required
                  disabled={loading}
                  
                  className="custom-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
                >
                  {showPassword ? <FaEye className='cursor-pointer'/> : <FaEyeSlash className='cursor-pointer'/>}
                </button>
              </div>
               {/* Password Validation Messages */}
               {passwordErrors.length > 0 && (
                <ul className="mt-2 text-sm text-red-500">
                  {passwordErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Password Again field with visibility toggle */}
            <div>
              <label htmlFor="passwordAgain" className="block text-sm font-medium leading-6 ">
              Confirm new password
              </label>
              <div className="mt-2 relative">
                <input
                  id="passwordAgain"
                  name="passwordAgain"
                  type={showPasswordAgain ? "text" : "password"}
                  autoComplete="current-password"
                  
                  onFocus={()=>{setPasswordAgainFocused(true)}}
                  onChange={(e) =>{ setPasswordAgain(e.target.value);
                    if(!passwordAgainTouched) setPasswordAgainTouched(true)
                  }}
                  required
                  disabled={loading}
                  className="custom-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordAgain(!showPasswordAgain)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
                >
                  {showPasswordAgain ? <FaEye className='cursor-pointer'/> :<FaEyeSlash className='cursor-pointer'/> }
                </button>
              </div>
              {passwordMatchError && passwordAgainTouched && passwordAgain!=="" && (
                <p className="mt-2 text-sm text-red-500">{passwordMatchError}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={passwordErrors.length>0 || loading || !passwordAgainFocused || passwordAgain ==="" || password !== passwordAgain}
                className={`disabled:opacity-40 disabled:cursor-default cursor-pointer flex w-full justify-center rounded-md  bg-custom-blue px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm  focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-custom-blue`}
              >
                {loading ? 'Resetting password...' : 'Reset password'}
              </button>
            </div>

            <div className="text-center mt-4">
              <Link href="/" className="cursor-pointer font-semibold text-custom-blue-80 hover:text-custom-blue text-sm">Back to login</Link>
              
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}


