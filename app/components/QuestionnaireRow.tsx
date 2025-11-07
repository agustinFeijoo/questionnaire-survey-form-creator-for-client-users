import Link from "next/link";
import {
  FaFilePdf,
  FaPencilAlt,
  FaTrash,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import ProgressBar from "./ProgressBar";
import SpinnerCircular from "./SpinnerCircular";
import {
  extractFieldIdsFromQuestionnaire,
  fetchQuestionnaire,
} from "../DTOs/questionnaire";
import { downloadPDF, filterFieldsFromConditionalPages, generatePDF } from "../utils/PDFUtils";
import { auth } from "../firebase";
import { useEffect, useRef, useState } from "react";
import { QuestionnaireResponse } from "../DTOs/questionnaireResponse";
import { fetchFieldLabels, fetchFieldLabelsNestedToo, Field } from "../DTOs/questionnaireField";

export interface WI {
  responses?: Record<string, any>[]; // Array of responses
  inProgressQuestionnaire: Record<string, any>; // Questionnaire details
  wiId: string; // Unique identifier for the WI
}

interface QuestionnaireRowProps {
  WI: WI;
  hasAnyResponse: boolean;
  downloadingPDFs: string[];
  toggleRowExpansion: (wiId: string) => void;
  expandedRows: Record<string, boolean>;
  handleDeleteClick: (title: string, wiId: string) => void;
  setDownloadingPDFs: React.Dispatch<React.SetStateAction<string[]>>;
}

export const QuestionnaireRow = ({
  WI,
  hasAnyResponse,
  downloadingPDFs,
  toggleRowExpansion,
  expandedRows,
  handleDeleteClick,
  setDownloadingPDFs,
}: QuestionnaireRowProps) => {
  const title = WI.inProgressQuestionnaire?.questionnaireIdInPortal?.replaceAll("-", " ") || "Untitled";
  const taxYear = WI.inProgressQuestionnaire?.what_tax_year_are_you_reporting_for_ || "";
  const [allFieldLabels, setAllFieldLabels] = useState<Record<string, Field>>();
  const [fieldIds, setFieldIds] = useState<string[]>([]);
  const rowRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const questionnaire = await fetchQuestionnaire(WI.inProgressQuestionnaire?.questionnaireIdInPortal);
        if (questionnaire) {
          const fieldIdsLocal = extractFieldIdsFromQuestionnaire(questionnaire);
          let fieldIdsLocalRemaining;
          fieldIdsLocalRemaining=await filterFieldsFromConditionalPages(questionnaire,fieldIdsLocal, WI.inProgressQuestionnaire);
            
          const labels = await fetchFieldLabelsNestedToo(fieldIdsLocalRemaining);
          setFieldIds(fieldIdsLocalRemaining)
          setAllFieldLabels(labels);
        }
      } catch (error) {
        console.error("Error fetching field labels:", error);
      }
    };
    fetchLabels();
  }, [WI.inProgressQuestionnaire?.questionnaireIdInPortal]);

  // Handle outside click to collapse row
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (expandedRows[WI.wiId] && rowRef.current && !rowRef.current.contains(event.target as Node)) {
        toggleRowExpansion(WI.wiId); // Collapse the row if clicked outside
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [expandedRows, WI.wiId, toggleRowExpansion]);

  return (
    <li
      ref={rowRef}
      className={`grid ${hasAnyResponse ? "grid-cols-4 gap-4" : "grid-cols-3 gap-3"} items-center text-center`}
    >
      {/* Title */}
      <div className="flex justify-center items-center">
        {WI.responses?.length ? (
          `${title} ${taxYear ? `(${taxYear})` : ""}`
        ) : (
          <Link
            href={`/${WI.inProgressQuestionnaire.questionnaireIdInPortal}?questionnaireInstanceId=${WI.wiId}`}
            className="text-custom-blue-80 hover:text-custom-blue"
          >
            {title} {taxYear ? `(${taxYear})` : ""}
          </Link>
        )}
      </div>

      {/* Progress */}
      {!WI.responses?.length ? (
        <div className="flex justify-center items-center">
          <ProgressBar
            inProgressWI={{
              ...WI.inProgressQuestionnaire,
              wiId: WI.wiId,
            }}
          />
        </div>
      ) : (
        <div className="text-green-500 flex justify-center items-center">Completed</div>
      )}

      {/* Response Actions */}
      {hasAnyResponse && (
        <div className="flex justify-center items-center">
          {downloadingPDFs.find((WIID) => WIID === WI.wiId) ? (
            <div ><SpinnerCircular/></div>
          ) : (
            <>
              {WI.responses && WI.responses.length > 1 ? (
                <div className="relative">
                  <div className="flex">
                    {/* Download Latest Button */}
                    <button
                      onClick={() => {
                        const downloadPDFOnClick = async () => {
                          if (auth.currentUser?.email && WI.responses && allFieldLabels) {
                            setDownloadingPDFs((prev) => [...prev, WI.wiId]);
                            const lastResponse = WI.responses[WI.responses.length - 1] as QuestionnaireResponse;
                            
                            const pdfBlob = await generatePDF(allFieldLabels, lastResponse,fieldIds);
                            if (pdfBlob)
                              downloadPDF(pdfBlob, `${title}`); // response ${WI.responses.length} (latest)
                            setDownloadingPDFs((prev) => prev.filter((value) => value !== WI.wiId));
                            toggleRowExpansion(WI.wiId); // Collapse row after download
                          }
                        };
                        downloadPDFOnClick();
                      }}
                      className="text-red-500 hover:text-red-700 pl-4 ml-4"
                    >
                      <FaFilePdf className="sm:mr-1 cursor-pointer" size={20} />
                    </button>
                    {/* Toggle Expansion Button */}
                    <button
                      onClick={() => toggleRowExpansion(WI.wiId)}
                      className="text-gray-700 hover:text-gray-900 cursor-pointer"
                    >
                      {expandedRows[WI.wiId] ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                  </div>
                  {/* Expanded Responses */}
                  {expandedRows[WI.wiId] && (
                    <div className="absolute bg-white border rounded shadow-lg p-2 mt-2 w-40 z-50">
                      {WI.responses.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            const downloadPDFOnClick = async () => {
                              if (auth.currentUser?.email && WI.responses && allFieldLabels) {
                                setDownloadingPDFs((prev) => [...prev, WI.wiId]);
                                const lastResponse = WI.responses[WI.responses.length - 1 - i] as QuestionnaireResponse;
                                const pdfBlob = await generatePDF(allFieldLabels, lastResponse,fieldIds);
                                if (pdfBlob)
                                  downloadPDF(pdfBlob, `${title} response ${WI.responses.length - i}`);

                                setDownloadingPDFs((prev) => prev.filter((value) => value !== WI.wiId));
                                toggleRowExpansion(WI.wiId); // Collapse row after download
                              }
                            };
                            downloadPDFOnClick();
                          }}
                          className="flex items-center justify-between mt-3 text-red-500 hover:text-red-700 cursor-pointer w-full"
                        >
                          <span>Response {(WI.responses?.length || 1) - i}</span>
                          <FaFilePdf size={20} className="ml-2 cursor-pointer" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Single Response Download Button
                WI.responses?.length === 1 && (
                  <button
                    onClick={() => {
                      const downloadPDFOnClick = async () => {
                        if (auth.currentUser?.email && WI.responses && allFieldLabels) {
                          setDownloadingPDFs((prev) => [...prev, WI.wiId]);
                          const lastResponse = WI.responses[0] as QuestionnaireResponse;
                          const pdfBlob = await generatePDF(allFieldLabels, lastResponse,fieldIds);
                          if (pdfBlob)
                            downloadPDF(pdfBlob, `${title}`); //response ${WI.responses.length} (latest)

                          setDownloadingPDFs((prev) => prev.filter((value) => value !== WI.wiId));
                          toggleRowExpansion(WI.wiId); // Collapse row after download
                        }
                      };
                      downloadPDFOnClick();
                    }}
                    className="text-red-500 hover:text-red-700 ml-4 cursor-pointer"
                  >
                    <FaFilePdf size={20} />
                  </button>
                )
              )}
            </>
          )}
        </div>
      )}
      {/*hasAnyResponse && WI.responses?.length ? (
      <div></div>
        <div className="flex justify-center items-center">
          <Link
            href={`/${WI.inProgressQuestionnaire.questionnaireIdInPortal}?questionnaireInstanceId=${WI.wiId}`}
            className="text-custom-blue-80 hover:underline"
          >
            <FaPencilAlt
              size={20}
              className="text-custom-blue-80 hover:text-custom-blue transition-colors duration-200"
            />
          </Link>
        </div>
      ) : (
        !WI.responses?.length && hasAnyResponse && <div></div>
      )*/}

      <div
        className="flex justify-center items-center cursor-pointer"
        onClick={() => handleDeleteClick(title, WI.wiId)}
      >
        <FaTrash className="text-red-500 hover:text-red-700 transition-colors duration-200" />
      </div>
    </li>
  );
};
