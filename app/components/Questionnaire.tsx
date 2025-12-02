"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  deleteField,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/app/firebase";
import Spinner from "@/app/components/Spinner";
import Navbar from "@/app/components/Navbar";
import {  FaSave } from "react-icons/fa";
import { toast } from "react-toastify";
import NewQuestionnaireButton from "./NewQuestionnaireButton";
import { fetchQuestionnaires, Questionnaire } from "../DTOs/questionnaire";
import { QuestionnaireRow, WI } from "./QuestionnaireRow";
import { fetchQuestionnaireResponse } from "../DTOs/questionnaireResponse";

export default function Questionnaires() {
  const [loading, setLoading] = useState(true);
  const [WIs, setWIs] = useState<WI[]>([]);
  const [prodQuestionnaires, setProdQuestionnaires] = useState<Questionnaire[]>([]);
  const [admin, setAdmin] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [downloadingPDFs, setDownloadingPDFs] = useState<string[]>([]);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<{
    title: string;
    WIID: string;
  } | null>(null);
  const [hasAnyResponse, setHasAnyResponse] = useState(false);


  const buttonRef = useRef<HTMLDivElement | null>(null);

  const handleDeleteClick = (title: string, WIID: string) => {
    setSelectedQuestionnaire({ title, WIID });
    setModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    
    if (selectedQuestionnaire && auth.currentUser?.email) {
      setWIs((prev) =>
              prev.filter((item) => item.wiId !== selectedQuestionnaire.WIID)
            );
            setModalOpen(false);
      try {
        const docRef = doc(db, "inProgressQuestionnaire", auth.currentUser.email);
        const docSnapshot = await getDoc(docRef);

        if (docSnapshot.exists()) {
          const docData = docSnapshot.data();
          if (docData?.[selectedQuestionnaire.WIID]) {
            await updateDoc(docRef, {
              [selectedQuestionnaire.WIID]: deleteField(),
            });
            toast.success(
              `The instance for ${selectedQuestionnaire.title} was successfully deleted`
            );
            
          } else {
            toast.error("The WIID does not exist in the document.");
          }
        } else {
          toast.error("The document does not exist.");
        }
      } catch (error) {
        console.error("Error deleting WIID attribute:", error);
        toast.error("There was an error deleting the WIID. Please try again.");
      }
    }
  };

  
  const fetchResponsesAndInProgress = async () => {
    if (auth.currentUser?.email) {
      try {
        // Fetch the questionnaire responses
        const questionnaireResponseRecordLocal=await fetchQuestionnaireResponse(auth.currentUser.email);
        
        // Fetch the in-progress questionnaire data
        const inProgressDoc = await getDoc(
          doc(db, "inProgressQuestionnaire", auth.currentUser.email)
        );
        const inProgressData = inProgressDoc.data() || {};
  
        // Map the in-progress WIs and merge with responses
        const inProgressWIs = Object.entries(inProgressData)
          .filter(([key]) => key !== "userId") // Exclude userId
          .map(([wiId, data]) => ({
            wiId,
            inProgressQuestionnaire: data,
            responses: questionnaireResponseRecordLocal[wiId]?.responses || [],
          }));
  
        // Update state
        setWIs(inProgressWIs);
        setHasAnyResponse(inProgressWIs.some((wi) => wi.responses?.length > 0));
      } catch (error) {
        console.error("Error fetching data:", error);
        //toast.error("Failed to fetch questionnaire data."); FIX: do some kind of error handling in here
      }
    }
  };
  
  useEffect(() => {
    const loadData = async () => {
      setProdQuestionnaires(await fetchQuestionnaires());
      await fetchResponsesAndInProgress();
      //just to display or not the new questionnaire button
      
      setLoading(false);
    };

    if (auth.currentUser) loadData();
  }, [auth.currentUser]);

  const filteredWIs = WIs.filter((WI) =>
    prodQuestionnaires.some(
      (p) => p.title === WI.inProgressQuestionnaire.questionnaireIdInPortal.replaceAll("-", " ")
    )
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center py-8 bg-gray-50">
        <h1 className="text-3xl font-bold mb-8">Your Questionnaires</h1>
        {filteredWIs.length === 0 ? (
          <>
            <div className="mb-4">No questionnaires found.</div>
            <NewQuestionnaireButton buttonRef={buttonRef} prodQuestionnaires={prodQuestionnaires} />
          </>
        ) : (
          <div className="relative w-full max-w-6xl mx-auto bg-white  p-2 rounded-lg shadow-md pb-12">
            <div className={`grid items-center mb-4 border-b pb-2 ${hasAnyResponse ? "grid-cols-4" : "grid-cols-3"} gap-4`}>
              <span className="font-bold text-gray-700 text-center truncate">Questionnaire</span>
              <span className="font-bold text-gray-700 text-center truncate">Progress</span>
              {hasAnyResponse && <span className="font-bold text-gray-700 text-center truncate">Response</span>} {/* /s */}
              {/*hasAnyResponse && <span className="font-bold text-gray-700 text-center">Suggest an edition</span>*/}
              <span className="font-bold text-gray-700 text-center">Delete</span>
            </div>
            <ul className="space-y-4 mb-12">
              {filteredWIs.reverse().map((WI, index) => (
                <QuestionnaireRow
                  key={index}
                  WI={WI}
                  hasAnyResponse={hasAnyResponse}
                  downloadingPDFs={downloadingPDFs}
                  toggleRowExpansion={(wiId) =>
                    setExpandedRows((prev) => ({ ...prev, [wiId]: !prev[wiId] }))
                  }
                  expandedRows={expandedRows}
                  handleDeleteClick={handleDeleteClick}
                  setDownloadingPDFs={setDownloadingPDFs}
                />
              ))}
            </ul>
            {modalOpen && (
              <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-20">
                <div className="bg-white p-8 rounded-lg shadow-lg w-96">
                  <h2 className="text-xl font-semibold mb-4">
                    Are you sure you want to delete your instance of {selectedQuestionnaire?.title}?
                  </h2>
                  <div className="flex justify-end space-x-4">
                    <button
                      className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg cursor-pointer"
                      onClick={() => setModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-4 py-2 bg-red-500 hover:bg-red-700 text-white rounded-lg cursor-pointer"
                      onClick={handleConfirmDelete}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 right-4">
            {admin && <NewQuestionnaireButton buttonRef={buttonRef} prodQuestionnaires={prodQuestionnaires} />}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
