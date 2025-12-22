"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Formik, Form } from "formik";
import FieldRenderer from "./FieldRenderer";
import Spinner from "@/app/components/Spinner";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "@/app/components/Navbar";
import Head from "next/head";
import { checkQuestionnaireInstanceIdBelongsToActiveUser, fetchField, filterConditionalPages, moveNextPage, saveProgress, submitResponse, movePreviousPage, handleSectionClick } from "./helper";
import ErrorScreen from "@/app/components/ErrorScreen";
import { FaArrowLeft } from "react-icons/fa";
import { Questionnaire, fetchQuestionnaire } from "@/app/DTOs/questionnaire";
import { FormValues } from "@/app/DTOs/generalInterfaces";
import Link from "next/link";
import { QuestionnaireField } from "@/app/DTOs/questionnaireField";



export default function ClientQuestionnaire() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filteredPages, setFilteredPages] = useState<Set<string>>(new Set());
  const params = useParams();
  const questionnaireName = Array.isArray(params.questionnaireName)
    ? params.questionnaireName[0]
    : params.questionnaireName;
  const [currentPageIndex, setCurrentPageIndex] = useState<number | null>(null);
  let questionnaireInstanceId = searchParams.get("questionnaireInstanceId");
  const preview = searchParams.get("preview");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldsFetched, setFieldsFetched] = useState(false);
  const [pages, setPages] = useState<Record<string, string[]>>({});
  const [resolvedFieldsByPage, setResolvedFieldsByPage] = useState<Record<string, QuestionnaireField[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<FormValues>({});
  const [loading, setLoading] = useState(true);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [clientId, setClientId] = useState<string>("");


  const [fileUploadingList, setFileUploadingList] = useState<{ fileName: string, promise: Promise<void>, fieldId: string }[]>([]);

  const fetchAllFields = async (pages: Record<string, string[]>, values: FormValues) => {
    const pageEntries = await Promise.all(
      Object.entries(pages).map(async ([pageKey, fieldIds]) => {
        const fields = await Promise.all(
          fieldIds.map(async (fieldId) => {
            try {
              return (await fetchField(fieldId));
            } catch {
              return null;
            }
          })
        );
        return [pageKey, fields.filter((f): f is QuestionnaireField => f !== null)];
      })
    );
    const fieldsByPage = Object.fromEntries(pageEntries);
    setResolvedFieldsByPage(fieldsByPage);
    setFieldsFetched(true);
  };

  useEffect(() => {
    const fetchClientId = async () => {
      if (auth.currentUser?.email) {
        const responseDocRef = doc(db, "activeUser", auth.currentUser.email);
        const responseDoc = await getDoc(responseDocRef);
        if (responseDoc.exists()) {
          setClientId(responseDoc.data()?.clientId);
        }
      }
    };
    fetchClientId();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (questionnaireInstanceId && questionnaireInstanceId.length > 10) {
          try {
            const data = await checkQuestionnaireInstanceIdBelongsToActiveUser(questionnaireInstanceId);
            if (data.wiBelongsToActiveUser === null) {
              setError("Questionnaire instance not found, please log in to see your active questionnaire instances");
            } else if (data.wiBelongsToActiveUser === true) {
              router.push(`/?continueTo=${encodeURIComponent(window.location.pathname + window.location.search)}&ee=${data.email}`);
            } else {
              router.push(`/signup?ee=${data.email}&continueTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
            }
          } catch (err) {
            console.error("Error checking questionnaire instance:", err);
            setError("An error occurred while verifying your questionnaire.");
          }
        } else {
          if (!searchParams.get("continueTo")) {
            router.push(`/?continueTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          }
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router, questionnaireInstanceId, auth.currentUser]);

  useEffect(() => {
    if (!questionnaireName || authLoading || !auth.currentUser) return;

    const fetchQuestionnaireData = async () => {
      try {
        const questionnaireLocalScope = await fetchQuestionnaire(questionnaireName);
        setQuestionnaire(questionnaireLocalScope);
        if (!questionnaireLocalScope) {
          setLoading(false);
          setError(`The questionnaire ${questionnaireName} doesn't exist.`);
          setCurrentPageIndex(0);
          return;
        }
        const sortedKeys = Object.keys(questionnaireLocalScope.pages).sort((a, b) => {
          const numA = parseInt(a.match(/^\d+/)?.[0] || "0", 10);
          const numB = parseInt(b.match(/^\d+/)?.[0] || "0", 10);
          return numA - numB;
        });

        const sortedPages: Record<string, string[]> = sortedKeys.reduce(
          (acc, key) => ({ ...acc, [key]: questionnaireLocalScope.pages[key] }),
          {}
        );

        const formValues: FormValues = {};
        Object.keys(questionnaireLocalScope.pages).forEach((page) => {
          questionnaireLocalScope.pages[page].forEach((field) => {
            formValues[field] = "";
          });
        });

        if (auth.currentUser?.email && questionnaireInstanceId) {
          const inProgressDocRef = doc(db, "inProgressQuestionnaire", auth.currentUser.email);
          const inProgressDoc = await getDoc(inProgressDocRef);

          if (inProgressDoc.exists()) {
            const savedData = inProgressDoc.data() || {};
            const wiData = savedData[questionnaireInstanceId];
            if (wiData) {
              Object.keys(wiData).forEach((key) => {
                formValues[key] = wiData[key];
              });
              setCurrentPageIndex(wiData.currentPageIndex || 0);
            } else {
              setError("We couldn't find a questionnaire with that questionnaire instance ID.");
              return;
            }
          } else {
            setError("No saved data found for this questionnaire.");
            return;
          }
        }
        setInitialValues(formValues);
        if (!preview) filterConditionalPages(questionnaireLocalScope.pagesConditionalLogic, formValues, setFilteredPages);
        setPages(sortedPages);
        await fetchAllFields(sortedPages, formValues);
      } catch (error) {
        console.error("Error fetching questionnaire:", error);
        setError("An error occurred while fetching the questionnaire.");
      } finally {
        setLoading(false);
      }
    };

    if (preview) setCurrentPageIndex(0);
    if (questionnaireInstanceId || preview === "true") fetchQuestionnaireData();
    else setError("You have to specify the questionnaire instance in the URL.");
  }, [questionnaireName, authLoading, questionnaireInstanceId, clientId]);





  if (error && !authLoading) {
    return <ErrorScreen errorMessage={error} />;
  }

  let remainingPages = Object.keys(pages)
    .filter((pageTitle) => {
      return !filteredPages.has(pageTitle); // ✅ use .has for Set
    })

  if (authLoading || (remainingPages.length === 0 && loading) || currentPageIndex === null) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }


  return (
    <>
        
      <Head>
        <title>{`Generic Company - ${questionnaireName?.replaceAll("-", " ")}`}</title>
      </Head>
      <Navbar />
      
      <div className="flex flex-col items-center py-8 bg-gray-50">
   
        <h1 className="text-4xl font-bold mb-8 ml-2 max-w-6xl text-center">
          {typeof questionnaireName === "string" &&
            questionnaireName.replaceAll("-", " ")
          }
        </h1>
        <div id="page-buttons" className="flex flex-wrap justify-center max-w-6xl mx-auto space-x-4 mb-8">
          {remainingPages.length > 1 &&
            remainingPages
              .filter((pageTitle) => {
                return !filteredPages.has(pageTitle);
              })
              .map((pageKey, pageIndex) => (
                <span
                  key={pageKey}
                  onClick={() => handleSectionClick(pageIndex, setCurrentPageIndex, questionnaireInstanceId, pages)}
                  className={`cursor-pointer px-4 py-2 text-custom-blue-80 hover:text-custom-blue transition duration-200 ${currentPageIndex === pageIndex ? "font-bold text-custom-blue" : ""
                    }`}
                >
                  {pageIndex + 1 + pageKey.replace(/^\d+/, "")}
                </span>
              ))}

        </div>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          onSubmit={async (values, actions) => {
            if (currentPageIndex === remainingPages.length - 1) {
              if (questionnaire && questionnaireName) {
                setIsSubmitting(true);
                await submitResponse(
                  setIsSubmitting,
                  values,
                  questionnaireInstanceId || "",//"" because of preview
                  questionnaireName,
                  clientId,
                  questionnaire,
                  fileUploadingList,
                  actions,
                  setCurrentPageIndex,
                  router
                );
              }
            } else {
              moveNextPage(document, setCurrentPageIndex, questionnaireInstanceId, pages);
            }
          }}
        >
          {({
            values,
            setFieldValue,
            setFieldError,
            submitForm,
            validateField,
            validateForm,
          }) => (
            <Form className="w-full max-w-6xl mx-auto bg-white p-2 sm:p-8 rounded-lg shadow">
              <div>
                <h1 id="target-section" className="text-3xl font-semibold text-center mb-10">
                  {remainingPages.length > 1 && remainingPages[currentPageIndex]?.replace(/^\d+/, '')}
                </h1>
                {fieldsFetched ? (
                  (resolvedFieldsByPage[remainingPages[currentPageIndex]] || []).map((field, index) => {
                    return (
                      <FieldRenderer
                        key={field.id || index}
                        filterConditionalPages={(newValues)=>{
                          filterConditionalPages(questionnaire?.pagesConditionalLogic,newValues,setFilteredPages)
                        }}
                        index={index}
                        field={field}
                        setFieldValue={setFieldValue}
                        values={values}
                        setFieldError={setFieldError}
                        submitForm={submitForm}
                        validateField={validateField}
                        validateForm={validateForm}
                        setFileUploadingList={setFileUploadingList}
                        preview={preview}
                        questionnaireInstanceId={questionnaireInstanceId || ""}
                      />
                    )
                  })
                ) : (
                  <Spinner />
                )}
              </div>
              <div className="mt-8 flex justify-between">
                {currentPageIndex > 0 ? (
                  <button
                    type="button"
                    className="px-6 py-3 bg-custom-orange-80 hover:bg-custom-orange text-white font-bold rounded cursor-pointer"
                    onClick={() => movePreviousPage(setCurrentPageIndex, questionnaireInstanceId, pages)}
                  >
                    Previous page
                  </button>
                ) : (
                  <div />
                )}

                {currentPageIndex < remainingPages.length - 1 ? (
                  <button
                    type="submit"
                    className="px-6 py-3 bg-custom-blue-80 cursor-pointer hover:bg-custom-blue text-white font-bold rounded ml-auto"
                  >
                    Next page
                  </button>
                ) : (
                  !preview && (
                    isSubmitting ? (
                      <button
                        className="px-6 py-3 bg-custom-green-80 hover:bg-custom-green text-white font-bold rounded ml-auto"
                        type="button"
                      >
                        Submitting...
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="px-6 py-3 bg-custom-green-80 ml-5 hover:bg-custom-green text-white font-bold rounded cursor-pointer"
                      >
                        Submit completed questionnaire
                      </button>
                    )
                  )
                )}
              </div>
            </Form>
          )}
        </Formik>

      </div>
    </>
  );
}
