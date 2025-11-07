import React, { FC, RefObject } from "react";
import { FieldProps } from "formik";
import { QuestionnaireField } from "../../DTOs/questionnaireField";
import { renderFieldLabel } from "../../(routes)/[...questionnaireName]/helper";

interface TextFieldProps extends FieldProps {
  fieldData: QuestionnaireField;
  tableLabel?: string;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  setFieldValue?: (field: string, value: any, shouldValidate?: boolean) => void;
}

const TextField: FC<TextFieldProps> = ({
  field,
  fieldData,
  tableLabel,
  onBlur,
  inputRef,
  setFieldValue,
  form
}) => {
  const fieldName = tableLabel ? `${fieldData.id}-${tableLabel}` : fieldData.id;

  return (
    <div key={fieldData.id} className="mb-4">
      <label htmlFor={fieldName} className="block font-medium">
        {renderFieldLabel(
          fieldData.label,
          fieldData.isRequired,
          fieldData.id,
          form.values,setFieldValue,
          fieldData.tooltip
        )}
      </label>

      <input
        {...field}
        id={fieldName}
        name={fieldName}
        ref={inputRef}
        type={"text"}
        required={fieldData.isRequired}
        className="custom-input"
        onBlur={onBlur}
      />
    </div>
  );
};

export default TextField;