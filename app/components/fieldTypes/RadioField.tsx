import React from "react";
import { Field, FieldProps } from "formik";
import { ErrorMessage } from "formik";
import { getNestedValue, removeStrikeTagsOnly, renderFieldLabel } from "../../(routes)/[...questionnaireName]/helper";
import { FormValues } from "../../DTOs/generalInterfaces";
import { Tooltip } from "react-tooltip";
import QuestionComponent from "../QuestionComponent";
import { QuestionnaireField } from "../../DTOs/questionnaireField";

interface RadioFieldProps extends FieldProps {
    fieldData: QuestionnaireField;
    values: FormValues;
    setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
    filterConditionalPages?:(values: FormValues) => void;
}


export const RadioField: React.FC<RadioFieldProps> = ({
    field,
    fieldData,
    values,
    setFieldValue,
    filterConditionalPages=undefined
    
}) => {
    return (
         <div key={fieldData.id} className="mb-4">
            <fieldset className="w-full">
              <legend className="text-base font-medium w-full">
                {renderFieldLabel(
                  fieldData.label,
                  fieldData.isRequired,
                  fieldData.id,
                  values,setFieldValue,
                  fieldData.tooltip
                )}
              </legend>
              <div className="mt-3 grid auto-rows-auto">
                {fieldData.options?.map((option, index) => {
                  const radioId = `${fieldData.id}_${index}`;
                  const isSelected = getNestedValue(values, fieldData.id) === option.value;

                  return (
                    <div
                      key={radioId}
                      className={`flex items-center ${index + 1 !== fieldData.options?.length ? "mb-4" : ""}`}
                    >
                      <Field
                        id={radioId}
                        name={fieldData.id}
                        type="radio"
                        value={option.value}
                        required={fieldData.isRequired}
                        className="p-4 w-4 text-custom-blue border-gray-300 focus:ring-custom-blue cursor-pointer"
                        onChange={() => {
                          setFieldValue(fieldData.id, option.value);
                          filterConditionalPages && filterConditionalPages({...values,[fieldData.id]: option.value })
                          
                        }}
                      />
                      <label htmlFor={radioId} className="ml-2 cursor-pointer">
                        <span
                          className={`ml-2 block ${isSelected ? "font-bold" : ""}`}
                        >
                          {option.value}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </fieldset>
            <ErrorMessage
              name={fieldData.id}
              component="div"
              className="text-red-600"
            />
          </div>
    );
};