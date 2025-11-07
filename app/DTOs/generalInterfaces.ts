import { QuestionnaireField } from "./questionnaireField";





export interface FieldRendererForTableCellProps {
  column: QuestionnaireField;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  values: any;
  tableId: string;
  preview:string|null;
  questionnaireInstanceId:string;
}

export interface FormValues {
  [key: string]: string;
}
