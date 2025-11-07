import dynamic from 'next/dynamic';
import onlineTaxmanLogo from "../../public/onlineTaxmanLogo.svg";
import {
  evaluateConditionalLogic
} from "../(routes)/[...questionnaireName]/helper";
import { toast } from "react-toastify";
import { QuestionnaireResponse } from "../DTOs/questionnaireResponse";
import { Field } from "../DTOs/questionnaireField";
import { Questionnaire } from '../DTOs/questionnaire';

let jsPDF: any;

if (typeof window !== 'undefined') {
  import('jspdf').then(module => {
    jsPDF = module.default;
  });
}
export const downloadPDF = async (
  pdfDoc: typeof jsPDF,
  fileName: string
) => {
  try {
    pdfDoc.save(`${fileName}.pdf`);
  } catch (error) {
    console.error("Error downloading PDF:", error);
    alert("Error downloading PDF.");
  }
};

export const generatePDF = async (
  allFieldLabels: Record<string, Field>,
  questionnaireResponse: QuestionnaireResponse, orderedFieldIds: string[]
): Promise<any | null> => {


  if (typeof window === 'undefined') {
    return null;
  }

  // Wait for jsPDF to be loaded if it hasn't been already
  if (!jsPDF) {
    const module = await import('jspdf');
    jsPDF = module.default;
  }

  try {
    const pdfDoc = new jsPDF();
    const { pageWidth, pageHeight } = initializePDF(pdfDoc);

    // Add logo and date to the PDF
    await addLogoAndDateToPDF(pdfDoc, pageWidth, questionnaireResponse.dateSubmitted);

    // Prepare the PDF content
    await preparePDFContent(
      pdfDoc,
      questionnaireResponse,
      allFieldLabels,
      pageWidth,
      pageHeight,
      orderedFieldIds
    );

    // Generate and return the PDF Blob
    return pdfDoc;
  } catch (error) {
    console.error("Error generating PDF:", error);
    return null; // Indicate failure
  }
};

// Helper function to extract field IDs, including nested ones from iterative fields
const extractFieldIds = (fields: any[]): string[] => {
  const fieldIds: string[] = [];

  fields.forEach((field) => {
    fieldIds.push(field.fieldId); // Add top-level fieldId

    // Check if the field contains rows (indicating it's a table)
    if (field.value?.rows) {
      field.value.rows.forEach((row: any) => {
        Object.keys(row).forEach((columnFieldId: string) => {
          fieldIds.push(columnFieldId); // Add column field IDs for table
        });
      });
    }

    // Check if the field contains iterations (indicating it's a repetitive field)
    if (field.value?.iterations) {
      field.value.iterations.forEach((iteration: any) => {
        Object.keys(iteration).forEach((iterationKey) => {
          fieldIds.push(iterationKey); // Add fieldId for the repetitive field

          // Check if the iteration contains rows and add those field IDs
          if (iteration[iterationKey]?.rows) {
            iteration[iterationKey].rows.forEach((row: any) => {
              Object.keys(row).forEach((nestedFieldId) => {
                fieldIds.push(nestedFieldId); // Add nested field IDs inside rows
              });
            });
          }

          // Check if the repetitive field iteration is also a table and add its column field IDs
          if (iteration[iterationKey]?.type === 'table' && iteration[iterationKey]?.columns) {
            iteration[iterationKey].columns.forEach((columnFieldId: string) => {
              fieldIds.push(columnFieldId); // Add column field IDs for nested table
            });
          }
        });
      });
    }
  });

  return fieldIds;
};

// Helper function to determine the selected response
const determineSelectedResponse = (
  responses: any[],
  responseIndex: number | undefined,
  isBeingDownloadedByClient: boolean
) => {
  return isBeingDownloadedByClient
    ? responses[responseIndex!]
    : responses[responses.length - 1];
};
// Helper function to initialize PDF document
const initializePDF = (pdfDoc: typeof jsPDF) => {
  const pageWidth = pdfDoc.internal.pageSize.getWidth();
  const pageHeight = pdfDoc.internal.pageSize.getHeight();
  return { pageWidth, pageHeight };
};
const preparePDFContent = async (
  pdfDoc: typeof jsPDF, questionnaireResponse: QuestionnaireResponse, allFieldLabels: Record<string, Field>, pageWidth: number, pageHeight: number, orderedFieldIds: string[]
) => {
  let yOffset = 70;
  const titleText = generateTitleText(
    questionnaireResponse,
  );
  yOffset = addTitleToPDF(pdfDoc, titleText, pageWidth, yOffset);

  let pageCount = { value: 1 }

  const { unansweredQuestions } = await processResponses(
    pdfDoc,
    questionnaireResponse,
    allFieldLabels,
    pageWidth,
    pageHeight,
    yOffset,
    pageCount,
    orderedFieldIds
  );

  renderUnansweredQuestions(
    pdfDoc,
    unansweredQuestions,
    questionnaireResponse.fields,
    pageWidth,
    pageHeight,
    pageCount,
    yOffset
  );
  addPageNumbers(pdfDoc, pageCount, pageWidth, pageHeight);
};
const processResponses = async (
  pdfDoc: typeof jsPDF,
  questionnaireResponse: QuestionnaireResponse,
  allFieldLabels: Record<string, Field>,
  pageWidth: number,
  pageHeight: number,
  yOffset: number,
  pageCount: { value: number },
  orderedFieldIds: string[]
) => {
  const unansweredQuestions: {
    label: string;
    fieldId: string;
  }[] = [];
  for (const fieldId of orderedFieldIds) {
    // Update yOffset with the returned value from processSingleResponse

    yOffset = await processSingleResponse(
      pdfDoc,
      { fieldId: fieldId, value: questionnaireResponse.fields[fieldId] },
      allFieldLabels,
      pageWidth,
      pageHeight,
      yOffset,
      pageCount,
      unansweredQuestions,
      questionnaireResponse.fields
    );
  }

  return { unansweredQuestions };
};

const processSingleResponse = async (
  pdfDoc: typeof jsPDF,
  response: { fieldId: string, value: any },
  allFieldLabels: any,
  pageWidth: number,
  pageHeight: number,
  yOffset: number,
  pageCount: { value: number },
  unansweredQuestions: any[],
  values: any,
): Promise<number> => {
  const label = allFieldLabels[response.fieldId]?.label || response.fieldId;
  const type = allFieldLabels[response.fieldId]?.type;
  //evaluate conditional logic to continue
  const logicEquations = allFieldLabels[response.fieldId]?.conditionalLogic?.logicEquations;

  if ((logicEquations && evaluateConditionalLogic(logicEquations, values)) || !logicEquations) {
    if (type === "table") {
      // Process table field and update yOffset
      yOffset = await processTableField(
        pdfDoc,
        response,
        pageWidth,
        pageHeight,
        yOffset,
        pageCount,
        allFieldLabels, values
      );
    } else if (type === "repetitive") {
      // Process repetitive field and update yOffset
      yOffset = await processRepetitiveField(
        pdfDoc,
        response,
        pageWidth,
        pageHeight,
        yOffset,
        pageCount,
        unansweredQuestions,
        allFieldLabels,
        values // used for conditional logic within the repetitive
      );
    } else if (type === "address") {
      yOffset = processAddressField(
        pdfDoc,
        response,
        pageWidth,
        pageHeight,
        yOffset,
        pageCount,
        allFieldLabels,
        unansweredQuestions,
        values
      )
    } else {
      // Process non-table field and update yOffset
      yOffset = processNonTableField(
        pdfDoc,
        response,
        label,
        yOffset,
        pageHeight,
        pageCount,
        unansweredQuestions,
        values
      );
    }
  }
  return yOffset; // Return updated yOffset
};

const processTableField = async (
  pdfDoc: typeof jsPDF,
  response: { fieldId: string, value: any },
  pageWidth: number,
  pageHeight: number,
  yOffset: number,
  pageCount: { value: number },
  allFieldLabels: any,
  values: any
): Promise<number> => {
  let label = allFieldLabels[response.fieldId]?.label || response.fieldId;
  let labelWithoutFormat = removeUnwantedHTMLFormatForPDF(label);
  // Get tax year if available and replace placeholders
  const taxYear = values?.what_tax_year_are_you_reporting_for_;
  if (taxYear) {
    labelWithoutFormat = labelWithoutFormat.replaceAll("${taxYear}", taxYear);
  }else{
      labelWithoutFormat = labelWithoutFormat.replaceAll("${taxYear}", "the tax year");
    }

  const headerFields = response.value?.rows || [];

  // Render the table name (label)
  pdfDoc.setLineWidth(0.5);
  pdfDoc.setFont("helvetica", "bold");
  pdfDoc.setFontSize(14);
  const wrappedLabel = pdfDoc.splitTextToSize(labelWithoutFormat, 180);
  wrappedLabel.forEach((line: any) => {
    if (yOffset > pageHeight - 20) {
      pdfDoc.addPage();
      yOffset = 20;
      pageCount.value++;
    }
    const lineWidth = pdfDoc.getTextWidth(line);
    pdfDoc.text(line, (pageWidth - lineWidth) / 2, yOffset);
    yOffset += 9;
  });

  pdfDoc.setFontSize(12);

  // Format data into table rows
  const tableRows: Record<number, Record<string, string>> = {};
  headerFields.forEach((row: any, rowIndex: number) => {
    if (!tableRows[rowIndex]) tableRows[rowIndex] = {};
    Object.keys(row).forEach((columnId: string) => {
      tableRows[rowIndex][columnId] = row[columnId];
    });
  });

  // Render the table
  return renderTable(
    response.fieldId,
    pdfDoc,
    allFieldLabels,
    tableRows,
    pageWidth,
    yOffset,
    pageHeight,
    pageCount
  );
};

const processNonTableField = (
  pdfDoc: typeof jsPDF,
  response: { fieldId: string, value: any },
  label: string,
  yOffset: number,
  pageHeight: number,
  pageCount: { value: number },
  unansweredQuestions: any[],
  fieldLabels: any
): number => {
  if (response.value === undefined) { // this usually means that a new required field was created in the questionnaire after the user submitted their response
    return yOffset;
  }
  let labelWithoutFormat = removeUnwantedHTMLFormatForPDF(label);


  const taxYear = fieldLabels?.["what_tax_year_are_you_reporting_for_"];
  if (taxYear) {
    labelWithoutFormat = labelWithoutFormat.replaceAll("${taxYear}", taxYear);
  }else{
      labelWithoutFormat = labelWithoutFormat.replaceAll("${taxYear}", "the tax year");
    }






  if (response.value === "") {
    // Use fieldLabels to fetch conditional logic if it exists
    if (!response.fieldId.includes("$$$")) { //repetitive empties are not displayed neither as empties or as unanswered questions
      unansweredQuestions.push({
        label,
        fieldId: response.fieldId,
      });
    }
  } else {
    let wrappedLabel = pdfDoc.splitTextToSize(`${labelWithoutFormat}`, 160);
    //for currencies
    let responseValue = response.value;

    if (fieldLabels[response.fieldId].type === "currency") {
      if (!/[a-zA-Z]/.test(responseValue)) // see if the currency has letters ( if the user didn't select a currency the default is USD and it won't show up in the string )
        responseValue = `USD $${responseValue}`
    } else {
      if (fieldLabels[response.fieldId].type === "date") {
        let dateUnformatedArray = responseValue.split("-");
        responseValue = `${dateUnformatedArray[1]}/${dateUnformatedArray[2]}/${dateUnformatedArray[0]}`;
        wrappedLabel[wrappedLabel.length - 1] = `${wrappedLabel[wrappedLabel.length - 1]} (mm/dd/yyyy)`
      }
    }

    const wrappedText = pdfDoc.splitTextToSize(`${responseValue}`, 180);

    pdfDoc.setFont("helvetica", "bold");

    // Split the label into multiple lines if needed


    // Render each line of the label
    wrappedLabel[wrappedLabel.length - 1] = wrappedLabel[wrappedLabel.length - 1] + ":"
    wrappedLabel.forEach((line: any) => {
      if (yOffset > pageHeight - 30) {
        pdfDoc.addPage();
        yOffset = 20;
        pageCount.value++;
      }
      pdfDoc.text(line, 20, yOffset);
      yOffset += 7; // Smaller margin for the question label
    });

    pdfDoc.setFont("helvetica", "normal");
    // Split the response value into multiple lines if needed

    // Render each line of the response value
    wrappedText.forEach((line: any) => {
      if (yOffset > pageHeight - 30) {
        pdfDoc.addPage();
        yOffset = 20;
        pageCount.value++;
      }
      pdfDoc.text(line, 20, yOffset);
      yOffset += 4; // Smaller increment for response text
    });

    yOffset += 5; // Adjusted space after each response
  }

  return yOffset; // Return updated yOffset
};
const processRepetitiveField = async (
  pdfDoc: typeof jsPDF,
  response: { fieldId: string, value: any },
  pageWidth: number,
  pageHeight: number,
  yOffset: number,
  pageCount: { value: number },
  unansweredQuestions: any[],
  allFieldLabels: any,
  values: Record<string, any>
): Promise<number> => {
  let label = allFieldLabels[response.fieldId]?.label || response.fieldId;
  let taxYear = values?.["what_tax_year_are_you_reporting_for_"];
  let labelWithoutFormat = removeUnwantedHTMLFormatForPDF(label);

  if (taxYear) {
    labelWithoutFormat = labelWithoutFormat.replaceAll("${taxYear}", taxYear);
  }else{
      labelWithoutFormat = labelWithoutFormat.replaceAll("${taxYear}", "the tax year");
    }
  // Add centered section header for the repetitive field
  pdfDoc.setFontSize(16); // Larger font size for the title
  pdfDoc.setFont("helvetica", "bold");

  const wrappedLabel = pdfDoc.splitTextToSize(`${labelWithoutFormat}`, 180);

  // Render each line of the label
  for (const line of wrappedLabel) {
    if (yOffset > pageHeight - 30) {
      pdfDoc.addPage();
      yOffset = 20;
      pageCount.value++;
    }
    const lineWidth = pdfDoc.getTextWidth(line);
    pdfDoc.text(line, (pageWidth - lineWidth) / 2, yOffset);
    yOffset += 7; // Smaller margin for the question label
  }

  // Render the custom blue gradient divider for the label
  pdfDoc.setDrawColor(87, 174, 230); // Set custom blue gradient color
  pdfDoc.setLineWidth(1.5);
  pdfDoc.line(20, yOffset, pageWidth - 20, yOffset); // Draw a line (divider) after the label
  yOffset += 10;

  // Iterate over each iteration in the repetitive field
  const iterations = response.value.iterations;
  for (let iterationIndex = 0; iterationIndex < iterations?.length; iterationIndex++) {
    const iteration = iterations[iterationIndex];

    // Add iteration number
    pdfDoc.setFontSize(12);
    pdfDoc.setFont("helvetica", "normal");
    pdfDoc.text(`${iterationIndex + 1}.`, 10, yOffset);
    yOffset += 5;

    // Process each field within the iteration in the correct order
    for (const fieldId of allFieldLabels[response.fieldId].fields) {
      if (evaluateConditionalLogic(
        allFieldLabels[fieldId]?.conditionalLogic?.logicEquations,
        values,
        iterationIndex,
        fieldId
      )) {
        const fieldResponse = iteration[fieldId];
        const fieldLabel = allFieldLabels[fieldId]?.label || fieldId;

        // Process each nested field inside the iteration
        if (allFieldLabels[fieldId]?.type === "table") {
          yOffset = await processTableField(
            pdfDoc,
            { fieldId, value: fieldResponse },
            pageWidth,
            pageHeight,
            yOffset,
            pageCount,
            allFieldLabels, values
          );
        } else {
          if (allFieldLabels[fieldId]?.type === "address") {
            yOffset = processAddressField(pdfDoc, { fieldId, value: "This value shouldn't be displayed please report admin" }, pageWidth, pageHeight, yOffset, pageCount, allFieldLabels, unansweredQuestions, values); //value is to avoid a filter
          } else {

            yOffset = processNonTableField(
              pdfDoc,
              { fieldId, value: fieldResponse },
              fieldLabel,
              yOffset,
              pageHeight,
              pageCount,
              unansweredQuestions,
              allFieldLabels
            );
          }
        }

        // Handle page overflow
        if (yOffset > pageHeight - 30) {
          pdfDoc.addPage();
          pageCount.value++;
          yOffset = 10;
        }
      }
    }

    // Add custom blue gradient divider between iterations
    pdfDoc.setDrawColor(87, 174, 230); // Set custom blue gradient color
    pdfDoc.setLineWidth(1.5);
    pdfDoc.line(20, yOffset, pageWidth - 20, yOffset); // Divider line
    yOffset += 15; // Space after divider
  }

  return yOffset;
};

// Helper function to send PDF to the server
export const sendPDFToServer = async (
  pdfBlob: typeof jsPDF,
  pdfNameWithoutFileExtension: string
): Promise<string> => {
  // Inform the user about the upload process

  try {
    // Create FormData and append the PDF blob
    const formData = new FormData();
    formData.append(
      pdfNameWithoutFileExtension,
      pdfBlob.output("blob"), // Convert jsPDF to Blob
      `${pdfNameWithoutFileExtension}.pdf` // Append file name with extension
    );

    // Send the POST request
    const response = await fetch(
      "https://us-central1-onlinetaxman-c6d0f.cloudfunctions.net/user/pdfCreation",
      {
        method: "POST",
        headers: {
          "x-api-key": process.env.XAPIKEY || ""
        },
        body: formData,
      }
    );

    // Check if the response was successful
    if (!response.ok) {
      console.error("Failed to send PDF:", response.statusText);
      toast.error(`Error uploading PDF: ${response.statusText}`);
      return "Your questionnaire responses have been successfully uploaded to your Box folder!";
    } else {
      return "error"
    }
  } catch (error) {
    // Handle errors during the fetch operation
    console.error("Error sending PDF:", error);
    toast.error(
      "An error occurred while uploading your form to your Box folder. Please try again later."
    );
    return "error"
  }
};

const renderTable = (
  fieldId: string,
  pdfDoc: typeof jsPDF,
  fieldLabels: any, // Pass the fieldLabels object with label details
  headerFields: Record<number, Record<string, string>>,
  pageWidth: number,
  yOffset: number,
  pageHeight: number,
  pageCount: { value: number },
): number => {
  const totalTableWidth = pageWidth - 40;

  // Get field IDs (from the first row assuming all rows have the same structure)
  const columnIds = fieldLabels[fieldId].columns;

  // Map columnIds to their corresponding labels using fieldLabels
  const columnLabels = columnIds.map(
    (id: string) => fieldLabels[id]?.label || id // Use label if available, else fallback to ID
  );
  // Calculate column widths
  const columnWidths = columnLabels.map((columnLabel: string, i: number) => {
    const maxContentWidth = Math.max(
      ...Object.values(headerFields).map((row) =>
        pdfDoc.getTextWidth(String(row[columnIds[i]]) || "")
      ),
      pdfDoc.getTextWidth(columnLabel)
    );
    return Math.min(totalTableWidth / columnLabels.length, maxContentWidth + 20);
  });

  // Calculate maximum header height
  const maxHeaderHeight = Math.max(
    ...columnLabels.map((columnLabel: string, i: number) => {
      const wrappedHeader = pdfDoc.splitTextToSize(columnLabel, columnWidths[i]);
      return wrappedHeader.length * 6 + 2;
    })
  );

  // Calculate the height of the first row to ensure it fits on the same page as the header
  const firstRowHeights = columnIds.map((columnId: string, i: number) => {
    const cellValue = headerFields[0]?.[columnId] ? String(headerFields[0][columnId]) : "";
    const text = pdfDoc.splitTextToSize(cellValue, columnWidths[i]);
    return text.length * 6 + 10;
  });
  const firstRowMaxHeight = Math.max(...firstRowHeights);

  // Check if the headers and the first row will exceed the page height
  if (yOffset + maxHeaderHeight + firstRowMaxHeight > pageHeight - 20) {
    pdfDoc.addPage();
    yOffset = 20; // Reset yOffset for the new page
    pageCount.value++;
  }

  // Render table headers (field labels)
  pdfDoc.setFont("helvetica", "bold");
  columnLabels.forEach((columnLabel: string, i: number) => {
    const headerX = 20 + columnWidths.slice(0, i).reduce((a: any, b: any) => a + b, 0);
    const headerY = yOffset;
    const wrappedHeader = pdfDoc.splitTextToSize(columnLabel, columnWidths[i]);

    pdfDoc.setFillColor(230, 230, 230);
    pdfDoc.rect(headerX, headerY - 6, columnWidths[i], maxHeaderHeight, "F");

    pdfDoc.setTextColor(0, 0, 0);
    wrappedHeader.forEach((line: any, lineIndex: number) => {
      pdfDoc.text(line, headerX + 2, headerY + lineIndex * 6);
    });
  });

  yOffset += maxHeaderHeight; // Update yOffset after table headers

  // Render table rows
  pdfDoc.setFont("helvetica", "normal");
  pdfDoc.setDrawColor(200);

  Object.entries(headerFields).forEach(([rowIndex, row], index) => {
    const rowHeights = columnIds.map((columnId: string, i: number) => {
      let cellValue = row[columnId] ? String(row[columnId]) : "";

      const text = pdfDoc.splitTextToSize(cellValue, columnWidths[i]);
      return text.length * 6 + 10;
    });

    const maxRowHeight = Math.max(...rowHeights);

    // Check if the row will exceed the page and add a new page if necessary
    if (yOffset + maxRowHeight > pageHeight - 20) {
      pdfDoc.addPage();
      yOffset = 20; // Reset yOffset for the new page
      pageCount.value++;

      // Re-render headers on the new page
      pdfDoc.setFont("helvetica", "bold");
      columnLabels.forEach((columnLabel: string, i: number) => {
        const headerX = 20 + columnWidths.slice(0, i).reduce((a: any, b: any) => a + b, 0);
        const headerY = yOffset;
        const wrappedHeader = pdfDoc.splitTextToSize(columnLabel, columnWidths[i]);

        pdfDoc.setFillColor(230, 230, 230);
        pdfDoc.rect(headerX, headerY - 6, columnWidths[i], maxHeaderHeight, "F");

        pdfDoc.setTextColor(0, 0, 0);
        wrappedHeader.forEach((line: any, lineIndex: number) => {
          pdfDoc.text(line, headerX + 2, headerY + lineIndex * 6);
        });
      });

      yOffset += maxHeaderHeight; // Update yOffset after re-rendering table headers
    }

    // Render each cell
    columnIds.forEach((columnId: string, i: number) => {
      let cellValue = row[columnId] ? String(row[columnId]) : "";
      if (fieldLabels[columnId].type === "currency") {
        if (!/[a-zA-Z]/.test(cellValue)) // see if the currency has letters ( if the user didn't select a currency the default is USD and it won't show up in the string )
          cellValue = `USD $${cellValue}`
      }
      const text = pdfDoc.splitTextToSize(cellValue, columnWidths[i]);
      const cellX = 20 + columnWidths.slice(0, i).reduce((a: any, b: any) => a + b, 0);

      text.forEach((line: any, lineIndex: number) => {
        pdfDoc.text(line, cellX + 2, yOffset + lineIndex * 6);
      });

      pdfDoc.rect(cellX, yOffset - 6, columnWidths[i], maxRowHeight);
    });

    yOffset += maxRowHeight; // Move yOffset for the next row
  });

  yOffset += 10; // Reduced space after the table

  return yOffset; // Return the updated yOffset
};

/*
const renderAddress = (
  fieldId: string,
  pdfDoc: jsPDF,
  fieldLabels: any, // Pass the fieldLabels object with label details
  addressData: Record<string, string>, // Address fields as key-value pairs
  pageWidth: number,
  yOffset: number,
  pageHeight: number,
  pageCount: { value: number },
): number => {
  console.log("fieldLabels",fieldLabels)
  const label = fieldLabels[fieldId]?.label || fieldId;

  // Render the Address Field Label
  pdfDoc.setFont("helvetica", "bold");
  pdfDoc.setFontSize(12);
  const wrappedLabel = pdfDoc.splitTextToSize(label, pageWidth - 40);
  
  wrappedLabel.forEach((line: string) => {
    if (yOffset > pageHeight - 20) {
      pdfDoc.addPage();
      yOffset = 20;
      pageCount.value++;
    }
    const lineWidth = pdfDoc.getTextWidth(line);
    pdfDoc.text(line, (pageWidth - lineWidth) / 2, yOffset);
    yOffset += 9;
  });

  pdfDoc.setFontSize(10);
  pdfDoc.setFont("helvetica", "normal");

  // Format and Render Address Components
  const formattedAddress = Object.entries(addressData)
    .map(([key, value]) => `${fieldLabels[key]?.label || key}: ${value}`)
    .join("\n");

  const wrappedAddress = pdfDoc.splitTextToSize(formattedAddress, pageWidth - 40);

  wrappedAddress.forEach((line: string) => {
    if (yOffset > pageHeight - 20) {
      pdfDoc.addPage();
      yOffset = 20;
      pageCount.value++;
    }
    pdfDoc.text(line, 20, yOffset);
    yOffset += 6;
  });

  yOffset += 10; // Spacing after the address field

  return yOffset;
};
*/

const renderUnansweredQuestions = (
  pdfDoc: typeof jsPDF,
  unansweredQuestions: any[],
  values: any,
  pageWidth: number,
  pageHeight: number,
  pageCount: { value: number },
  yOffset: number
) => {
  let fieldsUnanswered = false;
  
  const taxYear = values?.what_tax_year_are_you_reporting_for_;

  unansweredQuestions.forEach(({ label }) => {
    let labelWithoutFormat = removeUnwantedHTMLFormatForPDF(label);

    if (taxYear) {
        labelWithoutFormat = labelWithoutFormat.replaceAll("${taxYear}", taxYear);
    }else{
      labelWithoutFormat = labelWithoutFormat.replaceAll("${taxYear}", "the tax year");
    }

    const wrappedLabel = pdfDoc.splitTextToSize(`${labelWithoutFormat}`, 180);

    wrappedLabel.forEach((line: any) => {
      if (yOffset > pageHeight - 20) {
        pdfDoc.addPage();
        yOffset = 20;
        pageCount.value++;
      }

      if (!fieldsUnanswered) {
        fieldsUnanswered = true;
        pdfDoc.addPage();
        yOffset = 20;
        pageCount.value++;
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(24);
        pdfDoc.text("Unanswered Questions", 20, yOffset);
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.setFontSize(12);
        yOffset += 20;
      }

      pdfDoc.text(line, 20, yOffset);
      yOffset += 10;
    });
  });
};

const addPageNumbers = (
  pdfDoc: typeof jsPDF,
  pageCount: { value: number },
  pageWidth: number,
  pageHeight: number
) => {
  for (let i = 1; i <= pageCount.value; i++) {
    pdfDoc.setPage(i);
    pdfDoc.setFontSize(12);
    pdfDoc.text(`Page ${i} of ${pageCount.value}`, pageWidth / 2, pageHeight - 10, {
      align: "center",
    });
  }
};

// Helper function to add logo and date to PDF
const addLogoAndDateToPDF = async (
  pdfDoc: typeof jsPDF,
  pageWidth: number,
  date: string
) => {
  const img = new Image();
  img.src = onlineTaxmanLogo.src;
  await new Promise((resolve) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      const base64Logo = canvas.toDataURL("image/png");
      const imgWidth = 50;
      const imgHeight = 20;
      const imgX = (pageWidth - imgWidth) / 2;
      pdfDoc.addImage(base64Logo, "PNG", imgX, 20, imgWidth, imgHeight);
      pdfDoc.setFontSize(12);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.text(`Date submitted: ${date.split("T")[0]}`, pageWidth - 60, 20);
      resolve(null);
    };
  });
};

// Helper function to prepare content for PDF

// Helper function to generate title text
const generateTitleText = (
  questionnaireResponse: QuestionnaireResponse
) => {
  const taxYearFromLastResponse = questionnaireResponse.fields.what_tax_year_are_you_reporting_for_;

  const taxFormFromLastResponse = questionnaireResponse.fields.questionnaireIdInPortal;
  questionnaireResponse.fields.questionnaireIdInPortal = taxFormFromLastResponse.replaceAll("---", " ").replaceAll("--", " ").replaceAll("-", " ")
  return questionnaireResponse.fields.what_tax_year_are_you_reporting_for_
    ? `${questionnaireResponse.fields.questionnaireIdInPortal} response for ${questionnaireResponse.fields.what_tax_year_are_you_reporting_for_}`
    : taxYearFromLastResponse
      ? `${questionnaireResponse.fields.questionnaireIdInPortal} response for ${taxYearFromLastResponse}`
      : `${questionnaireResponse.fields.questionnaireIdInPortal} Questionnaire response`;
};

// Helper function to add title to PDF
const addTitleToPDF = (
  pdfDoc: typeof jsPDF,
  titleText: string,
  pageWidth: number,
  yOffset: number
): number => {
  const fontSize = 24; // Title font size
  const padding = 20; // Top padding
  const maxLineWidth = pageWidth - padding * 2; // Maximum width for the title

  pdfDoc.setFont("helvetica", "bold");
  pdfDoc.setFontSize(fontSize);

  // Split the title into multiple lines if it exceeds the maximum line width
  const lines = pdfDoc.splitTextToSize(titleText, maxLineWidth);

  const lineSpacing = 0.5; // Adjust spacing between lines

  // Calculate the yOffset for the title lines and center-align each line
  lines.forEach((line: string, index: number) => {
    const lineX = (pageWidth - pdfDoc.getTextWidth(line)) / 2;
    const lineY = yOffset + index * fontSize * lineSpacing - 20;
    pdfDoc.text(line, lineX, lineY);
  });

  // Return the updated yOffset after rendering the title
  pdfDoc.setFontSize(12);
  pdfDoc.setFont("helvetica", "normal");
  return yOffset + lines.length * fontSize * lineSpacing - 10;
};

const processAddressField = (
  pdfDoc: typeof jsPDF,
  response: { fieldId: string, value: any },
  pageWidth: number,
  pageHeight: number,
  yOffset: number,
  pageCount: { value: number },
  allFieldLabels: any,
  unansweredQuestions: any[],
  values: any
): number => {
  let addressField = allFieldLabels[response.fieldId];


  let label = addressField.label;
  let taxYear = values?.["what_tax_year_are_you_reporting_for_"];
  let labelWithoutFormat = removeUnwantedHTMLFormatForPDF(label);

  if (taxYear) {
    labelWithoutFormat = labelWithoutFormat.replaceAll("${taxYear}", taxYear);
  }else{
      labelWithoutFormat = labelWithoutFormat.replaceAll("${taxYear}", "the tax year");
    }


  if (response.value) {
    pdfDoc.setFont("helvetica", "bold");

    // 🔁 Replace ${taxYear} if applicable

    if (taxYear) {
      label = labelWithoutFormat.replaceAll("${taxYear}", taxYear);
    }else{
      labelWithoutFormat = labelWithoutFormat.replaceAll("${taxYear}", "the tax year");
    }

    // Split the label into multiple lines
    const wrappedLabel = pdfDoc.splitTextToSize(labelWithoutFormat, 180);

    let streetAddress: string = response.value[addressField.columns[0]] || "";
    let addressLine2: string = response.value[addressField.columns[1]] || "";
    let city: string = response.value[addressField.columns[2]] || "";
    let state: string = response.value[addressField.columns[3]] || "";
    let postalCode: string = response.value[addressField.columns[5]] || "";
    let country: string = response.value[addressField.columns[4]] || "";

    // Render each line of the label
    pdfDoc.setFontSize(14);
    wrappedLabel.forEach((line: any) => {
      if (yOffset > pageHeight - 20) {
        pdfDoc.addPage();
        yOffset = 20;
        pageCount.value++;
      }
      const lineWidth = pdfDoc.getTextWidth(line);
      pdfDoc.text(line, (pageWidth - lineWidth) / 2, yOffset);
      yOffset += 9;
    });
    pdfDoc.setFont("helvetica", "normal");

    // Render address components
    pdfDoc.setFontSize(12);
    yOffset = printAddressColumn("Street Address:", streetAddress, pdfDoc, yOffset);
    yOffset = printAddressColumn("Address line 2:", addressLine2, pdfDoc, yOffset);
    yOffset = printAddressColumn("City:", city, pdfDoc, yOffset);
    if (country === "United States") {
      yOffset = printAddressColumn("State:", state, pdfDoc, yOffset);
      yOffset = printAddressColumn("ZIP:", postalCode, pdfDoc, yOffset);
    } else {
      yOffset = printAddressColumn("Province / State / Region:", state, pdfDoc, yOffset);
      yOffset = printAddressColumn("Postal code:", postalCode, pdfDoc, yOffset);
    }
    yOffset = printAddressColumn("Country:", country, pdfDoc, yOffset);
  } else {
    unansweredQuestions.push({
      label: labelWithoutFormat,
      fieldId: response.fieldId,
    });
  }
  return yOffset;
}

function printAddressColumn(
  columnHeader: string,
  value: string,
  pdfDoc: typeof jsPDF,
  yOffSet: number
): number {
  pdfDoc.setFont("helvetica", "bold");
  pdfDoc.text(columnHeader, 20, yOffSet);
  pdfDoc.setFont("helvetica", "normal");
  pdfDoc.text(value, pdfDoc.getTextWidth(columnHeader) + 23, yOffSet);
  return yOffSet + 7; // Return the new yOffset
}



export const filterFieldsFromConditionalPages = async (
  questionnaire: Questionnaire,
  fieldIds: string[],
  inProgressQuestionnaireOrNullIfCompleted: Record<string, any> | null
): Promise<string[]> => {
  if (!inProgressQuestionnaireOrNullIfCompleted || !questionnaire.pagesConditionalLogic) {
    return fieldIds;
  }

  const hiddenFields = new Set<string>();

  Object.entries(questionnaire.pagesConditionalLogic).forEach(
    ([pageKey, logicEquations]) => {
      const shouldDisplay = evaluateConditionalLogic(logicEquations, inProgressQuestionnaireOrNullIfCompleted);
      if (!shouldDisplay) {
        const fieldsOnPage = questionnaire.pages?.[pageKey] ?? [];
        fieldsOnPage.forEach((fieldId) => hiddenFields.add(fieldId));
      }
    }
  );

  const filteredFieldIds = fieldIds.filter((id) => !hiddenFields.has(id));

  return filteredFieldIds;
};

export const removeHTMLTags = (label: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(label, "text/html");
  const contentWithoutTags = doc.body.textContent?.trim() || "";
  return contentWithoutTags;
}

function removeUnwantedHTMLFormatForPDF(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Remove all <s> elements and their content
  const strikeThroughs = doc.querySelectorAll("s");
  strikeThroughs.forEach((el) => el.remove());

  // Replace <strong> and <b> tags with their text content
  const strongTags = doc.querySelectorAll("strong, b");
  strongTags.forEach((el) => {
    const span = document.createElement("span");
    span.textContent = el.textContent;
    el.replaceWith(span);
  });

  // Get the visible text content
  return doc.body.textContent?.trim() || "";
}
