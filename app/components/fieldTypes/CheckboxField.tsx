import React from "react";
import { FieldProps } from "formik";
import { ErrorMessage } from "formik";
import { getNestedValue, removeStrikeTagsOnly } from "../../(routes)/[...questionnaireName]/helper";
import { FormValues } from "../../DTOs/generalInterfaces";
import { Tooltip } from "react-tooltip";
import QuestionComponent from "../QuestionComponent";

interface CheckboxFieldProps extends FieldProps {
    fieldData: any;
    inputRef?: React.RefObject<HTMLInputElement>;
    saveChangesAndFilterConditionalFields: (values: FormValues) => void;
    values: FormValues;
    setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
}


const renderFieldLabelForCheckbox = (
  label: string,
  id: string,
  values:any,
  setFieldValue: any = null,
  tooltip: string = '',
) => {
    let htmlToBeRendered=removeStrikeTagsOnly(label);
    htmlToBeRendered=htmlToBeRendered.replaceAll("${taxYear}",values?.what_tax_year_are_you_reporting_for_||"the tax year")
  return (
    <div className="flex items-center justify-between w-full self-start ">
      <div className={`flex items-center`}>
          <label
            className={`w-full font-medium`}
            dangerouslySetInnerHTML={{ __html: `${htmlToBeRendered}` }}
            htmlFor={`${id}`}
          />
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


export const CheckboxField: React.FC<CheckboxFieldProps> = ({
    field,
    fieldData,
    inputRef,
    saveChangesAndFilterConditionalFields,
    values,
    setFieldValue
}) => {
    return (
        <div className="mb-4">
            <fieldset>
                <legend className="text-base font-medium w-full">
                    {renderFieldLabelForCheckbox(fieldData.label,fieldData.id,values,setFieldValue,fieldData.tooltip)}
                </legend>
                <div className="mt-3 space-y-4">
                    {fieldData.options?.map((option: any, index: number) => {
                        const checkboxId = `${fieldData.label}_${index}`;
                        const currentValues = getNestedValue(values, fieldData.id) || [];
                        const isChecked = currentValues.includes(option.value);

                        return (
                            <div key={checkboxId} className="flex items-center">
                                <input
                                    type="checkbox"
                                    value={option.value}
                                    id={checkboxId}
                                    name={field.name}
                                    ref={inputRef}
                                    required={fieldData.isRequired && (!values[fieldData.id] || values[fieldData.id].length === 0)}
                                    className="p-4 w-4 text-custom-blue border-gray-300 focus:ring-custom-blue cursor-pointer"
                                    checked={isChecked}
                                    onChange={() => {
                                        const updatedValues = isChecked
                                            ? currentValues.filter((v: string) => v !== option.value)
                                            : [...currentValues, option.value];
                                        setFieldValue(fieldData.id, updatedValues);
                                        saveChangesAndFilterConditionalFields({ ...values, [fieldData.id]: updatedValues });
                                    }}
                                />
                                <label htmlFor={checkboxId} className="ml-2 cursor-pointer">
                                    <span className={`ml-2 block ${isChecked ? "font-bold" : ""}`}>
                                        {option.value}
                                    </span>
                                </label>
                            </div>
                        );
                    })}
                </div>
            </fieldset>
            <ErrorMessage name={fieldData.id} component="div" className="text-red-600" />
        </div>
    );
};
