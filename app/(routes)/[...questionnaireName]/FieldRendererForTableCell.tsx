import { Field } from 'formik';
import { NumericFormat, PatternFormat } from 'react-number-format';
import { currencies } from '@/app/utils/consts';
import { SelectField } from '../../components/fieldTypes/SelectField';
import { FieldRendererForTableCellProps } from '@/app/DTOs/generalInterfaces';
import { saveProgress } from './helper';
import { MultiSelectField } from '@/app/components/fieldTypes/MultiSelectField';



const FieldRendererForTableCell: React.FC<FieldRendererForTableCellProps> = ({column, setFieldValue, values, tableId, preview,questionnaireInstanceId}) => {
  const { type = "text", label, options = [], id } = column;
  switch (type) {
case "currency": {
  const isFixed = column.isDollarFixed;

  return (
    <div key={`${tableId}.${id}currencySelect`} className="flex items-center">
      <div className="flex w-full border border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-custom-blue hover:shadow-lg transition-all duration-300 ease-out">
        {isFixed ? (
          <div
            className="rounded-l-md px-3 py-2 text-sm flex items-center select-none border-r border-gray-300"
            style={{ width: "90px", backgroundColor: "rgba(0, 0, 0, 0.04)" }}
          >
            USD $
          </div>
        ) : (
          <Field
            as="select"
            name={`${tableId}.${id}currencySelect`}
            defaultValue="USD"
            onChange={()=>{if(!preview) saveProgress(values,questionnaireInstanceId)}}
            className="rounded-l-md focus:outline-none cursor-pointer px-3 py-2 text-sm border-gray-300 focus:border-r-2 focus:border-custom-blue w-[90px] bg-transparent -mr-[1px]"
          >
            {currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency} $
              </option>
            ))}
          </Field>
        )}

        {/* Numeric Format Input */}
        <Field name={`${tableId}.${id}`}>
          {({ field, form }: any) => (
            <NumericFormat
              {...field}
              thousandSeparator
              decimalScale={2}
              fixedDecimalScale
              allowNegative={false}
              onBlur={()=>{if(!preview) saveProgress(values,questionnaireInstanceId)}}
              onValueChange={({ value }) => {
                form.setFieldValue(field.id, value);
              }}
              className="flex-1 rounded-r-md border-none focus:outline-none px-3 py-2 text-sm"
            />
          )}
        </Field>
      </div>
    </div>
  );
}


    case "text":
    case "file":
      return (
        <div key={label} >
          <Field
            id={label}
            name={`${tableId}.${id}`}
            type={type}
            onBlur={()=>{if(!preview) saveProgress(values,questionnaireInstanceId)}}
            className="table-custom-input"
          />
        </div>
      );

    case "radio":
    case "checkbox":
      return (
        <div key={label} className="flex justify-center">
          <fieldset>
            <div className="mt-3 flex flex-col items-start space-y-2">
              {options.map((option, index) => (
                <label
                  key={`${tableId}.${id}-${index}`}
                  htmlFor={`${tableId}.${id}-${index}`}
                  className="flex items-center justify-center gap-2 cursor-pointer w-full"
                >
                  <Field
                    id={`${tableId}.${id}-${index}`}
                    name={`${tableId}.${id}`}
                    type={type}
                    value={option.value}
                    className="w-4 h-4 text-custom-blue border-gray-300 focus:ring-custom-blue cursor-pointer"
                    onBlur={()=>{if(!preview) saveProgress(values,questionnaireInstanceId)}}
                  />
                  <span className={`block text-sm text-center w-full ${values[label] === option.value ? "font-bold" : ""}`}>
                    {option.value}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

      );
    case "select":
      return (
        <div key={label} >
          <Field
            component={SelectField}
            id={`${tableId}.${id}`}
            fieldData={column}
            name={`${tableId}.${id}`}
            options={options.map((option) => { return ({ value: option.value, label: option.value }) })}
            addHoverShadow={true}
            preview={preview}
            questionnaireInstanceId={questionnaireInstanceId}
          />
        </div>
      );
    case "multiselect":
      return (
        <div key={label} >
          <Field
            id={`${tableId}.${id}`}
            name={`${tableId}.${id}`}
            fieldData={{ id: `${tableId}.${id}`, type: "multiselect", label: label }}
            component={MultiSelectField}
            //saveChangesAndFilterConditionalFields={{onBlurOrOnChange}} //FIX: determine which of onBlurOrOnChange has to be set
            onBlur={()=>{if(!preview) saveProgress(values,questionnaireInstanceId)}}
            options={options.map(option => ({ value: option.value, label: option.value }))}
            className="cursor-pointer"
            addHoverShadow={true}
          />
        </div>
      );
    case "date":
      return (
        <div key={label}
        >
          <Field
            id={label}
            name={`${tableId}.${id}`}
            type="date"
            className="table-custom-input" //max-w-24 sm:max-w-none
            min="1900-01-01"
            max="2100-12-31"
          />
        </div>
      );

    case "number":
      return (
        <div key={label} >
          <Field id={label} name={`${tableId}.${id}`}>
            {({ field }: any) => (
              <>
                {column.mask ? (
                  <PatternFormat
                    {...field}
                    id={label}
                    format={column.mask.replaceAll("9", "#")} // Ensure placeholders are #
                    allowEmptyFormatting={true} // Keep the mask visible on focus
                    mask="#" // Placeholder for missing digits
                    className="table-custom-input"
                    onBlur={()=>{if(!preview) saveProgress(values,questionnaireInstanceId)}}
                  />
                ) : (
                  <input
                    {...field}
                    type={column.type}
                    className="table-custom-input"
                    onBlur={()=>{if(!preview) saveProgress(values,questionnaireInstanceId)}}
                    placeholder="0.00"
                  />
                )}
              </>
            )}
          </Field>
        </div>
      );
    case "percent":
      return (
        <div key={label} >
          <Field name={`${tableId}.${id}`}>
            {({ field, form }: any) => (
              <>
                <NumericFormat
                  {...field}
                  id={label}
                  value={field.value || ""} // Ensure value is handled properly
                  suffix="%"
                  decimalScale={2} // Allow up to 2 decimal places
                  allowNegative={false} // Disallow negative values
                  isAllowed={(values) => {
                    const { floatValue } = values;
                    return (
                      floatValue === undefined || (floatValue >= 0 && floatValue <= 100)
                    ); // Restrict to 0–100
                  }}
                  onBlur={()=>{if(!preview) saveProgress(values,questionnaireInstanceId)}}
                  onValueChange={(values) =>
                    form.setFieldValue(
                      id,
                      values.value // Update raw number value in Formik
                    )
                  }
                  className="table-custom-input"
                  placeholder="0.00%"
                />
              </>
            )}
          </Field>
        </div>
      );
    default:
      return null;
  }
};

export default FieldRendererForTableCell;
