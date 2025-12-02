'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged, signInWithEmailAndPassword, User, getAuth } from 'firebase/auth';
import Image from 'next/image';
import onlineTaxmanLogo from "../public/onlineTaxmanLogo.svg";
import Questionnaires from './components/Questionnaire';
import { toast } from 'react-toastify';
import Spinner from '@/app/components/Spinner'; // Import your Spinner component
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { decrypt, retrieveCredentials, setLoginCookies } from './helper';
import { auth } from './firebase';
import Link from 'next/link';
//import { checkIfUserExists } from './(routes)/forgot-password/helper';



export default function PageWithoutSuspense() {
  const [signInError, setSignInError] = useState<string | null>(null);
  const [emailDisabled, setEmailDisabled] = useState(false);
  const [success, setSuccess] = useState<string>("");
  const [signingInLoading, setSigningInLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSessionLoading, setIsSessionLoading] = useState(true); // New state for session loading
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {

    const auth = getAuth();
    // Monitor auth state changes and set the user accordingly
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsSessionLoading(false); // Set session loading to false once auth state is determined
        const continueTo = searchParams.get('continueTo');
        if (continueTo) {
          router.push(continueTo);
        }
      } else {
        try {
          const login = async () => {
            //console.log("logging with cookies")
            const credentials = await retrieveCredentials();
            if (credentials) {
              const { emailCookie, passwordCookie } = credentials;
              signInWithEmailAndPassword(auth, emailCookie, passwordCookie);
            } else {
              const encryptedEmail = searchParams.get('ee');
              if (encryptedEmail) {
                try {
                  decrypt(encryptedEmail).then((decryptedEmail:string)=>{
                    setEmail(decryptedEmail);
                    setEmailDisabled(true); // Disable the email input when decrypted});
                    setSuccess(`A questionnaire has been found for an active account with the email ${decryptedEmail} please sign in.`)
                    document.getElementById("password")?.focus()
                  })
                } catch (error) {
                  toast.error('Failed to decrypt email.');
                }
              }
                
            }
          }
          login().then(() => {
            setIsSessionLoading(false);
          })
        }
        catch (error) {
          console.error('Error fetching cookies:', error);
          toast.error("There was an error restoring your session, please log in again.");
        } finally {
          setIsSessionLoading(false); // End the loading state
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSignInError(null);

    try {
      setSigningInLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      //it wouldn't get to this point if user or pass would be wrong, so I'll save the cookies for this successful log in
      setLoginCookies(email, password);
      const continueTo = searchParams.get('continueTo');
      if (continueTo) {
        router.push(continueTo);
      } 
    } catch (err: any) {
      console.error('Error signing in handle:', err);
      if (err.message === "Firebase: Error (auth/invalid-credential)."){
        //let userExists=await checkIfUserExists(email);
        //if(userExists.exists && !userExists.hasSignedUp)
        //  setSignInError(`You are enabled to sign up with this email (${email}), please sign up before trying to sign in.`)
        // else
          setSignInError("The email or password you've entered is incorrect. Please try again.")
      }
      else {
        if(err.message?.includes("auth/visibility-check-was-unavailable"))
          console.log("Our third-party auth provider is currently experiencing an outage. Please wait a bit and try again. We apologize for the inconvenience.")
        setSignInError(err.message?.replaceAll("Firebase: ", "") || 'An error occurred while signing in. Please try again.');
      }
    } finally {
      setSigningInLoading(false);
    }
  };

  // Display spinner while session is being confirmed
  if (isSessionLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  // Show the login form if there is no current user
  if (!isSessionLoading && !auth.currentUser) {
    return (
      <form onSubmit={handleSubmit}>
        <div className="flex flex-1 flex-col justify-center items-center px-6 py-12 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <Image className="mx-auto h-20 w-auto" src={onlineTaxmanLogo} alt="Online Taxman" priority />
            <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight ">
              Sign in to your account
            </h2>
          </div>

          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
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
                    autoFocus={!email}
                    autoComplete="email"
                    value={email}
                    disabled={emailDisabled}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="custom-input"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium leading-6 ">
                    Password
                  </label>
                  <div className="text-sm">
                    <Link href="/forgot-password" className="cursor-pointer font-semibold text-custom-blue-80 hover:text-custom-blue">
                      Forgot password?
                    </Link>
                  </div>
                </div>
                <div className="mt-2 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="custom-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 "
                  >
                    {showPassword ? <FaEye className='cursor-pointer'/> : <FaEyeSlash className='cursor-pointer'/>}
                  </button>

                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={!email || !password || signingInLoading}
                  style={{ background: '#0d7ec9' }}
                  className="disabled:opacity-40 disabled:cursor-default cursor-pointer flex w-full justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-custom-blue-80 focus-visible:outline  focus-visible:outline-offset-2 focus-visible:outline-custom-blue"
                >
                  {signingInLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
              {signInError && (
                <div className="text-red-500 text-center">
                  {signInError.includes("Firebase: Missing password requirements:") ? (
                    <div>
                      We've updated our password policy, and your password doesn't seem to meet the criteria.<br />
                      Please reset your password. We apologize for the inconvenience.{" "}
                      <Link
                        href="/forgot-password"
                        className="cursor-pointer text-custom-blue-80 hover:text-custom-blue"
                      >
                        Click here to reset it.
                      </Link>
                    </div>
                  ) : (
                    signInError
                  )}
                </div>
              )}
              {success && (
                <div className="text-green-500 text-center">
                  {success}
                  </div>)}
              

              <div className="text-center mt-6">
                <div className="text-sm ">
                  Don't have an account?{' '}
                  <Link
                    href={'/signup'}
                    className="cursor-pointer font-semibold text-custom-blue-80 hover:text-custom-blue"
                  >
                    Sign up here
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    );
  }

  return <Questionnaires />;
}
