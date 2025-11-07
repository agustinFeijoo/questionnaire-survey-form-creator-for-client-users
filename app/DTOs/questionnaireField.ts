import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export interface QuestionnaireField {
  id: string;
  type: string;
  label: string;
  isRequired?: boolean;
  fileName?: string;
  contentType?:string;
  conditionalLogic?: ConditionalLogic;
  options?: Array<{ isSelected: boolean; value: string; isDefault: boolean }>;
  columns?: string[];
  fields?: string[];
  tooltip?: string;
  allowAddRows?: boolean;
  mask?: string;
  answerLater?:boolean;
  hideChars:boolean;
  isDollarFixed:boolean;
  placeholder:string;
  }



  export interface  PageClientQuestionnaire {
    title: string;
    fields: QuestionnaireField[];
  }
  export interface LogicEquation {
    field: string;
    operator: string;
    value: any;
    connector?: string;
  }
  export interface ConditionalLogic {
    logicEquations: LogicEquation[]; // Array of logic equations
  }
  //it's a more refined version of QuestionnaireField, useful for PDFs for example
  export interface Field {
    label: string;
    type: string;
    conditionalLogic?: ConditionalLogic; // Define a more specific type if known
    isRequired?: boolean;
    columns?:string[];
    fields?:string[];
  }
  


  export const fetchFieldLabels = async (fieldIds: string[]): Promise<Record<string, Field>> => {
    const labels: Record<string, Field> = {};
  
    // Function to fetch a single field's data and handle nested structures
    const fetchField = async (fieldId: string): Promise<void> => {
      try {
        const fieldDoc = await getDoc(doc(db, "questionnaireField", fieldId));
  
        if (fieldDoc.exists()) {
          const data = fieldDoc.data();
            // For generic fields
            const field: Field = {
              label: data.label,
              type: data.type,
              conditionalLogic: data.conditionalLogic || undefined, // Optional
            };
            labels[fieldId] = field;
          }
      } catch (error) {
        console.error(`Error fetching field data for fieldId ${fieldId}:`, error);
      }
    };
  
    // Fetch all requested fieldIds concurrently
    await Promise.all(fieldIds.map((fieldId) => fetchField(fieldId)));
  
    return labels;
  };


  

  export const fetchFieldLabelsNestedToo = async (
    fieldIds: string[]
  ): Promise<Record<string, Field>> => {
    const labels: Record<string, Field> = {};
  
    // Function to fetch a single field's data and handle nested structures
    const fetchField = async (fieldId: string): Promise<void> => {
      try {
        const fieldDoc = await getDoc(doc(db, "questionnaireField", fieldId));
  
        if (fieldDoc.exists()) {
          const data = fieldDoc.data();
  
          if (data.type === "table" || data.type==="address" && Array.isArray(data.columns)) {
            // If the field is a table, fetch its columns
            const tableField: Field = {
              label: data.label,
              type: data.type,
              columns: data.columns,
              conditionalLogic: data.conditionalLogic || undefined, // Optional
            };
            labels[fieldId] = tableField;
  
            // Fetch nested fields within the columns
            if(data.type==="table"){await Promise.all(
              data.columns.map((nestedFieldId: string) => fetchField(nestedFieldId))
            );}else{
              labels[data.columns[0]]={"type":"text","label":"Address"}
              labels[data.columns[1]]={"type":"text","label":"Address line 2"}
              labels[data.columns[2]]={"type":"text","label":"City"}
              labels[data.columns[3]]={"type":"text","label":"State"}
              labels[data.columns[4]]={"type":"text","label":"Country"}
              labels[data.columns[5]]={"type":"text","label":"ZIP Code"}
            }
            
          } else if (data.type === "repetitive" && Array.isArray(data.fields)) {
            // If the field is repetitive, fetch its nested fields
            const repetitiveField: Field = {
              label: data.label,
              type: "repetitive",
              fields: data.fields,
              conditionalLogic: data.conditionalLogic || undefined, // Optional
            };
            labels[fieldId] = repetitiveField;
  
            // Fetch nested fields within the fields property
            await Promise.all(
              data.fields.map((nestedFieldId: string) => fetchField(nestedFieldId))
            );
          } else {
            // For generic fields
            const field: Field = {
              label: data.label,
              type: data.type,
              conditionalLogic: data.conditionalLogic, // Optional
              isRequired:data.isRequired 
            };
            labels[fieldId] = field;
          }
        }
      } catch (error) {
        console.error(`Error fetching field data for fieldId ${fieldId}:`, error);
      }
    };
  
    // Fetch all requested fieldIds concurrently
    await Promise.all(fieldIds.map((fieldId) => fetchField(fieldId)));
  
    return labels;
  };
  