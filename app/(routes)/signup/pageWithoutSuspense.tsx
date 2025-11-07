"use client";
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, FormEvent, useEffect } from 'react';
import { auth, db } from '../../firebase';
import onlineTaxmanLogo from "../../../public/onlineTaxmanLogo.svg";
import Image from 'next/image';
import { toast } from 'react-toastify';
import { useSignInWithEmailAndPassword } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { decrypt } from '@/app/helper';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Link from 'next/link';
import { checkIfUserExists } from '../forgot-password/helper';




export default function SignUpPage() {
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordAgainTouched, setPasswordAgainTouched] = useState(false);// touched is for when the focus went in and out
  const [passwordAgainFocused, setPasswordAgainFocused] = useState(false);
  
  const [email, setEmail] = useState('');
  const [continueTo, setContinueTo] = useState('');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailDisabled, setEmailDisabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordAgain, setShowPasswordAgain] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [signInWithEmailAndPassword] = useSignInWithEmailAndPassword(auth);
  const [passwordMatchError, setPasswordMatchError] = useState("");



  useEffect(() => {
    if (passwordTouched) {
      validatePassword(password);
    }
  }, [password, passwordTouched]);
  
  useEffect(() => {
      validatePasswordMatch();
  }, [passwordAgain, password, passwordAgainTouched]);

  useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
         if (user) 
          router.push("/")
        })


    const encryptedEmail = searchParams.get('ee');
    const continueTo = searchParams.get('continueTo');
    if (continueTo) {
      setContinueTo(continueTo);
    }
    if (encryptedEmail) {
      try {
        decrypt(encryptedEmail).then((decryptedEmail:string)=>{
          setEmail(decryptedEmail);
          setEmailDisabled(true); // Disable the email input when decrypted});
          document.getElementById("password")?.focus()
        })
      } catch (error) {
        toast.error('Failed to decrypt email.');
      }
    }
    return () => unsubscribe();
  }, [searchParams]);

  const signup = async (event: FormEvent) => {
    event.preventDefault();

    if (passwordErrors.length > 0 || passwordMatchError) return;

    setLoading(true);

    try {
      let userExists=await checkIfUserExists(email);
      if (!userExists.exists) {
        toast.error("No account found for this email.");
        setLoading(false);
        return;
      }

      // Create the user with email and password
      await createUserWithEmailAndPassword(auth, email, password);
      // Automatically sign the user in
      await signInWithEmailAndPassword(email, password).then(async (userCredential) => {
        if(userCredential){
        const { email: userEmail } = userCredential.user;
        var onlineTaxmanDocRef, onlineTaxmanDoc;
        let success = false, tries = 0;
      
        while (!success && tries < 10) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // with 500 it worked but to be sure
          try {
            onlineTaxmanDocRef = doc(db, 'activeUser', email);
            onlineTaxmanDoc = await getDoc(onlineTaxmanDocRef);
            if (onlineTaxmanDoc.exists()) {
              success = true;
              await fetch('/api/auth', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
              });
              if (onlineTaxmanDoc && onlineTaxmanDoc.data()) {
                if (continueTo) {
                  router.push(continueTo);
                } else {
                  router.push('/');
                }
              }else{
                setLoading(false);
              }
              if(onlineTaxmanDoc.data().admin===true){
                await sendEmailVerification(userCredential.user);
                alert("Confirmation email sent to "+userEmail+", please verify your account before signing in to your admin account")
              }

            } else {
              console.log("try " + tries);
            }
          } catch (e) {
            console.log("try " + tries);
          }
          tries++;
        }
      
        if (!onlineTaxmanDoc) {
          setLoading(false);
          toast.success(`The account for ${email} has been created, please sign in`);
          return;
        }
        if (!onlineTaxmanDoc.exists()) {
          setLoading(false);
          toast.success(`The account for ${email} has been created, please sign in`);
        }
      }
      });
      


    } catch (error: unknown) {
      if (error instanceof Error) {
        let errorMessage = error.message.replace("Firebase: ", "");
        toast.error(errorMessage);
        setLoading(false);
      }
    } 
  };

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
  

  return (
    <form onSubmit={signup}>
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <Image className="mx-auto h-20 w-auto" priority src={onlineTaxmanLogo} alt="Online Taxman" />
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight">
            Sign up
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
                  autoFocus={!email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  required
                  disabled={loading || emailDisabled}
                  className="custom-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium leading-6 ">
                Password
              </label>
              <div className="mt-2 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  onChange={(e) =>{ setPassword(e.target.value);
                    if(!passwordTouched) setPasswordTouched(true);
                  }}
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
                Password again
              </label>
              <div className="mt-2 relative">
                <input
                  id="passwordAgain"
                  name="passwordAgain"
                  type={showPasswordAgain ? "text" : "password"}
                  autoComplete="current-password"
                  onFocus={()=>{setPasswordAgainFocused(true)}}
                   onChange={(e) =>{
                    setPasswordAgain(e.target.value);
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
                className={`disabled:opacity-40 flex w-full justify-center rounded-md  bg-custom-blue px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm  focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-custom-blue
                  ${(passwordErrors.length>0 || loading || !passwordAgainFocused || passwordAgain ==="" || password !== passwordAgain) ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {loading ? 'Signing up...' : 'Sign up'}
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


