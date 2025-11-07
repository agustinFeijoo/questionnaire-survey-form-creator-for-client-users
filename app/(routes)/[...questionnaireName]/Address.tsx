import React from "react";
import { Field } from "formik";
import { SelectField } from "@/app/components/fieldTypes/SelectField";
import { getNestedValue, saveProgress } from "./helper";

interface AddressProps {
  field: any;
  values: any;
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
  questionnaireInstanceId: string;
  preview: string | null;
}

const COUNTRY_OPTIONS = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
  "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon",
  "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Costa Rica", "Croatia", "Cuba",
  "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea",
  "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia",
  "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras",
  "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica",
  "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon",
  "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives",
  "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia",
  "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua",
  "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea",
  "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa",
  "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan",
  "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela",
  "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const STATE_OPTIONS = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts",
  "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
  "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];
const Address: React.FC<AddressProps> = ({
  field,
  values,
  setFieldValue,
  questionnaireInstanceId,
  preview,
}) => {
  const address = field.columns[0];
  const addressLine2 = field.columns[1];
  const cityField = field.columns[2];
  const stateField = field.columns[3];
  const countryField = field.columns[4];
  const zipField = field.columns[5];

  const value = getNestedValue(values, field.id);
  const isUS = value && value[countryField] === "United States";

  return (
    <div>
      <div className="md:w-1/2 xl:w-1/3 sm:2/3 mb-4">
        <Field
          name={`${field.id}.${countryField}`}
          isAddress={true}
          fieldData={{ ...field, id: `${field.id}.${countryField}` }}
          addHoverShadow={true}
          component={SelectField}
          questionnaireInstanceId={questionnaireInstanceId}
          options={COUNTRY_OPTIONS.map((option) => ({
            value: option,
            label: option,
          }))}
          placeholder="Country"
        />
      </div>

      <div className="mb-4">
        <Field name={`${field.id}.${address}`}>
          {({ field }: any) => (
            <input
              {...field}
              id={`${field.id}.${address}`}
              type="text"
              required={field.isRequired}
              className="custom-input"
              onBlur={() =>
                !preview && saveProgress(values, questionnaireInstanceId)
              }
              placeholder="Address"
            />
          )}
        </Field>
      </div>

      <div className="mb-4">
        <Field name={`${field.id}.${addressLine2}`}>
          {({ field }: any) => (
            <input
              {...field}
              id={`${field.id}.${addressLine2}`}
              type="text"
              required={field.isRequired}
              className="custom-input"
              onBlur={() =>
                !preview && saveProgress(values, questionnaireInstanceId)
              }
              placeholder="Address Line 2 (Optional)"
            />
          )}
        </Field>
      </div>

      {!isUS && (
        <div className="mb-4">
          <Field name={`${field.id}.${cityField}`}>
            {({ field }: any) => (
              <input
                {...field}
                id={`${field.id}.${cityField}`}
                type="text"
                required={field.isRequired}
                className="custom-input"
                onBlur={() =>
                  !preview && saveProgress(values, questionnaireInstanceId)
                }
                placeholder="City"
              />
            )}
          </Field>
        </div>
      )}

      {isUS ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="mb-4">
            <Field name={`${field.id}.${cityField}`}>
              {({ field }: any) => (
                <input
                  {...field}
                  id={`${field.id}.${cityField}`}
                  type="text"
                  required={field.isRequired}
                  className="custom-input"
                  onBlur={() =>
                    !preview && saveProgress(values, questionnaireInstanceId)
                  }
                  placeholder="City"
                />
              )}
            </Field>
          </div>

          <div className="mb-4 mt-3">
            <Field
              name={`${field.id}.${stateField}`}
              isAddress={true}
              fieldData={{ ...field, id: `${field.id}.${stateField}` }}
              component={SelectField}
              options={STATE_OPTIONS.map((option) => ({
                value: option,
                label: option,
              }))}
              placeholder="State"
              onChange={() =>
                !preview && saveProgress(values, questionnaireInstanceId)
              }
            />
          </div>

          <div className="mb-4">
            <Field name={`${field.id}.${zipField}`}>
              {({ field }: any) => (
                <input
                  {...field}
                  id={`${field.id}.${zipField}`}
                  type="text"
                  required={field.isRequired}
                  className="custom-input"
                  onBlur={() =>
                    !preview && saveProgress(values, questionnaireInstanceId)
                  }
                  placeholder="ZIP Code"
                />
              )}
            </Field>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <Field name={`${field.id}.${stateField}`}>
              {({ field }: any) => (
                <input
                  {...field}
                  id={`${field.id}.${stateField}`}
                  type="text"
                  required={field.isRequired}
                  className="custom-input"
                  onBlur={() =>
                    !preview && saveProgress(values, questionnaireInstanceId)
                  }
                  placeholder="State / Province / Region"
                />
              )}
            </Field>
          </div>

          <div className="mb-4">
            <Field name={`${field.id}.${zipField}`}>
              {({ field }: any) => (
                <input
                  {...field}
                  id={`${field.id}.${zipField}`}
                  type="text"
                  required={field.isRequired}
                  className="custom-input"
                  onBlur={() =>
                    !preview && saveProgress(values, questionnaireInstanceId)
                  }
                  placeholder="Postal Code"
                />
              )}
            </Field>
          </div>
        </>
      )}
    </div>
  );
};

export default Address;
