import React, { useState } from "react";
import { Field, ErrorMessage } from "formik";
import { handleDownloadTemplate, removeStrikeTagsOnly } from "../../(routes)/[...questionnaireName]/helper";
import { toast } from "react-toastify";
import { FaCheck, FaDownload } from "react-icons/fa";
import axios from "axios";
import { QuestionnaireField } from "../../DTOs/questionnaireField";
import { Tooltip } from "react-tooltip";
import SpinnerCircular from "../SpinnerCircular";
import QuestionComponent from "../QuestionComponent";
import { getSignedUrl, isLikelyHTML, stripOuterPTag } from "../helper";


interface FileInputComponentProps {
  fieldData: QuestionnaireField;
  onChange: any;
  values: any;
  setFileUploadingList: React.Dispatch<React.SetStateAction<{
    fileName: string;
    promise: Promise<void>;
    fieldId: string;
  }[]>>;
}
export const renderFieldLabelForFileInput = (
  label: string,
  isRequired: boolean = false,
  values:any,
  tooltip: string = '',
  labelFontSize = '',
) => {
  let htmlToBeRendered;
  if(isLikelyHTML(label)){
    htmlToBeRendered=removeStrikeTagsOnly(label);
    htmlToBeRendered=stripOuterPTag(htmlToBeRendered);
  }else{
    htmlToBeRendered=label;
  }
  htmlToBeRendered=htmlToBeRendered.replaceAll("${taxYear}",values?.what_tax_year_are_you_reporting_for_||"the tax year")
  console.log("html",htmlToBeRendered)
  return (
    <div className="flex items-center w-full">
      {/* Label */}
      {isRequired ? (
        <div
          className={`${labelFontSize}`}
          dangerouslySetInnerHTML={{
            __html: `${htmlToBeRendered} <span class="text-red-500 ml-1">*</span>`,
          }}
        />
      ) : (
        <div
          className={`${labelFontSize}`}
          dangerouslySetInnerHTML={{ __html: `${htmlToBeRendered}` }}
        />
      )}
  
    </div>
  );
};

const FileInputComponent: React.FC<FileInputComponentProps> = ({
  fieldData,
  onChange,
  values,
  setFileUploadingList,
}) => {
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<Boolean>(false);

  const handleFileUpload = (file: File, form: any) => {
    if (file.size >= 25000000) {
      const sizeError = "The file size must be less than 25MB. Please upload a smaller file.";
      setErrorMessage(sizeError);
      toast.error(sizeError);
      return;
    }
    let uploadSuccessfullyShowed = false;
    setUploading(true);
    setErrorMessage(null);
    setUploadSuccess(null);
    setSelectedFileName(file.name);

    const fileName = file.name;
    const contentType = file.type || "application/octet-stream";

    // Create a toast and get its ID
    let toastId = toast.info(`Starting upload for ${fileName}...`, { autoClose: false });

    // Create the upload promise
    const uploadPromise = getSignedUrl(fileName,contentType)
      .then((response) => {
        if (!response.ok) {
          return response.json().then((error) => {
            throw new Error(error.message || "Failed to generate signed URL.");
          });
        }
        return response.json();
      })
      .then(({ url }) =>
        axios.put(url, file, {
          headers: { "Content-Type": contentType },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              toast.update(toastId, {
                render: `Uploading... ${progress}%`,
                progress: progress / 100,
              });

              if (progress === 100 && !uploadSuccessfullyShowed) {
                toast.success(`${fileName} has been uploaded successfully!`, { autoClose: 5000 });
                uploadSuccessfullyShowed = true;
              }
            }
          },
        })
      )
      .then(() => {
        setUploadSuccess(true);
        form.setFieldValue(fieldData.id, fileName);
      })
      .catch((error) => {
        console.error("Upload error:", error);
        setErrorMessage(error.message || "An error occurred during file upload.");
        toast.update(toastId, {
          render: error.message || "Upload failed.",
          autoClose: 5000,
        });
        setUploadSuccess(false);
      })
      .finally(() => {
        setUploading(false);
      });

    // Add the file and its upload promise to the list
    setFileUploadingList((prev) => [
      ...prev,
      { fileName, promise: uploadPromise, fieldId: fieldData.id },
    ]);

    // Remove the file from the list once the promise resolves
    uploadPromise.finally(() => {
      setFileUploadingList((prev) => prev.filter((file) => file.fileName !== fileName));
    });
  };




  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, form: any) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) handleFileUpload(file, form);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, form: any) => {
    e.preventDefault();
    const file = e.dataTransfer.files ? e.dataTransfer.files[0] : null;
    if (file) handleFileUpload(file, form);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  return (
    <div key={fieldData?.id} className="mb-4">
      {/* File Input */}
      <Field name={fieldData?.id}>
        {({ field, form }: any) => {
          const { value, ...rest } = field;

          return (
            <div key={fieldData?.id} className="mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <label
                    htmlFor={fieldData?.id}
                    className="font-medium"
                  >
                    {renderFieldLabelForFileInput(
                      fieldData?.label,
                      fieldData?.isRequired,
                      values,
                      fieldData?.tooltip,
                    )}
                  </label>
                </div>

                {/* Right side: Download + Tooltip + Question */}
                <div className="flex items-center gap-4">
                  {fieldData.fileName && (
                    downloading ? (
                      <SpinnerCircular />
                    ) : (
                      <a
                        onClick={async () => {
                          setDownloading(true);
                          try {
                            await handleDownloadTemplate(
                              fieldData.fileName as string,
                              fieldData.contentType as string
                            );
                          } finally {
                            setDownloading(false);
                          }
                        }}
                        role="button"
                        className="text-custom-blue-80 hover:text-custom-blue cursor-pointer text-sm underline flex items-center gap-1"
                        aria-label={`Download template for ${fieldData.fileName}`}
                      >
                        Download template
                        <FaDownload className="sm:w-4 sm:h-4 w-6 h-6" />
                      </a>
                    )
                  )}

                  {fieldData.tooltip && (
                    <span
                      className="relative inline-flex items-center justify-center w-6 h-6 bg-gray-300 rounded-full text-sm font-semibold cursor-pointer transition duration-500 hover:text-white hover:bg-custom-blue"
                      data-tooltip-id={`${fieldData?.label}-tooltip`}
                    >
                      i
                      <Tooltip
                        id={`${fieldData?.label}-tooltip`}
                        place="top"
                        content={fieldData.tooltip || ''}
                        style={{
                          zIndex: 10,
                          maxWidth: '300px',
                          background: '#0d7ec9',
                          fontSize: '1.2em',
                          whiteSpace: 'normal',
                        }}
                        clickable={true}
                      />
                    </span>
                  )}

                  <QuestionComponent
                    label={fieldData.label}
                    id={fieldData.id}
                    setFieldValue={form.setFieldValue}
                  />
                </div>
              </div>

              {/* File Input */}
              <div
                className="relative inline-block sm:w-1/3 md:w-1/6 mt-3"
                onDrop={(e) => handleDrop(e, form)}
                onDragOver={handleDragOver}
              >
                <input
                  {...rest}
                  id={fieldData?.id}
                  type="file"
                  className="sr-only"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>)=>{
                    onChange();
                    handleFileChange(e, form)
                  }}
                />

                <label
                  htmlFor={fieldData?.id}
                  ref={(el) => {
                    if (el) {
                      const text = values[fieldData.id] || "Select a file";
                      const canvas = document.createElement("canvas");
                      const ctx = canvas.getContext("2d");
                      if (ctx) {
                        ctx.font = "500 0.875rem sans-serif";
                        let textWidth = ctx.measureText(text).width * 1.03 + 40;
                        const baseWidth = window.innerWidth < 640 ? 128 : 192;
                        const maxWidth = 1100;
                        if (textWidth > maxWidth) textWidth = maxWidth;
                        el.style.width = textWidth > baseWidth ? `${textWidth}px` : "";
                      }
                    }
                  }}
                  className="block py-2 px-4 text-sm font-semibold text-custom-blue bg-transparent border border-custom-blue rounded-md cursor-pointer overflow-x-auto hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-custom-blue-80 transition duration-300 ease-in-out whitespace-nowrap w-full"
                  title={values[fieldData.id] || 'Select a file'}
                >
                  {values[fieldData.id] || "Select a file"}
                </label>

                {values[fieldData.id] && (
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-custom-red-80 hover:bg-custom-red text-white rounded-full p-1 shadow-md cursor-pointer"
                    aria-label="Remove file"
                    title="Remove file"
                    onClick={() => form.setFieldValue(fieldData.id, "")}
                  >
                    <svg
                      height="12"
                      width="12"
                      viewBox="0 0 20 20"
                      fill="white"
                      className="pointer-events-none"
                    >
                      <path d="M14.348 14.849c-0.469 0.469-1.229 0.469-1.697 0l-2.651-3.030-2.651 3.029c-0.469 0.469-1.229 0-1.697 0-0.469-0.469-0.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-0.469-0.469-0.469-1.228 0-1.697s1.228-0.469 1.697 0l2.652 3.031 2.651-3.031c0.469-0.469 1.228-0.469 1.697 0s0.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c0.469 0.469 0.469 1.229 0 1.698z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Uploading and Status Messages */}
              {uploading && (
                <p className="mt-2 text-sm text-gray-500">Uploading...</p>
              )}
              {uploadSuccess && (
                <p className="mt-2 text-sm text-green-600 flex items-center gap-2">
                  <FaCheck /> File uploaded successfully!
                </p>
              )}
              {uploadSuccess === false && errorMessage && (
                <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
              )}

              <ErrorMessage
                name={fieldData?.id}
                component="div"
                className="mt-3 text-sm text-red-600"
              />
            </div>
          );
        }}
      </Field>
    </div>
  );
};

export default FileInputComponent;