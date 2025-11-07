import React, { useRef, useEffect, useState, useMemo } from "react";
import { FieldProps } from "formik";
import Select from "react-select";
import { getNestedValue, saveProgress } from "../../(routes)/[...questionnaireName]/helper";
import { set } from "lodash";
import { FormValues } from "../../DTOs/generalInterfaces";

interface SelectFieldProps extends FieldProps {
  options: { value: string; label: string }[];
  fieldData: any;
  isAddress?: Boolean;
  isRepetitive?: boolean;
  placeholder: string;
  addHoverShadow?: boolean;
  preview: string | null;
  questionnaireInstanceId: string;
  filterConditionalPages?:(values: FormValues) => void;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  field,
  form,
  options,
  fieldData,
  isAddress,
  isRepetitive,
  placeholder,
  addHoverShadow,
  preview,
  questionnaireInstanceId,
  filterConditionalPages=undefined
}) => {
  const isLargeScreen = window.innerWidth >= 1536;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const parentElement = containerRef.current.parentElement;
        if (parentElement) {
          setContainerWidth(parentElement.offsetWidth);
        }
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Calculate the width of the largest option
  const getMaxOptionWidth = () => {
    const tempDiv = document.createElement('div');
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.position = 'absolute';
    tempDiv.style.whiteSpace = 'nowrap';
    tempDiv.style.fontSize = '14px'; // Match the font size of react-select
    tempDiv.style.padding = '0 8px'; // Add padding to match react-select
    document.body.appendChild(tempDiv);

    const maxWidth = Math.max(...options.map(option => {
      tempDiv.textContent = option.label;
      return tempDiv.offsetWidth;
    }));

    document.body.removeChild(tempDiv);
    return maxWidth + 80; // Increased padding for dropdown arrow and spacing
  };
  const isFullWidth = fieldData.id.includes('iii');// indicates table field

  const width = useMemo(() => {
    if (isFullWidth) return '100%';
    if (!containerWidth) return 'auto';

    const maxOptionWidth = getMaxOptionWidth();

    if (maxOptionWidth < containerWidth / 6) {
      return `${(containerWidth / 6)}px`;
    } else if (maxOptionWidth < containerWidth / 3) {
      return `${(containerWidth / 3)}px`;
    } else if (maxOptionWidth < (2 * containerWidth / 3)) {
      return `${(2 * containerWidth / 3)}px`;
    } else {
      return '100%';
    }
  }, [options, containerWidth, isFullWidth]); // Only recalculate when these dependencies change

  const customStyles = useMemo(() => ({
    control: (base: any, state: any) => {
      const focusRing = '0 0 0 2px #0d7ec9';
      const baseShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)';
      const hoverShadow = addHoverShadow ? " 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" : "";
      return {
        ...base,
        backgroundColor: "transparent",
        outline: 'none',
        width: isFullWidth ? '100%' : width,
        minWidth: width,
        maxWidth: width,
        border: '1px solid #D1D5DB',
        fontSize: '1rem',
        cursor: 'pointer',
        borderRadius: '0.375rem',
        boxShadow: state.isFocused ? focusRing : baseShadow,
        transition: 'box-shadow 0.3s ease-in-out, border-color 0.3s ease-in-out',

        '&:hover': {
          cursor: 'pointer',
          transition: state.isFocused ? "box-shadow 0s ease-in-out, border-color 0.3s ease-in-out" : "box-shadow 0.3s ease-in-out, border-color 0.3s ease-in-out",
          boxShadow: state.isFocused ? `${focusRing}, ${hoverShadow}` : `${hoverShadow}`
        },
      };
    }
    ,
    menu: (base: any) => ({
      ...base,
      minWidth: width,
      width: isFullWidth ? '100%' : width,
      maxWidth: width,
    }),
    option: (base: any, state: any) => ({
      ...base,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      padding: '8px 12px',
      cursor: 'pointer',
      backgroundColor: state.isSelected
        ? '#0d7ec9'
        : state.isFocused
          ? '#a3d4f2'
          : 'white',
      color: state.isSelected ? 'white' : 'inherit',
      '&:hover': {
        backgroundColor: state.isSelected ? '#0d7ec9' : '#a3d4f2',
      },
    }),
    container: (base: any) => ({
      ...base,
      width: isFullWidth ? '100%' : width,
      display: isFullWidth ? 'block' : 'inline-block',
    }),
    valueContainer: (base: any) => ({
      ...base,
      padding: '0 8px',
    }),
  }), [width, isFullWidth]);
  if (isLargeScreen) {
    
    return (
      <div ref={containerRef}>
        <span className="child-shadow pb-2">
          <Select
            inputId={fieldData.id}
            name={field.name}
            options={options}
            value={options.find((option) => option.value == field.value) || null}
            classNamePrefix="react-select "
            placeholder={placeholder}
            onChange={(selectedOption) => {
              form.setFieldValue(field.name, selectedOption?.value);
              const updatedValues = { ...form.values };
              set(updatedValues, field.name, selectedOption?.value);
              console.log("updatedValues",updatedValues)
              if (!preview) saveProgress(updatedValues, questionnaireInstanceId);
              filterConditionalPages && filterConditionalPages({...updatedValues})
            }}
            isSearchable={true}
            styles={customStyles}
          />
        </span>
      </div>
    );
  } else {
    return (
      <div ref={containerRef}> {/* className={isFullWidth ? "w-full" : "inline-block"} */}
        <select
          id={fieldData.id}
          name={field.name}
          className={(fieldData.id.includes("iii") && !isAddress && !isRepetitive) ?//is this the child of a table field?
            ("table-custom-input cursor-pointer sm:p-0")
            : ("custom-input cursor-pointer pl-3 sm:pr-10 py-2 !mt-0 ")}  // FIX: it adds more mt on top
          onChange={(selectedOption) => {
            /* form.setFieldValue(field.name, selectedOption?.value);
             if(!preview) saveProgress({ ...form.values, [field.name]: selectedOption?.value },questionnaireInstanceId)*/
          }}
          value={fieldData.value || getNestedValue(form.values, fieldData.id)}
        >
          <option value="">Select a value</option>
          {options.map((option, idx) => (
            <option key={idx} value={option.value} className="cursor-pointer">
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
};