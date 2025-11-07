import React, { FC, RefObject } from "react";
import { FieldProps } from "formik";

import { PatternFormat } from "react-number-format";
import { QuestionnaireField } from "@/app/DTOs/questionnaireField";

interface MaskedNumberFieldProps extends FieldProps {
  fieldData: QuestionnaireField;
  tableLabel?: string;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  setFieldValue?: (field: string, value: any, shouldValidate?: boolean) => void;
}

const MaskedNumberField: FC<MaskedNumberFieldProps> = ({
  field,
  fieldData,
  tableLabel,
  onBlur,
  setFieldValue,
}) => {
  const fieldName = tableLabel ? `${fieldData.id}-${tableLabel}` : fieldData.id;
  const maskPattern = fieldData.mask?.replaceAll("9", "#");

  return (
    
      <PatternFormat
        {...field}
        id={fieldName}
        name={fieldName}
        format={maskPattern || ""}
        allowEmptyFormatting={true}
        mask="#"
        required={fieldData.isRequired}
        className="custom-input !pr-3"
        style={
          fieldData.mask
            ? { width: `${fieldData.mask.length * 12}px` }
            : { width: "33.333%" }
        }
        onBlur={onBlur}
      />
    
  );
};

export default MaskedNumberField;
