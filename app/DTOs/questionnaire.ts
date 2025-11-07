import { collection, doc, DocumentData, DocumentSnapshot, getDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";

export interface Questionnaire{
    title:string;
    pages: Record<string,string[]>;
    currentPageIndex?:number;
    productionQuestionnaire?:boolean;
    pagesConditionalLogic?:Record<string, any>;
    
  }
  
  export async function fetchQuestionnaire(questionnaireName: string): Promise<Questionnaire | null> {
    try {
      const questionnaireDoc = doc(db, "questionnaire", questionnaireName);
      const snapshot: DocumentSnapshot<DocumentData> = await getDoc(questionnaireDoc);
  
      if (!snapshot.exists()) {
        return null;
      }
  
      const data = snapshot.data();
      
      return data as Questionnaire;
    } catch (error) {
      console.error("Error fetching questionnaire:", (error as Error).message);
      throw error;
    }
  }

  export const fetchQuestionnaires = async (): Promise<Questionnaire[]> => {
    try {
      const fieldDocs = await getDocs(collection(db, "questionnaire"));
      const prodQuestionnaires: Questionnaire[] = [];
  
      fieldDocs.forEach((doc) => {
        const questionnaire = doc.data() as Questionnaire;
        if (questionnaire.productionQuestionnaire) {
          prodQuestionnaires.push({
            ...questionnaire,
            title: doc.id.replaceAll("-", " "),
          });
        }
      });
  
      return prodQuestionnaires;
    } catch (error) {
      console.error("Error fetching questionnaires:", error);
      toast.error("Failed to fetch questionnaires.");
      return []; // Return an empty array in case of an error
    }
  };
  
  export const extractFieldIdsFromQuestionnaire = (questionnaire: Questionnaire): string[] => {
    // Sort the pages by their keys to maintain a consistent order
    //const sortedPages = Object.entries(questionnaire.pages).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
    const sortedPages = Object.entries(questionnaire.pages).sort(([keyA], [keyB]) => {
      // Extract leading numbers
      const numA = parseInt(keyA.match(/^\d+/)?.[0] || "0", 10);
      const numB = parseInt(keyB.match(/^\d+/)?.[0] || "0", 10);
  
      return numA - numB;
    });
  

    // Flatten the fields from the sorted pages
    return sortedPages.flatMap(([_, page]) => (Array.isArray(page) ? page : []));
  };
  