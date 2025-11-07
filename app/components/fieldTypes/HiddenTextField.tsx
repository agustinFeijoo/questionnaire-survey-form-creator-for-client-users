import React, { FC, useState } from "react";
import { FieldProps } from "formik";


import { FaEye, FaEyeSlash } from "react-icons/fa";
import { QuestionnaireField } from "@/app/DTOs/questionnaireField";
import { renderFieldLabel } from "@/app/(routes)/[...questionnaireName]/helper";

interface TextFieldProps extends FieldProps {
  fieldData: QuestionnaireField;
  tableLabel?: string;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  setFieldValue?: (field: string, value: any, shouldValidate?: boolean) => void;
}

const TextField: FC<TextFieldProps> = ({
  field,
  fieldData,
  tableLabel,
  onBlur,
  setFieldValue,
  form
}) => {
  const fieldName = tableLabel ? `${fieldData.id}-${tableLabel}` : fieldData.id;
  const [showPassword, setShowPassword] = useState(false);
console.log("form.values",form.values)
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

      <div className="mt-2 relative">
        <input
          {...field}
          id={fieldName}
          name={fieldName}
          type={!showPassword ? "password" : "text"}
          required={fieldData.isRequired}
          placeholder={fieldData.placeholder}
          className="custom-input pr-10"
          autoComplete="new-password" // ✅ Prevent Chrome "Save Password"
          onBlur={onBlur}
        />

        
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
          >
            {showPassword ? <FaEye className="cursor-pointer" /> : <FaEyeSlash className="cursor-pointer" />}
          </button>
      </div>
    </div>
  );
};

export default TextField;
