import Select from 'react-select';
import { FieldProps } from "formik";
import { FormValues } from '@/app/DTOs/generalInterfaces';
import { getNestedValue } from '@/app/(routes)/[...questionnaireName]/helper';

interface MultiSelectFieldProps extends FieldProps {
  options: { value: string; label: string }[];
  form: any;
  fieldData: any;
  innerRef: React.MutableRefObject<any>;
  onChange?: () => void;
  isRepetitive?: boolean;
  addHoverShadow?: boolean;
  saveChangesAndFilterConditionalFields:(values: FormValues) => void;
}

export const MultiSelectField: React.FC<MultiSelectFieldProps> = ({
  field,
  form,
  options,
  fieldData,
  onChange,
  isRepetitive,
  addHoverShadow,
  saveChangesAndFilterConditionalFields
}) => {
  const isLargeScreen = window.innerWidth >= 1536;

  const customStyles = {
    control: (base: any, state: any) => {
      const focusRing = '0 0 0 2px #0d7ec9';
      const baseShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)';
      const hoverShadow = addHoverShadow?" 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)":"";

      return {
        ...base,
        backgroundColor: "transparent",
        outline: 'none',
        border: '1px solid #D1D5DB',
        fontSize: '1rem',
        cursor: 'pointer',
        borderRadius: '0.375rem',
        boxShadow: state.isFocused ? focusRing : baseShadow,
        transition: 'box-shadow 0.3s ease-in-out, border-color 0.3s ease-in-out',
         '&:hover': {
          cursor: 'pointer',
          transition: state.isFocused ? "box-shadow 0s ease-in-out, border-color 0.3s ease-in-out":"box-shadow 0.3s ease-in-out, border-color 0.3s ease-in-out",
          boxShadow: state.isFocused?`${focusRing}, ${hoverShadow}`:`${hoverShadow}`
        },
      };
    },

    option: (base: any, state: any) => ({
      ...base,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      padding: '8px 12px',
      cursor: 'pointer',
      backgroundColor: state.isSelected ? '#0d7ec9' : state.isFocused ? '#a3d4f2' : 'white',
      color: state.isSelected ? 'white' : 'inherit',
      '&:hover': {
        backgroundColor: state.isSelected ? '#0d7ec9' : '#a3d4f2',
      },
    }),

    valueContainer: (base: any) => ({
      ...base,
      padding: '0 8px',
      display: 'flex',
    }),

    container: (base: any) => ({
      ...base,
      width: '100%',
      display: "inline-block",
    }),

    menu: (base: any) => ({
      ...base,
      zIndex: 10,
    }),
  };

  const selectedOptions = options
    ? options.filter((option) => getNestedValue(form.values,fieldData.id)?.includes(option.value))
    : [];
  
  if (isLargeScreen) {
    return (
      <div>
        <span className="child-shadow pb-2">
          <Select
            inputId={fieldData.id}
            name={field.name}
            options={options}
            value={selectedOptions}
            classNamePrefix="react-select"
            closeMenuOnSelect={false}
            onChange={(selectedOption) => {
              const values = selectedOption ? selectedOption.map((item: any) => item.value) : [];
              form.setFieldValue(fieldData.id, values);
              saveChangesAndFilterConditionalFields({ ...form.values, [fieldData.id]: values })
            }}
            isMulti
            styles={customStyles}
          />
        </span>
      </div>
    );
  } else {
    //FIX: On small screens it shouldn't be the same styles
    return(
   <div>
        <span className="child-shadow pb-2">
          <Select
            isMulti
            closeMenuOnSelect={false}
            value={selectedOptions}
            inputId={fieldData.id}
            name={field.name}
            options={options}
            classNamePrefix="react-select"
            onChange={(selectedOption) => {
              const values = selectedOption ? selectedOption.map((item: any) => item.value) : [];
              form.setFieldValue(fieldData.id, values);
              saveChangesAndFilterConditionalFields({ ...form.values, [fieldData.id]: values })
            }}
            styles={customStyles}
          />
        </span>
      </div>
  );
}
};