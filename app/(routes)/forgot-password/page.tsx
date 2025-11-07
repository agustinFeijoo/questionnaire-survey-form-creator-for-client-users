'use client';
import { useState, useEffect } from 'react';
import { Formik,  Form } from 'formik';
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from '../../firebase';
import onlineTaxmanLogo from "../../../public/onlineTaxmanLogo.svg";
import Image from 'next/image';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { checkIfUserExists } from './helper';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);
  const[info,setInfo]=useState(false);
  const[success,setSuccess]=useState(false);

  // ✅ Validate email when it changes
  useEffect(() => {
    const trimmedEmail = email.trim();

    if (trimmedEmail === '') {
      setEmailError('');
      setIsEmailValid(false);
    } else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(trimmedEmail)
    ) {
      setEmailError('Invalid email address');
      setIsEmailValid(false);
    } else {
      setEmailError('');
      setIsEmailValid(true);
    }
  }, [email]);

  const resetEmail = async () => {
    const trimmedEmail = email.trim();
  
    if (!trimmedEmail) {
      toast.error("Please enter your email address.");
      return;
    }
  
    try {
      let userExists=(await checkIfUserExists(trimmedEmail));
      console.log("userExists ",userExists)
      if (userExists.hasSignedUp) {
        await sendPasswordResetEmail(auth, trimmedEmail);
        setSuccess(true);
      } else if(userExists.exists && !userExists.hasSignedUp){
        setInfo(true);
      }else{
        toast.error("There is no account related to that email address.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset password email.");
      console.error("Reset password error:", error);
    }
  };
  if(info){
    return(
      <main className="flex items-center justify-center min-h-screen px-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-custom-green">You are enabled to sign up</h2>
        <p className="mb-4">You haven't created an account yet, but you are enabled to <Link href="/signup" className='cursor-pointer font-semibold text-custom-blue-80 hover:text-custom-blue'>sign up </Link>with that same email address ({email}).</p>
        <Link href="/" className="text-custom-blue-80 hover:text-custom-blue">Back to login</Link>
      </div>
    </main>
    )
  }

  if(success){
    return(
      <main className="flex items-center justify-center min-h-screen px-4">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-custom-green">Email sent</h2>
        <p className="mb-4">Check your email for a link to reset your password. If it doesn’t appear within a few minutes, check your spam folder.</p>
        <Link href="/" className="text-custom-blue-80 hover:text-custom-blue">Back to login</Link>
      </div>
    </main>
    )
  }

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <Image className="mx-auto h-20 w-auto" priority src={onlineTaxmanLogo} alt="Online Taxman" />
        <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight ">
          Forgot Password
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <Formik
          initialValues={{}}
          onSubmit={async (_, { setSubmitting }) => {
            await resetEmail();
            setSubmitting(false);
          }}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium leading-6 ">
                  Email address
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    autoFocus={!email}
                    onChange={(e) => {
                      setEmail(e.target.value.toLowerCase());
                      if(!emailTouched) setEmailTouched(true);
                    }
                    }
                    required
                    className="custom-input"
                  />
                  {emailTouched && emailError && (
                    <div className="mt-1 text-sm text-red-500">{emailError}</div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={!isEmailValid || isSubmitting}
                className="disabled:opacity-40 disabled:cursor-default cursor-pointer flex w-full justify-center rounded-md bg-custom-blue px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm  focus-visible:outline-offset-2 "
              >
                {isSubmitting ? 'Sending...' : 'Send Forgot Password Email'}
              </button>
            </Form>
          )}
        </Formik>

        <div className="text-center mt-4">
          <Link
            href="/"
            className="cursor-pointer font-semibold text-custom-blue-80 hover:text-custom-blue text-sm"
          >
            Back to sign in
          </Link>
        </div>

        <div className="text-center mt-4">
          <Link
            href="/signup"
            className="cursor-pointer font-semibold text-custom-blue-80 hover:text-custom-blue text-sm"
          >
            Go to sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
