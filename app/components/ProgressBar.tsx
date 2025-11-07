"use client"
import { useEffect, useState } from "react";
import { evaluateConditionalLogic } from "../(routes)/[...questionnaireName]/helper";
import SpinnerCircular from "./SpinnerCircular";
import { fetchFieldLabels } from "../DTOs/questionnaireField";

interface ProgressBarProps {
  inProgressWI: Record<string, any>; // The WIs that are not yet responded to
}

export default function ProgressBar({ inProgressWI }: ProgressBarProps) {
  const [progress, setProgress] = useState<number>(0);
  const [loading,setLoading] =useState(true);

  useEffect(() => {
    const calculateProgress = async (inProgressData: any): Promise<number> => {
      try {
        let totalFields = 0;
        let filledFields = 0;

        const fieldIds = Object.keys(inProgressData);
        const fieldLabels = await fetchFieldLabels(fieldIds);

        if (inProgressData) {
          Object.entries(inProgressData).forEach(([fieldKey, fieldValue]) => {
            if (
              fieldKey !== "questionnaireIdInPortal" &&
              fieldKey !== "what_tax_year_are_you_reporting_for_" &&
              fieldKey !== "pages"
            ) {
              const fieldInfo = fieldLabels[fieldKey];
              const logicEquations = fieldInfo?.conditionalLogic?.logicEquations;
              const isConditionMet = logicEquations
                ? evaluateConditionalLogic(logicEquations, inProgressData)
                : true;

              if (isConditionMet) {
                totalFields++;
                if (
                  (fieldValue !== null && fieldValue !== "") ||
                  fieldInfo?.type === "table"
                ) {
                  filledFields++;
                }
              }
            }
          });

          const progressPercentage =
            totalFields > 5 ? Math.round((filledFields / totalFields) * 100) : 0;

          return progressPercentage;
        }
        return 0;
      } catch (error) {
        console.error("Error calculating progress:", error);
        return 0;
      }
    };

    const fetchAndSetProgress = async () => {
      const wiId = inProgressWI.wiId; // Extract wiId from inProgressWI
      if (!wiId) return;

      const inProgressData = inProgressWI; // Use inProgressWI to fetch in-progress data
      const progressValue = await calculateProgress(inProgressData);
      setProgress(progressValue);
      setLoading(false)
    };

    fetchAndSetProgress();
  }, [inProgressWI]);
  if(loading) return (<div className="flex items-center"><SpinnerCircular /></div>);
  return (
<div className="flex items-center">
  <div className="bg-gray-200 rounded-full h-4 sm:w-32 w-16 overflow-hidden">
    <div
      className="bg-custom-blue-80 h-full" 
      style={{
        width: `${progress || 0}%`,
      }}
    ></div>
  </div>
  
</div>

  );
}
