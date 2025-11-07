import React, { useEffect, useRef, useState } from 'react';
import { FieldArray, useFormikContext } from 'formik';
import FieldRendererForTableCell from './FieldRendererForTableCell';
import { fetchColumns, getNestedValue, saveProgress } from './helper';

import Repetitive from './Repetitive';
import { QuestionnaireField } from '@/app/DTOs/questionnaireField';
import { AnimatePresence, motion } from 'framer-motion';

interface QuestionnaireTableProps {
  tableFieldWithoutNestedColumns: any;
  values: any;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  questionnaireInstanceId:string;
  preview:string | null;
}

const QuestionnaireTable: React.FC<QuestionnaireTableProps> = ({ tableFieldWithoutNestedColumns, values, setFieldValue,questionnaireInstanceId,preview }) => {
  const { setFieldValue: formikSetFieldValue } = useFormikContext();
  const tableRef = useRef<HTMLTableElement>(null);
  const [shouldBeARepetitive, setShouldBeARepetitive] = useState(false);
  const [field, setField] = useState<QuestionnaireField | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const fetchColumnFields = async () => {
      const columns = await fetchColumns(tableFieldWithoutNestedColumns.columns);
      const data = { ...tableFieldWithoutNestedColumns, columns };
      setField(data);
  
      // wait one tick so DOM can update
      setTimeout(() => {
        if (tableRef.current) {
          const tableWidth = tableRef.current.offsetWidth;
          if (!shouldBeARepetitive && tableWidth > screen.width) {
            setShouldBeARepetitive(true);
          }
        }
  
        const rows = getNestedValue(values, tableFieldWithoutNestedColumns.id)?.rows;
        if (!rows || rows.length === 0) {
          handleAddRow(0);
        }
  
        setIsReady(true); // now it's ready to show
      }, 0);
    };
  
    fetchColumnFields();
  }, []);
  

  const handleAddRow = (rowIndex: number) => {
    if (!tableFieldWithoutNestedColumns?.columns) return;
    Object.values(tableFieldWithoutNestedColumns.columns).forEach((column: any) => {
      const fieldKey = `${tableFieldWithoutNestedColumns.id}.rows.${rowIndex}.${column}`;
      formikSetFieldValue(fieldKey, '');
    });
  };

  const renderTableField = () => {
    //if (!field) return null;
    return (
      <FieldArray name={`${tableFieldWithoutNestedColumns.id}.rows`}>
        {({ remove }: { remove: (index: number) => void }) => (
          <div className="mb-4 mt-11">
            <table className="min-w-full divide-y divide-gray-200" ref={tableRef}>
              <thead>
                <tr>
                  {field && field.columns && Object.values(field.columns).map((column: any) => (
                    <th key={column.id} className="sm:pr-10">
                      {column.label || column.id}
                    </th>
                  ))}
                  {field?.allowAddRows && <th></th>}
                </tr>
              </thead>
              <tbody>
                {getNestedValue(values, tableFieldWithoutNestedColumns.id)?.rows?.map((_: any, rowIndex: number) => (
                  <tr key={rowIndex}>
                    {field && field.columns && Object.values(field.columns).map((column: any) => (
                      <td key={column.id} className="sm:pr-6 sm:py-4 whitespace-nowrap pt-4">
                        <FieldRendererForTableCell
                          column={column}
                          setFieldValue={setFieldValue}
                          values={values}
                          tableId={`${field.id}.rows.${rowIndex}`}
                          preview={preview}
                          questionnaireInstanceId={questionnaireInstanceId}
                            
                            
                        />
                      </td>
                    ))}
                    {!field || field?.allowAddRows && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          type="button"
                          className="px-2 mb-3 py-1 text-white bg-custom-red-80 hover:bg-custom-red rounded-md cursor-pointer mt-7 sm:mt-4"
                          aria-label="Remove"
                          title="Remove"
                          onClick={() => remove(rowIndex)}
                        >
                          <svg height="14" width="14" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                            <path fill="white" d="M14.348 14.849c-0.469 0.469-1.229 0.469-1.697 0l-2.651-3.030-2.651 3.029c-0.469 0.469-1.229 0-1.697 0-0.469-0.469-0.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-0.469-0.469-0.469-1.228 0-1.697s1.228-0.469 1.697 0l2.652 3.031 2.651-3.031c0.469-0.469 1.228-0.469 1.697 0s0.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c0.469 0.469 0.469 1.229 0 1.698z"></path>
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
                
                }
              </tbody>
            </table>

            {!field || field?.allowAddRows && (
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleAddRow(getNestedValue(values, field.id)?.rows?.length || 0);
                  }}
                  className="px-4 py-2 hover:bg-custom-blue cursor-pointer bg-custom-blue-80 font-semibold text-white rounded-md"
                >
                  Add Row
                </button>
              </div>
            )}
          </div>
        )}
      </FieldArray>
    );
  };

  if (shouldBeARepetitive) {
    return (
      <Repetitive
        field={field}
        setFieldValue={setFieldValue}
        values={values}
        isTableStructure={true} questionnaireInstanceId={questionnaireInstanceId} preview={preview} 
        
        />
    );
  }

  
  return (
    <AnimatePresence mode="wait">
      {isReady && (
        <motion.div
          key="field"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{
            opacity: { duration: 0.3, ease: "easeOut" },
            height: { duration: 0.3, ease: "easeInOut" },
          }}
          className="field-transition"
        >
          {renderTableField()}
        </motion.div>
      )}
    </AnimatePresence>
  );
  
};

export default QuestionnaireTable;