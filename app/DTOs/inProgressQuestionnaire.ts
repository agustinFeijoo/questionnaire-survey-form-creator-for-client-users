/*import { doc, DocumentData, DocumentReference, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export interface InProgressQuestionnaire {
  dateSubmitted: string ;
  fields: Record<string, any>; // Flexible to account for nested structures
}

export interface inProgressQuestionnaireRecord {
  [WIs:string]: Record<string, QuestionnaireResponse[]>; // Maps WIID to responses
}


export const fetchQuestionnaireResponseWithReference = async (
  email: string
): Promise<[QuestionnaireResponseRecord, DocumentReference<DocumentData>]> => {
  try {
    // Get the reference to the questionnaire response document
    const questionnaireDocRef = doc(db, "questionnaireResponse", email);

    // Fetch the document data
    const questionnaireDoc = await getDoc(questionnaireDocRef);

    if (questionnaireDoc.exists()) {
      const data = questionnaireDoc.data() as QuestionnaireResponseRecord; // Directly cast to the expected type
      return [data, questionnaireDocRef]; // Return the data and document reference
    } else {
      throw new Error("Questionnaire response document does not exist.");
    }
  } catch (error) {
    console.error("Error fetching questionnaire response:", error);
    throw new Error("Failed to fetch your questionnaire response.");
  }
};





export const fetchQuestionnaireResponse = async (
  email: string
): Promise<QuestionnaireResponseRecord> => {
  try {
    // Get the reference to the questionnaire response document
    const questionnaireDocRef = doc(db, "questionnaireResponse", email);

    // Fetch the document data
    const questionnaireDoc = await getDoc(questionnaireDocRef);

    if (questionnaireDoc.exists()) {
      const data = questionnaireDoc.data() as QuestionnaireResponseRecord; // Directly cast to the expected type
      return data ; // Return the data and document reference
    } else {
      throw new Error("Questionnaire response document does not exist.");
    }
  } catch (error) {
    console.error("Error fetching questionnaire response:", error);
    throw new Error("Failed to fetch your questionnaire response.");
  }
};*/