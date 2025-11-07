import React, { useEffect, useState, useRef } from "react";
import { NumericFormat, PatternFormat } from "react-number-format";
import { Field, ErrorMessage } from "formik";
import { motion, AnimatePresence } from "framer-motion";
import SpinnerCircular from "@/app/components/SpinnerCircular";
import {
  evaluateConditionalLogic,
  renderFieldLabel,
  renderFieldLabelForRepetitive,
  saveProgress,
} from "./helper";
import QuestionnaireTable from "./QuestionnaireTable";
import Repetitive from "./Repetitive";
import { currencies } from "@/app/utils/consts";
import FileInputComponent from "../../components/fieldTypes/FileInputComponent";
import { SelectField } from "../../components/fieldTypes/SelectField";
import { QuestionnaireField } from "@/app/DTOs/questionnaireField";
import Address from "./Address";
import TextField from "@/app/components/fieldTypes/TextField";
import { CheckboxField } from "@/app/components/fieldTypes/CheckboxField";
import SectionDivisor from "@/app/components/fieldTypes/SectionDivisor";
import { RadioField } from "@/app/components/fieldTypes/RadioField";
import { FormValues } from "@/app/DTOs/generalInterfaces";
import { MultiSelectField } from "@/app/components/fieldTypes/MultiSelectField";
import MaskedNumberField from "@/app/components/fieldTypes/NumberMaskedField";


interface FieldRendererProps {
  field: QuestionnaireField;
  setFieldValue: any;
  values: any;
  questionnaireInstanceId: string;
  preview: string | null;
  filterConditionalPages?:(values: FormValues) => void;
  index?: number;
  tableLabel?: string;
  iterationIndex?: number;
  setFieldError?: any;
  submitForm?: any;
  validateField?: any;
  validateForm?: any;
  setFileUploadingList?: React.Dispatch<React.SetStateAction<{
    fileName: string;
    promise: Promise<void>;
    fieldId: string;
  }[]>>

}

const FieldRenderer: React.FC<FieldRendererProps> = ({
  index,
  field,
  setFieldValue,
  values,
  setFileUploadingList,
  questionnaireInstanceId,
  preview,
  filterConditionalPages=undefined,
  iterationIndex,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [showUp, setShowUp] = useState<Boolean>(true);
  

  /*  
  const inputRef = useRef<HTMLInputElement | null>(null);
useEffect(() => {
    if (index === 0) {
      inputRef?.current?.focus();
      //console.log("focusing first one ",field.id);
      //console.log("which value is",inputRef.current?.value)
    }
  }, []);
  */

  useEffect(() => {
    if (field.conditionalLogic?.logicEquations) {
      let shouldShowUp;
      if (iterationIndex !== undefined) {
        shouldShowUp = evaluateConditionalLogic(field.conditionalLogic.logicEquations, values, iterationIndex, field.id);
      }
      else
        shouldShowUp = evaluateConditionalLogic(field.conditionalLogic.logicEquations, values);
      setShowUp(shouldShowUp);
    }

  }, [values]);




  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!field) {
    return <SpinnerCircular size={48} />;
  }

  const renderFieldContent = () => {
    switch (field.type) {
      case "currency": {
        const isFixed = field.isDollarFixed;

        return (
          <div key={field.id} className="mb-4">
            {renderFieldLabel(
              field.label,
              field.isRequired,
              field.id,
              values,setFieldValue,
              field.tooltip
            )}

            <div className="flex w-full border border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-custom-blue hover:shadow-lg transition-all duration-300 ease-out mt-3 md:w-1/3">

              {isFixed ? (
                <div
                  className="rounded-l-md px-3 py-2 text-sm bg-gray-100 flex items-center select-none border-r-1 border-gray-300"
                  style={{ width: "90px", backgroundColor:"rgba(0, 0, 0, 0.04)" }}
                >
                  USD $
                </div>
              ) : (
                <Field
                  as="select"
                  defaultValue="USD"
                  name={`${field.id}currencySelect`}
                  className="rounded-l-md focus:outline-none cursor-pointer px-3 py-2 text-sm focus:border-r-2 w-[90px] border-gray-300 focus:border-custom-blue bg-transparent -mr-[1px]"
                >
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency} $
                    </option>
                  ))}
                </Field>
              )}

              <Field name={field.id} id={field.id}>
                {({ field: formikField, form }: any) => (
                  <NumericFormat
                    required={field.isRequired}
                    {...formikField}
                    thousandSeparator
                    decimalScale={2}
                    fixedDecimalScale
                    allowNegative={false}
                    onBlur={() => {
                      saveProgress(values, questionnaireInstanceId);
                    }}
                    onValueChange={({ value }) => {
                      form.setFieldValue(field.id, value);
                    }}
                    className="flex-1 rounded-r-md border-none focus:outline-none px-3 py-2 text-sm bg-transparent"
                    id={field.id}
                  />
                )}
              </Field>
            </div>

            <ErrorMessage
              name={field.id}
              component="div"
              className="text-red-600"
            />
          </div>
        );
      }



      case "repetitive":
        return (
          <div key={field.id} >
            {renderFieldLabelForRepetitive(
              field.label,
              field.isRequired,
              field.id, setFieldValue,values?.what_tax_year_are_you_reporting_for_,
              field.tooltip
            )}

            <Repetitive
              field={field}
              setFieldValue={setFieldValue}
              values={values}
              questionnaireInstanceId={questionnaireInstanceId}
              preview={preview}
              
            />
          </div>
        );


      case "text": {
        
          return (
            <Field
              setFieldValue={setFieldValue}
              component={TextField}
              name={field.id}
              fieldData={field}
              onBlur={() => {
                if (!preview) saveProgress(values, questionnaireInstanceId);
              }}
            />
          );
        }
      
case "number": {
    return (
      <div key={field.id} className="mb-4">
        {renderFieldLabel(field.label,field.isRequired,field.id,values,setFieldValue)}
        {field.mask?
        <Field
          setFieldValue={setFieldValue}
          component={MaskedNumberField}
          name={field.id}
          fieldData={field}
          onBlur={() => {
            if (!preview) saveProgress(values, questionnaireInstanceId);
          }}
        />:
        <Field
          id={field.id}
          name={field.id}
          type="number"
          required={field.isRequired}
          placeholder="0.00"
          
          className="custom-input sm:!w-1/3 lg:!w-1/6 !w-1/2"
          onBlur={() => {
            if (!preview) saveProgress(values, questionnaireInstanceId);
          }}
        />
        }
        <ErrorMessage
          name={field.id}
          component="div"
          className="text-red-600"
        />
      </div>
    );
  } 


      case "percent":
        return (
          <div key={field.id} className="mb-4">
            {renderFieldLabel(field.label,field.isRequired,field.id,values,setFieldValue)}
            <Field name={field.id} >
              {({ formikField, form }: any) => (
                <>
                  <NumericFormat
                    {...formikField}
                    id={field.id}
                    value={formikField?.value ? String(formikField.value) : ""} // Convert to string if value exists
                    suffix="%"
                    decimalScale={2} // Allow up to 2 decimal places
                    allowNegative={false} // Disallow negative values
                    isAllowed={(values) => {
                      const { floatValue } = values;
                      return (
                        floatValue === undefined || (floatValue >= 0 && floatValue <= 100)
                      ); // Restrict to 0–100
                    }}
                    onBlur={() => { if (!preview) saveProgress(values, questionnaireInstanceId); }}
                    className="custom-input sm:!w-1/3 lg:!w-1/6 !w-1/2"
                    placeholder='0.00%'
                  />
                  <ErrorMessage
                    name={field.id}
                    component="div"
                    className="text-red-600"
                  />
                </>
              )}
            </Field>
          </div>
        );


      case "checkbox":
        return (
          <Field
            id={field.id}
            name={field.id}
            fieldData={field}
            component={CheckboxField}

            values={values}
            setFieldValue={setFieldValue}
            filterConditionalPages={filterConditionalPages}
          />

        );

      case "radio":
        return (
          <Field
            fieldData={field}
            component={RadioField}
            values={values}
            setFieldValue={setFieldValue}
            filterConditionalPages={filterConditionalPages}
          />

        );
      case "select":
        return (
          <div key={field.id} className="mb-4 shadow-to-children">
            {renderFieldLabel(
              field.label,
              field.isRequired, field.id, values,setFieldValue,
              field.tooltip
            )}

            <div className="mt-3" >
              <Field
                id={field.id}
                name={field.id}
                fieldData={field}
                inputId={field.id}
                component={SelectField}
                questionnaireInstanceId={questionnaireInstanceId}
                options={field.options?.map((option) => ({
                  value: option.value,
                  label: option.value,
                }))}
                filterConditionalPages={filterConditionalPages}
              />
            </div>
            <ErrorMessage
              name={field.id}
              component="div"
              className="text-red-600"
            />
          </div>
        );

      case "multiselect":
        return (
          <div key={field.id} className="mb-4 shadow-to-children">
            {renderFieldLabel(
              field.label,
              field.isRequired, field.id, values,setFieldValue,
              field.tooltip
            )}
            <div className="mt-3">
              <Field
                id={field.id}
                name={field.id}
                fieldData={field}
                inputId={field.id}
                component={MultiSelectField}
                filterConditionalPages={filterConditionalPages}
                options={field.options?.map((option) => ({
                  value: option.value,
                  label: option.value,
                }))}
              />
            </div>
            <ErrorMessage
              name={field.id}
              component="div"
              className="text-red-600"
            />
          </div>
        );
      case "textarea":
        return (
          <div key={field.id} className="mb-4">
              {renderFieldLabel(
                field.label,
                field.isRequired, field.id, values,setFieldValue,
                field.tooltip
              )}
            <Field
              id={field.id}
              name={field.id}
              as="textarea"
              required={field.isRequired}
              className="custom-input"
              onBlur={() => { if (!preview) saveProgress(values, questionnaireInstanceId); }}
            />
            <ErrorMessage
              name={field.id}
              component="div"
              className="text-red-600"
            />
          </div>
        );
      case "date":
        return (
          <div key={field.id} className="mb-4 ">
            <label
              htmlFor={field.id}
              className="block font-medium "
            >
              {renderFieldLabel(
                field.label,
                field.isRequired,
                field.id,
                values,setFieldValue,
                field.tooltip
              )}
            </label>
            <Field
              id={field.id}
              name={field.id}
              type="date"
              min="1900-01-01"
              max="2100-12-31"
              required={field.isRequired}
              className={`
                relative custom-input
                [&::-webkit-calendar-picker-indicator]:absolute 
                [&::-webkit-calendar-picker-indicator]:right-4
                [&::-webkit-calendar-picker-indicator]:top-1/2
                [&::-webkit-calendar-picker-indicator]:-translate-y-1/2
                [&::-webkit-calendar-picker-indicator]:text-gray-400
                sm:!w-1/3 lg:!w-1/6 !w-1/2
              `}
            />
            <ErrorMessage name={field.id} component="div" className="text-red-600" />
          </div>
        );


      case "table":
        return (
          <>
          <div key={field.id} className="mb-4">
            <div className="text-center mb-10 ">
              {renderFieldLabel(
                field.label,
                field.isRequired, field.id, values,setFieldValue,
                field.tooltip,
                "text-2xl", "justify-center w-full"
              )}
            </div>

            <QuestionnaireTable
              tableFieldWithoutNestedColumns={field}
              setFieldValue={setFieldValue}
              values={values}
              questionnaireInstanceId={questionnaireInstanceId}
              preview={preview} />
          </div>
              </>
        );
      case "address":
        return (
          <div key={field.id} className="mb-4">
            <div className="text-center mb-10 ">
              {renderFieldLabel(
                field.label,
                field.isRequired, field.id, values,setFieldValue,
                field.tooltip,
                "text-2xl", "justify-center w-full"
              )}
            </div>

            <Address
              questionnaireInstanceId={questionnaireInstanceId}
              preview={preview}
              field={field}
              setFieldValue={setFieldValue}
              values={values}
            />
          </div>
        );
      case "name":
        let lastNameID=`${field.id.replaceAll("first","last")}`;
        return (
          <div className="flex gap-4">
            <div className="w-1/2">
              <Field
                setFieldValue={setFieldValue}
                name={field.id}
                component={TextField}
                fieldData={{ id: field.id, type: "text", label: field.label, isRequired: true }}
                onBlur={() => { if (!preview) saveProgress(values, questionnaireInstanceId); }}
              />
              <ErrorMessage name={field.id} component="div" className="text-red-600" />
            </div>
            <div className="w-1/2">
              <Field
                setFieldValue={setFieldValue}
                name={lastNameID}
                component={TextField}
                fieldData={{ id: lastNameID, type: "text", label: "Last name", isRequired: true }}
                onBlur={() => { if (!preview) saveProgress(values, questionnaireInstanceId); }}
              />
              <ErrorMessage name={lastNameID} component="div" className="text-red-600" />
            </div>
          </div>
        );
      case "file":
        if (setFileUploadingList) //repetitives do not have files 
          return (
            <FileInputComponent fieldData={field} onChange={() => { saveProgress(values, questionnaireInstanceId); }} values={values} setFileUploadingList={setFileUploadingList} ></FileInputComponent>
          );
      case "section":
        return(<SectionDivisor label={field.label}></SectionDivisor>)
      default:
        return null;
    }
  };

  return (
    <AnimatePresence mode="wait">
      {showUp && (
        <motion.div
          key={field.id}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{
            opacity: { duration: 0.5, ease: "easeInOut" },
            height: { duration: 0.5, ease: "easeInOut" },
          }}
          className="field-transition"
        >
          {renderFieldContent()}
        </motion.div>
      )}
    </AnimatePresence>
  );

};

export default FieldRenderer;

