"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Head from "next/head";
import Navbar from "@/app/components/Navbar";
import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa";
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/app/firebase";
import { Formik, Form, Field } from "formik";
import { useRouter } from "next/navigation";
import SpinnerCircular from "@/app/components/SpinnerCircular";

const preferencesData = [
  {
    id: "yearlyTaxKickoff",
    label: "Yearly Tax Kickoff",
    description:
      "An annual email at the beginning of the year with expected tax obligations.",
    defaultEnabled: true,
  },
  {
    id: "taxDeadlineReminders",
    label: "Tax Deadline Reminders",
    description: "Notifications about upcoming tax deadlines.",
    defaultEnabled: true,
  },
  {
    id: "personalizedTaxAdvice",
    label: "Personalized Tax Advice",
    description: "Customized tax tips based on your profile.",
    defaultEnabled: true,
  },
  {
    id: "emailNewsletter",
    label: "Email Newsletter",
    description: "Regular newsletter with tax updates and news.",
    defaultEnabled: true,
  },
  {
    id: "discountsAndOffers",
    label: "Discounts and Offers",
    description: "Special promotions and discounted services.",
    defaultEnabled: false,
  },
];

export default function PreferencesPage() {
  const [initialValues, setInitialValues] = useState<Record<string, boolean>>({});
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const defaultPreferences = useMemo(() => {
    return preferencesData.reduce((acc, pref) => {
      acc[pref.id] = pref.defaultEnabled;
      return acc;
    }, {} as Record<string, boolean>);
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user?.email) {
        const email = user.email;
        setUserEmail(email);
        const userDocRef = doc(db, "activeUser", email);
        const userSnap = await getDoc(userDocRef);
  
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const savedPrefs = userData.preferences;
  
          if (savedPrefs) {
            setInitialValues(savedPrefs);
          } else {
            await setDoc(userDocRef, { preferences: defaultPreferences }, { merge: true });
            setInitialValues(defaultPreferences);
          }
  
          setLoaded(true);
        } else {
          await setDoc(userDocRef, { preferences: defaultPreferences }, { merge: true });
          setInitialValues(defaultPreferences);
          setLoaded(true);
        }
      } else {
        router.push(`/?continueTo=${encodeURIComponent(window.location.pathname)}`);
      }
    });
  
    return () => unsubscribe();
  }, [defaultPreferences]);
  

  const renderPreference = (pref: any) => (
    <div key={pref.id} className="flex items-start justify-between py-4 border-b last:border-b-0">
      <div>
        <h4 className="font-medium text-sm">{pref.label}</h4>
        <p className="text-sm text-gray-500">{pref.description}</p>
      </div>
      {loaded && Object.keys(initialValues).length > 0 ? (
        <Field name={pref.id} type="checkbox">
          {({ field }: any) => (
            <label className="inline-flex items-center cursor-pointer ml-4 relative">
              <input
                type="checkbox"
                className="sr-only peer"
                {...field}
                checked={field.value ?? false}
              />
              <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-custom-blue-60 transition-colors"></div>
              <div className="absolute ml-1.5 mt-0.5 mb-0.5 w-4 h-4 bg-white rounded-full shadow transform peer-checked:translate-x-5 transition-transform"></div>
            </label>
          )}
        </Field>
      ) : (
        <SpinnerCircular size={36}/>
      )}
    </div>
  );

  return (
    <>
      <Head>
        <title>{`Online Taxman - Preferences`}</title>
      </Head>
      <Navbar />

      <div className="min-h-screen bg-gray-100 py-12 px-4 flex justify-center items-start">
        <div className="flex items-start gap-2 max-w-4xl w-full relative">
          <Link
            href="/"
            className="mt-2 text-custom-blue-80 hover:text-custom-blue transition duration-200 flex items-center"
          >
            <FaArrowLeft className="h-5 w-5" />
          </Link>

          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-3xl">
            <h1 className="text-2xl font-bold mb-2">Email Preferences</h1>
            <p className="text-gray-600 mb-6">
              Manage your email preferences for tax-related updates and information.
            </p>

            <Formik
              initialValues={initialValues}
              enableReinitialize
              onSubmit={async (values) => {
                if (!userEmail) return;
                setLoading(true);
                try {
                  await updateDoc(doc(db, "activeUser", userEmail), {
                    preferences: values,
                  });
                  toast.success("Preferences saved successfully!");
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to save preferences.");
                } finally {
                  setLoading(false);
                }
              }}
            >
              {({ handleSubmit }) => (
                <Form>
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-4">Your Email Preferences</h2>
                    {preferencesData.map(renderPreference)}
                  </div>

                  <div className="flex justify-end mt-8">
                    <button
                      type="submit"
                      disabled={loading}
                      style={{ background: '#0d7ec9' }}
                      className="disabled:opacity-40 disabled:cursor-default flex items-center gap-2 bg-custom-blue-80 text-white px-6 py-2 rounded-lg hover:bg-custom-blue-80 transition  cursor-pointer"
                    >
                      {loading ? "Saving..." : "Save Preferences"}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </>
  );
}
