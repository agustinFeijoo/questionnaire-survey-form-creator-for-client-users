import { doc, DocumentData, DocumentReference, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export interface QuestionnaireResponse {
  dateSubmitted: string ;
  fields: Record<string, any>; // Flexible to account for nested structures
}

export interface QuestionnaireResponseRecord {
  [WIs:string]: Record<string, QuestionnaireResponse[]>; // Maps WIID to responses
}


export const fetchQuestionnaireResponseWithReference = async (
  email: string
): Promise<[QuestionnaireResponseRecord, DocumentReference<DocumentData>]> => {
  try {
    const questionnaireDocRef = doc(db, "questionnaireResponse", email);
    const questionnaireDoc = await getDoc(questionnaireDocRef);

    if (questionnaireDoc.exists()) {
      const data = questionnaireDoc.data() as QuestionnaireResponseRecord;
      return [data, questionnaireDocRef];
    }

    // ✅ Document didn't exist → create an empty one
    const emptyRecord: QuestionnaireResponseRecord = {};

    await setDoc(questionnaireDocRef, emptyRecord);

    console.log(`Created new questionnaireResponse record for: ${email}`);
    return [emptyRecord, questionnaireDocRef];
  } catch (error) {
    console.error("Error fetching questionnaire response:", error);
    throw new Error("Failed to fetch or create your questionnaire response.");
  }
};




export const fetchQuestionnaireResponse = async (
  email: string
): Promise<QuestionnaireResponseRecord> => {
  try {
    const questionnaireDocRef = doc(db, "questionnaireResponse", email);
    const questionnaireDoc = await getDoc(questionnaireDocRef);

    if (questionnaireDoc.exists()) {
      return questionnaireDoc.data() as QuestionnaireResponseRecord;
    }

    // ✅ Create empty record if it didn't exist
    const emptyRecord: QuestionnaireResponseRecord = {};

    await setDoc(questionnaireDocRef, emptyRecord);
    console.log(`Created new questionnaireResponse record for: ${email}`);

    return emptyRecord;
  } catch (error) {
    console.error("Error fetching questionnaire response:", error);
    throw new Error("Failed to fetch or create your questionnaire response.");
  }
};
