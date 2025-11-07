import React, { useEffect, useState } from 'react';
import { FieldArray } from 'formik';
import {  fetchColumnsAsArray, fetchField, getNestedValue } from './helper';
import { QuestionnaireField } from '@/app/DTOs/questionnaireField';
import FieldRenderer from './FieldRenderer';



interface RepetitiveProps {
  field: any;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  values: any;
  isTableStructure?: boolean;
  questionnaireInstanceId:string;
  preview:string | null;
}

const Repetitive: React.FC<RepetitiveProps> = ({
  field,
  setFieldValue,
  values,
  isTableStructure = false,
  questionnaireInstanceId,
  preview,
}) => {
  const [nestedFields, setNestedFields] = useState<QuestionnaireField[]>([]);

  const fieldKey = isTableStructure ? 'rows' : 'iterations';

  useEffect(() => {
    const fetchNestedFields = async ():Promise<QuestionnaireField[] | undefined> => {
      if (isTableStructure && Array.isArray(field.columns)) {
        const fields = await fetchColumnsAsArray(field.columns);
        setNestedFields(fields);
      } else if (!isTableStructure && Array.isArray(field.fields)) {
        const fetched = await Promise.all(
          field.fields.map((fieldId: string) => fetchField(fieldId))
        );
        const localNestedFields=fetched.filter((f): f is QuestionnaireField => f !== undefined);
        setNestedFields(localNestedFields);
        return localNestedFields;
      }
    };

    fetchNestedFields().then((localNestedFields) => {
      const iterations = values?.[field.id]?.[fieldKey];
      if ((!iterations || iterations.length === 0) && localNestedFields) {
        handleAddIteration(0,localNestedFields);
      }
    });
  }, []);



  const handleAddIteration = (iterationIndex: number,localNestedFields:QuestionnaireField[]=nestedFields) => {
    localNestedFields.forEach((nestedField) => {
      const fullKey = `${field.id}.${fieldKey}.${iterationIndex}.${nestedField.id}`;
        setFieldValue(fullKey, '');
    });
  };

  const handleRemoveIteration = (iterationIndex: number, remove: (index: number) => void) => {
    remove(iterationIndex);
  };

  return (
    <FieldArray name={`${field.id}.${fieldKey}`}>
      {({ push, remove }) => (
        <div className="mb-4">
          {getNestedValue(values, field.id)?.[fieldKey]?.map((_: any, iterationIndex: number) => (
            <div key={iterationIndex} className="-mx-2 sm:-mx-8 bg-custom-blue-20">
              <div
                className="sm:ml-8 sm:mr-8 ml-2 mr-2"
                style={{
                  height: '2px',
                  background: 'linear-gradient(90deg, #57aee6, #0d7ec9, #57aee6)',
                }}
              ></div>

              <div className="gap-4 sm:p-8 p-2">
                {nestedFields.map((nestedField) =>
                (
                    <div key={`${field.id}-${nestedField.id}-${iterationIndex}`} className="col-span-1">
                      <FieldRenderer
                        field={{...nestedField,id:`${field.id}.${fieldKey}[${iterationIndex}].${nestedField.id}`}}
                        setFieldValue={setFieldValue}
                        values={values}
                        preview={preview} questionnaireInstanceId={questionnaireInstanceId}
                        iterationIndex={iterationIndex}
                      />
                    </div>
                )
                )}
              </div>

              {(field.allowAddRows && isTableStructure) || !isTableStructure ? (
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    className="px-2 py-1 text-white bg-custom-red-80 hover:bg-custom-red cursor-pointer rounded-md transition duration-300 font-semibold mb-4 mr-4 ml-4"
                    onClick={() => handleRemoveIteration(iterationIndex, remove)}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          ))}

          <div
            className="h-6 -mx-2 sm:-mx-8"
            style={{
              background: 'linear-gradient(to bottom, var(--color-custom-blue-20), white)',
            }}
          ></div>

          {(field.allowAddRows && isTableStructure) || !isTableStructure ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  push({});
                  const currentLength = values?.[field.id]?.[fieldKey]?.length || 0;
                  handleAddIteration(currentLength);
                }}
                className="px-4 py-2 bg-custom-blue-80 hover:bg-custom-blue cursor-pointer text-white rounded-md font-semibold"
              >
                Add another
              </button>
            </div>
          ) : null}
        </div>
      )}
    </FieldArray>
  );
};

export default Repetitive;
