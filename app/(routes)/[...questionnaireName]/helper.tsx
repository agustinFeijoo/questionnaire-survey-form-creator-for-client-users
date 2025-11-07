"server-only"
import Select from 'react-select';
import { doc, DocumentData, DocumentReference, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/app/firebase';
import { Tooltip } from 'react-tooltip';
import { fetchFieldLabels, fetchFieldLabelsNestedToo, Field, LogicEquation,  QuestionnaireField } from '@/app/DTOs/questionnaireField';

import { FormikHelpers } from 'formik';
import { toast } from 'react-toastify';
import { filterFieldsFromConditionalPages, generatePDF, sendPDFToServer } from '@/app/utils/PDFUtils';
import { Dispatch, SetStateAction, useCallback } from 'react';
import { extractFieldIdsFromQuestionnaire, Questionnaire } from '@/app/DTOs/questionnaire';
import { fetchQuestionnaireResponseWithReference, QuestionnaireResponse } from '@/app/DTOs/questionnaireResponse';
import { FormValues } from '@/app/DTOs/generalInterfaces';
import QuestionComponent from '@/app/components/QuestionComponent';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { isLikelyHTML, stripOuterPTag } from '@/app/components/helper';



export const checkQuestionnaireInstanceIdBelongsToActiveUser = async (questionnaireInstanceId: string) => {
  const response = await fetch(
    `https://us-central1-onlinetaxman-c6d0f.cloudfunctions.net/user/questionnaireInstanceIdBelongsToActiveUser?questionnaireInstanceId=${questionnaireInstanceId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.XAPIKEY || "",
      },
    }
  );
  return response.json();
};

export const submitResponse = async (
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>,
  values: FormValues,
  wiId: string ,
  questionnaireName: string,
  clientIdCRM: string,
  questionnaire: Questionnaire,
  fileUploadingList: { fieldId: string; fileName: string; promise: Promise<void> }[],
  actions: FormikHelpers<FormValues>,
  setCurrentPageIndex: React.Dispatch<React.SetStateAction<number | null>>,
  router: AppRouterInstance
) => {

  if (auth.currentUser?.email ) {
    try {
      // Fetch existing questionnaire responses and reference
      const [questionnaireResponseRecord, questionnaireResponseRecordRef] =
        await fetchQuestionnaireResponseWithReference(auth.currentUser.email);

      // Get existing responses for the WIID (default to empty array)
      const existingResponses = questionnaireResponseRecord[wiId]?.responses || [];

      // Create new response from the form values
      const newResponse = createResponse(values);

      // Extract field IDs for fetchFieldLabels
      const fieldIds = extractFieldIdsFromQuestionnaire(questionnaire);
      let remainingFieldIds = await filterFieldsFromConditionalPages(questionnaire, fieldIds, values);
      let PDFTitle;
      existingResponses.length === 0 ? (PDFTitle = `${newResponse.fields.questionnaireIdInPortal.replaceAll(
        "-",
        " "
      )}-${wiId}-${newResponse.fields.what_tax_year_are_you_reporting_for_}#${clientIdCRM}`) :
        PDFTitle = `${newResponse.fields.questionnaireIdInPortal.replaceAll(
          "-",
          " "
        )}-${wiId}-${newResponse.fields.what_tax_year_are_you_reporting_for_}#${clientIdCRM} Response ${existingResponses.length + 1}`;

      // Fetch field labels
      const allFieldLabels = await fetchFieldLabelsNestedToo(remainingFieldIds);

      if (
        !validateRequiredFields(
          questionnaire.pages,
          values,
          allFieldLabels,
          actions,
          setCurrentPageIndex,
          setIsSubmitting
        )
      ) {
        setIsSubmitting(false);
        return;
      }


      // Perform actions: Save response, generate PDF, and move files
      let infoMessage = `We are uploading a PDF with your questionnaire responses to your Box folder.\n`;
      let fileMessage = onLoadingFileMessage(fileUploadingList, infoMessage); // Display message later if no files are loading
      let successMessage = "";

      fileUploadingList.forEach((file) => {
        newResponse.fields[file.fieldId] = file.fileName;
      });

      // **Call the new saveProgressWithResponse function**
      await saveProgressWithResponse(newResponse, wiId);
      const saveAndPDFPromises = Promise.all([
        saveQuestionnaireResponse(wiId, existingResponses, newResponse, questionnaireResponseRecordRef),
        generatePDF(allFieldLabels, newResponse, remainingFieldIds).then((pdfBlob) => {
          if (pdfBlob) {
            return sendPDFToServer(pdfBlob, PDFTitle);
          } else {
            toast.error("There is an error creating the PDF, please contact us.");
            throw new Error("PDF generation failed");
          }
        }),
      ]);

      await Promise.all(fileUploadingList.map(async (file) => await file.promise));

      successMessage = await moveFilesFromBucketToBox(
        newResponse,
        allFieldLabels,
        questionnaireName,
        wiId,
        clientIdCRM,
        fileMessage,
        infoMessage
      );

      await saveAndPDFPromises;

      toast.success(
        "A PDF with your responses has been uploaded to your box folder.\n" +
        successMessage +
        " We will start working on it anytime soon!"
      );
      router.push("/");
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("An error occurred during submission.");
      setIsSubmitting(false);
    }
  }
};


export const saveProgressWithResponse = async (
  newResponse: QuestionnaireResponse,
  wiId: string,
) => {
  if (!auth.currentUser?.email || !wiId) {
    toast.error(
      "There is an error saving your questionnaire in progress, please refresh the page. If this error continues, please contact us."
    );
    return;
  }

  try {
    const email = auth.currentUser.email;
    const inProgressDocRef = doc(db, "inProgressQuestionnaire", email);
    const inProgressDoc = await getDoc(inProgressDocRef);

    let updateData = {};

    if (inProgressDoc.exists()) {
      updateData = inProgressDoc.data() || {};
    }

    updateData = {
      ...updateData,
      [wiId]: newResponse.fields,
    };

    await setDoc(inProgressDocRef, updateData, { merge: true });

  } catch (error) {
    console.error("Error saving progress:", error);
    toast.error("An error occurred while saving progress.");
  }
};

export const fetchField = async (fieldId: string): Promise<QuestionnaireField | undefined> => {
  try {
    const fieldDocRef = doc(db, 'questionnaireField', fieldId);
    const fieldSnapshot = await getDoc(fieldDocRef);
    if (fieldSnapshot.exists()) {
      return fieldSnapshot.data() as QuestionnaireField;
    } else {
      console.error(`Field with ID ${fieldId} not found`);
      return undefined;
    }
  } catch (error) {
    console.error("Error fetching field data:", error);
    return undefined;
  }
};


export const fetchColumns = async (
  columns: string[]
): Promise<Record<string, QuestionnaireField>> => {
  const fetchedColumnsArray = await Promise.all(
    columns.map(async (columnId: string) => {
      const columnData = await fetchField(columnId);
      if (columnData) {
        return { ...columnData, id: columnId };
      }
      return undefined;
    })
  );
  

  // Filter out undefined entries
  const fetchedColumns = fetchedColumnsArray.filter(
    (column): column is QuestionnaireField => column !== undefined
  );

  return fetchedColumns.reduce(
    (
      acc: Record<string, QuestionnaireField>,
      column
    ) => {
      acc[column.id] = column;
      return acc;
    },
    {}
  );
};

export const fetchColumnsAsArray = async (
  columns: string[]
): Promise<QuestionnaireField[]> => {
  const fetchedColumnsArray = await Promise.all(
    columns.map(async (columnId: string) => {
      const columnData = await fetchField(columnId);
      if (columnData) {
        return { ...columnData, id: columnId };
      }
      return undefined;
    })
  );

  // Remove any undefined values and assert correct type
  return fetchedColumnsArray.filter(
    (column): column is QuestionnaireField => column !== undefined
  );
};



export const evaluateConditionalLogic = (logicEquations: LogicEquation[], values: Record<string, any>, iteration?: number, repetitiveId?: string): boolean => { // values and iteration are used in the eval() do not delete
  if (!logicEquations || logicEquations.length === 0) {
    return true;
  }

  let logicString = logicEquations
    .map((equation) => {
      const { field, operator, value, connector } = equation;
      const escapedField = field.replace(/'/g, "\\'"); // this replaces the ' with \'
      let fieldValue;
      if (escapedField.includes("$$$"))// meaning that this is a repetitive field condition
        fieldValue = `values.${escapedField.split("$$$")[0]}?.iterations[${iteration}]?.${escapedField}`; //Repetitive looks like {`${field.id}.iterations[${iterationIndex}]`} so it includes the iteration
      else
        fieldValue = `values["${escapedField}"]`;
      let condition;
      switch (operator) {
        case 'includes':
          condition = `${fieldValue}?.includes("${value}")`;
          break;
        case 'not includes':
          condition = `!${fieldValue}?.includes("${value}")`;
          break;
        default:
          condition = `${fieldValue} ${operator} "${value}"`;
      }



      if (connector) {
        condition = ` ${connector} ${condition}`;
      }

      return condition;
    })
    .join(' ');

  logicString = logicString.trim();



  let response = eval(logicString.slice(2, logicString.length));
  return response;
};

export function removeStrikeTagsOnly(html: string): string {
  return html.replace(/<\/?s[^>]*>/g, '');
}

export const renderFieldLabel = (
  label: string,
  isRequired: boolean = false,
  id: string,
  values:any,
  setFieldValue: any = null,
  tooltip: string = '',
  spanClasses = '',
  containerClasses = '',

) => {
    let htmlToBeRendered;
    if(isLikelyHTML(label)){
      htmlToBeRendered=removeStrikeTagsOnly(label);
      htmlToBeRendered=stripOuterPTag(htmlToBeRendered);
    }else{
      htmlToBeRendered=label;
    }
    htmlToBeRendered=htmlToBeRendered.replaceAll("${taxYear}",values?.what_tax_year_are_you_reporting_for_||"the tax year")
  return (
    <div className="flex items-center justify-between w-full self-start ">
      <div className={`flex items-center ${containerClasses}`}>

        {isRequired ? (
          <label
            className={`w-full ${spanClasses} font-medium`}
            htmlFor={`${id}`}
            dangerouslySetInnerHTML={{
              __html: `${htmlToBeRendered} <span class="text-red-500 ml-1">*</span>`,
            }}
          />
        ) : (
          <label
            className={`w-full ${spanClasses} font-medium`}
            dangerouslySetInnerHTML={{ __html: `${htmlToBeRendered}` }}
            htmlFor={`${id}`}
          />
        )}

      </div>

      <div className="flex items-center gap-2">
        {tooltip && (
          <span
            className="inline-flex items-center justify-center w-6 h-6 bg-gray-300 rounded-full text-sm font-semibold text-gray-700 cursor-pointer transition duration-500 hover:text-white hover:bg-custom-blue"
            data-tooltip-id={`${id}-tooltip`}
          >
            i
            <Tooltip
              id={`${id}-tooltip`}
              place="top"
              style={{
                zIndex: 10,
                maxWidth: '300px',
                background: '#0d7ec9',
                fontSize: '1.2em',
                whiteSpace: 'normal',
              }}
              clickable={true}
            >{tooltip}</Tooltip>
          </span>
        )}
        <QuestionComponent label={label} id={id} setFieldValue={setFieldValue} />
      </div>
    </div>
  );
};




export const renderFieldLabelForRepetitive = (label: string, isRequired: boolean = false, id: string, setFieldValue: any,taxYear:any, tooltip: string = '') => {

  let htmlToBeRendered=removeStrikeTagsOnly(label);
  htmlToBeRendered=htmlToBeRendered.replaceAll("${taxYear}",taxYear||"the tax year");
  return(
  <div className="text-center mb-6 flex items-center gap-2">
    <h2 className="text-2xl font-semibold  w-full" dangerouslySetInnerHTML={{ __html: `${htmlToBeRendered}` }}>
    </h2>
    {tooltip && (
      <span
      className="relative inline-flex items-center justify-center w-6 h-6 bg-gray-300 rounded-full text-sm font-semibold text-gray-700 cursor-pointer transition duration-500 hover:text-white hover:bg-custom-blue"
      data-tooltip-id={`${id}-tooltip`}
      >
        i
        <Tooltip
          id={`${id}-tooltip`}
          place="top"
          style={{
            zIndex: 10,
            maxWidth: '300px',
            background: '#0d7ec9',
            fontSize: '1.2em',
            whiteSpace: 'normal',
          }}
          clickable={true}
        >{tooltip}</Tooltip>
      </span>
    )}
    <QuestionComponent id={id} label={label} setFieldValue={setFieldValue}></QuestionComponent>
  </div>)
  }


// Helper function to get nested value by path
export const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((o, key) => {
    if (!o) return undefined;

    // Match array notation, e.g., "iterations[0]"
    const arrayMatch = key.match(/^([^\[]+)\[(\d+)\]$/);
    if (arrayMatch) {
      const arrayKey = arrayMatch[1]; // part before [0]
      const index = parseInt(arrayMatch[2], 10); // index inside [ ]
      return o[arrayKey] && Array.isArray(o[arrayKey]) ? o[arrayKey][index] : undefined;
    }

    // Regular object key
    return o[key];
  }, obj);
};



export const saveQuestionnaireResponse = async (
  WIID: string,
  existingResponses: QuestionnaireResponse[], // Existing responses
  newResponse: QuestionnaireResponse, // Processed new response
  responseRef: DocumentReference<DocumentData, DocumentData> // Firestore reference
): Promise<string> => {
  try {
    // Combine the new response with existing responses
    const updatedResponses = [
      ...existingResponses,
      newResponse
    ];

    // Save the updated responses back to Firestore
    await setDoc(
      responseRef,
      {
        [WIID]: {
          responses: updatedResponses,
        },
      },
      { merge: true } // Merge with existing document data, important to not delete userId property
    );

    return "success";
  } catch (error) {
    console.error("Error saving questionnaire response:", error);
    return "error";
  }
};

export const createResponse = (values: any): QuestionnaireResponse => {
  // Function to recursively process fields for currency prefixes
  const processFields = (obj: Record<string, any>) => {
    for (const key in obj) {
      if (key.endsWith("currencySelect")) {
        const currencySelectorId = key;
        const currencyFieldId = key.replace("currencySelect", "");

        // Check if the corresponding currency field exists
        if (obj[currencyFieldId] !== undefined) {
          obj[currencyFieldId] = `${obj[currencySelectorId]} $${obj[currencyFieldId]}`;
        }

        // Remove the currency selector field
        delete obj[currencySelectorId];
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        // Recursively process nested objects
        processFields(obj[key]);
      }
    }
  };

  // Deep clone the response to avoid mutating the original input
  const clonedResponse = JSON.parse(JSON.stringify(values));

  // Process the cloned response for transformations
  processFields(clonedResponse);

  // Prepare the final response object
  const finalResponse: QuestionnaireResponse = {
    dateSubmitted: new Date().toISOString(),
    fields: clonedResponse,
  };

  return finalResponse;
};



export const createNewInProgressQuestionnaire = async (
  questionnaireId: string,
  email: string
): Promise<number | undefined> => {
  try {
    const onlineTaxmanRef = doc(db, 'inProgressQuestionnaire', email);
    const onlineTaxmanDoc = await getDoc(onlineTaxmanRef);
    const responsesRef = doc(db, 'questionnaireResponse', email);
    const responsesDoc = await getDoc(responsesRef);


    let highestWIID = 0;

    if (onlineTaxmanDoc.exists()) {
      const inProgressQuestionnaires = onlineTaxmanDoc.data();

      // Iterate through the WI records to find the matching questionnaireIdInPortal and determine the highest WIID
      for (const [key, value] of Object.entries(inProgressQuestionnaires)) {
        if (!isNaN(Number(key))) {
          if (Number(key) < 1000) {
            highestWIID = Math.max(highestWIID, Number(key));
          }
        }
      }
    }
    if (responsesDoc.exists()) {
      const responses = responsesDoc.data();

      // Iterate through the WI records to find the matching questionnaireIdInPortal and determine the highest WIID
      for (const [key, value] of Object.entries(responses)) {
        if (!isNaN(Number(key))) {
          if (Number(key) < 1000) {
            highestWIID = Math.max(highestWIID, Number(key));
          }
        }
      }
    }

    // If the document doesn't exist, we can still create a new one
    const WIID = (highestWIID + 1).toString(); // Increment the highest WIID by 1
    const newWI = {
      questionnaireIdInPortal: questionnaireId,
      what_tax_year_are_you_reporting_for_: new Date().getFullYear(), // Assume current year as taxYear
    };

    // Update or create the document in Firestore
    await setDoc(onlineTaxmanRef, {
      [WIID]: newWI,
    }, { merge: true }); // Merge true to add the new WIID without overwriting existing data

    return highestWIID + 1;

  } catch (error) {
    console.error('Error creating new in-progress questionnaire:', error); // FIX:helper.tsx:370 Error creating new in-progress questionnaire: FirebaseError: Failed to get document because the client is offline.
    return undefined; // Return undefined or handle the case as needed
  }
};


export const moveNextPage = async (
  document: Document,
  setCurrentPageIndex: React.Dispatch<React.SetStateAction<number | null>>,
  questionnaireInstanceId: string | null,
  pages: Record<string, string[]>
) => {
  setCurrentPageIndex((prevIndex) => {
    const nextIndex = prevIndex === null ? 1 : prevIndex + 1;
    if (auth.currentUser?.email && questionnaireInstanceId) {
      const email = auth.currentUser.email;
      const inProgressDocRef = doc(db, "inProgressQuestionnaire", email);
      setDoc(
        inProgressDocRef,
        {
          [questionnaireInstanceId]: {
            pages,
            currentPageIndex: nextIndex,
          },
        },
        { merge: true }
      );
    }
    return nextIndex;
  });

  document?.getElementById("target-section")?.scrollIntoView({ behavior: "smooth" });
};


export const handleSectionClick = (
  pageIndex: number,
  setCurrentPageIndex: React.Dispatch<React.SetStateAction<number | null>>,
  questionnaireInstanceId: string | null,
  pages: Record<string, string[]>
) => {
  setCurrentPageIndex(pageIndex);

  if (auth.currentUser?.email && questionnaireInstanceId) {
    const email = auth.currentUser.email;
    const inProgressDocRef = doc(db, "inProgressQuestionnaire", email);
    setDoc(
      inProgressDocRef,
      {
        [questionnaireInstanceId]: {
          pages,
          currentPageIndex: pageIndex,
        },
      },
      { merge: true }
    );
  }

  document?.getElementById("target-section")?.scrollIntoView({ behavior: "smooth" });
};


export const movePreviousPage = (
  setCurrentPageIndex: React.Dispatch<React.SetStateAction<number | null>>,
  questionnaireInstanceId: string | null,
  pages: Record<string, string[]>
) => {
  setCurrentPageIndex((prevIndex) => {
    const newIndex = prevIndex ? prevIndex - 1 : 0;
    if (auth.currentUser?.email && questionnaireInstanceId) {
      const email = auth.currentUser.email;
      const inProgressDocRef = doc(db, "inProgressQuestionnaire", email);
      setDoc(
        inProgressDocRef,
        {
          [questionnaireInstanceId]: {
            pages,
            currentPageIndex: newIndex,
          },
        },
        { merge: true }
      );
    }
    return newIndex;
  });

  document?.getElementById("target-section")?.scrollIntoView({ behavior: "smooth" });
};



export const moveFilesFromBucketToBox = async (
  newResponse: QuestionnaireResponse,
  allFieldLabels: Record<string, Field>,
  questionnaireTitle: string,
  wiId: string,
  clientId: string = "",
  fileMessage: string,
  infoMessage: string
): Promise<string> => {
  const uploadedFiles: string[] = [];
  const failedFiles: string[] = [];
  let filesToMoveMessage = "";
  let fileFieldTypesInQuestionnaire: string[] = [];

  try {
    const questionnaireTitleWithoutDashes = questionnaireTitle.replaceAll("-", " ");

    // Iterate over fields in values.fields (QuestionnaireResponse structure)
    for (const fieldId of Object.keys(newResponse.fields)) {
      const fieldLabel = allFieldLabels[fieldId];

      if (fieldLabel?.type === "file" && newResponse.fields[fieldId] !== "") {
        let labelWithoutLineBreaks = fieldLabel.label.split("<br/>")[0];
        fileFieldTypesInQuestionnaire.push(labelWithoutLineBreaks);
        const fileName = newResponse.fields[fieldId];
        const fileNameInBox = `${questionnaireTitleWithoutDashes}-${wiId}-${newResponse.fields.what_tax_year_are_you_reporting_for_}#${clientId} ${fieldId.replaceAll(
          "-",
          ""
        )}.${fileName.split(".").pop()}`;

        try {
          await fetch(
            "https://us-central1-onlinetaxman-c6d0f.cloudfunctions.net/user/fromBucketToBox",
            {
              method: "POST",
              headers: {
                "x-api-key": process.env.XAPIKEY || "",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: auth.currentUser?.email,
                fileNameInBucket: fileName,
                fileNameInBox: fileNameInBox,
              }),
            }
          ).then((response) => {
            if (!response.ok) {
              failedFiles.push(fileName);
              console.error("Failed to send file:", response.statusText);
            } else {
              uploadedFiles.push(fileName);
              /*toast.success(
                `File "${fileName}" successfully uploaded to your Box folder!`,
                { autoClose: 5000 }
              );*/
            }
          });
        } catch (error) {
          failedFiles.push(fileName);
          console.error(`Error uploading file "${fileName}":`, error);
        }
      }
    }

    let theFile =
      fileFieldTypesInQuestionnaire.length === 1 ? `The file ` : `The files `;
    let isOrAre =
      fileFieldTypesInQuestionnaire.length === 1 ? `is ` : `are `;

    if (!fileMessage) {
      toast.info(
        infoMessage +
        theFile +
        formatFileList(fileFieldTypesInQuestionnaire) +
        ` ${isOrAre} being moved to your Box folder.`
      );
    } else {
      filesToMoveMessage =
        theFile +
        formatFileList(fileFieldTypesInQuestionnaire) +
        ` ${isOrAre} being moved to your Box folder.\n`;
    }

    // Notify user about the final status
    if (failedFiles.length > 0) {
      toast.error(
        `The following files failed to upload: ${formatFileList(
          failedFiles
        )}. Please upload them manually or contact support.`,
        { autoClose: 10000 }
      );
    }
  } catch (error) {
    console.error("Error sending files to server:", error);
    toast.error("An error occurred while uploading files. Please try again.");
  } finally {
    return filesToMoveMessage;
  }
};






export function validateRequiredFields(
  pages: Record<string, string[]>,               // Contains page keys and arrays of field IDs
  values: FormValues,                            // Contains form values
  allFieldLabels: Record<string, Field>,     // Contains metadata for fields
  actions: FormikHelpers<FormValues>,            // Formik helpers to set field errors
  setCurrentPageIndex: Dispatch<SetStateAction<number | null>>,
  setIsSubmitting: Dispatch<SetStateAction<boolean>>
): boolean {
  let foundEmptyRequiredField = false;

  // Create a sorted array of page keys
  const sortedPageKeys = Object.keys(pages).sort((a, b) => {
    const numA = parseInt(a.match(/^\d+/)?.[0] || "0", 10);
    const numB = parseInt(b.match(/^\d+/)?.[0] || "0", 10);
    return numA - numB;
  });

  // Use sorted keys to ensure the correct order
  sortedPageKeys.some((pageKey, pageIndex) => {
    pages[pageKey].forEach((fieldId) => {
      const field = allFieldLabels[fieldId];  // Get field metadata from allFieldLabels
      const fieldValue = values[fieldId];         // Get field value from form values

      // Check if the field is required and empty
      if (
        field?.isRequired &&
        !fieldValue &&
        (!field.conditionalLogic ||
          evaluateConditionalLogic(field.conditionalLogic.logicEquations, values))
      ) {
        actions.setFieldError(fieldId, "This field is required!");
        console.log(fieldId, "This field is required!");
        console.log("fieldValue",fieldValue)
        foundEmptyRequiredField = true;

        // Set current page index to the first empty required field's page
        setCurrentPageIndex(pageIndex);
      }
    });

    return foundEmptyRequiredField; // Exit after processing the first problematic page
  });

  if (foundEmptyRequiredField) {
    toast.error("Please fill out all required fields before submitting.");
    actions.setSubmitting(false);
    setIsSubmitting(false);
    return false;
  } else {
    return true;
  }
}



function onLoadingFileMessage(fileUploadingList: {
  fileName: string;
  fieldId: string;
  promise: Promise<void>;
}[], currentToastMessage: string): string {
  let onLoadingFileMessage = "";

  if (fileUploadingList.length > 0) {
    const formattedFileList = formatFileList(fileUploadingList.map(fileUploading => fileUploading.fileName)); // Use the utility function
    const fileMessage =
      fileUploadingList.length === 1 ? "file " + formattedFileList + " is" : "files " + formattedFileList + " are";

    onLoadingFileMessage = `Please do not close this tab yet, the ${fileMessage} still uploading.\n`;

    // Display the toast message immediately
    toast.info(currentToastMessage + onLoadingFileMessage, { autoClose: 10000 });
  }

  return onLoadingFileMessage;
}


export function formatFileList(fileList: string[]): string {
  if (fileList.length === 0) return "";

  if (fileList.length === 1) {
    return fileList[0]; // Single file
  }

  const allButLast = fileList.slice(0, -1).join(", ");
  const lastFile = fileList[fileList.length - 1];
  return `${allButLast} and ${lastFile}`; // Multiple files
}



export const handleDownloadTemplate = async (fileName: string, contentType: string) => {
  if (!fileName) {
    toast.error("No file name specified for the template.");
    return;
  }

  try {
    // Get a signed URL for the template
    const response = await fetch(
      "https://us-central1-onlinetaxman-c6d0f.cloudfunctions.net/user/getSignedUrlForDownloadingTemplates",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.XAPIKEY || "",
        },
        body: JSON.stringify({
          fileName,
          contentType,

        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to retrieve signed URL.");
    }

    const { signedURL } = await response.json();
    if (!signedURL) {
      throw new Error("Signed URL not received from the server.");
    }

    // Fetch the file and trigger download

    const fileResponse = await fetch(
      signedURL,
      {
        method: "GET",
        headers: {
          "Content-Type": contentType,
        },
        mode: "cors"
      }
    );
    if (!fileResponse.ok) {
      throw new Error("Failed to fetch the file from the signed URL.");
    }

    const fileBlob = await fileResponse.blob();
    const downloadUrl = window.URL.createObjectURL(fileBlob);

    // Create a temporary link to trigger the download
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", fileName); // Set the file name
    document.body.appendChild(link);
    link.click();

    // Clean up the temporary link
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

  } catch (error) {
    console.error("Error downloading template:", error);
    toast.error(
      "An error occurred while downloading the template. Please try again."
    );
  }
};


export const filterConditionalPages = async (pagesConditionalLogic: Record<string, any> | undefined | null, values: FormValues, setFilteredPages: React.Dispatch<React.SetStateAction<Set<string>>>) => {
  if (pagesConditionalLogic) {
    Object.entries(pagesConditionalLogic).forEach(
      ([pageKey, pageConditionsArray]) => {
        setFilteredPages((prev) => {
          const updated = new Set(prev);
          if (evaluateConditionalLogic(pageConditionsArray, values)) {
            updated.delete(pageKey);
          } else {
            updated.add(pageKey);

          }
          return updated;
        });
      }
    );
  }
}


export const fetchData = async (fieldId: string): Promise<QuestionnaireField> => {
  const data = await fetchField(fieldId);

  if (!data) {
    throw new Error(`Field data for ID ${fieldId} could not be found`);
  }

  return data;
};


export const saveProgress = async (
  values: FormValues,
  questionnaireInstanceId: string | null,
): Promise<void> => {
  if (!auth.currentUser?.email || !questionnaireInstanceId) {
    toast.error(
      "There was an error saving your questionnaire progress. Please refresh the page. If this continues, contact support."
    );
    return;
  }

  try {
    const email = auth.currentUser.email;
    const inProgressDocRef = doc(db, "inProgressQuestionnaire", email);
    const inProgressDoc = await getDoc(inProgressDocRef);

    let updateData: Record<string, any> = {};
    let existingEntry: Record<string, any> = {};

    if (inProgressDoc.exists()) {
      updateData = inProgressDoc.data() || {};
      existingEntry = updateData[questionnaireInstanceId] || {};
    }

    updateData = {
      ...updateData,
      [questionnaireInstanceId]: {
        ...values,
        currentPageIndex: existingEntry.currentPageIndex ?? null,
      },
    };

    await setDoc(inProgressDocRef, updateData, { merge: true });
  } catch (error) {
    console.error("Error saving questionnaire progress:", error);
    toast.error("An unexpected error occurred while saving your progress.");
  }
};
