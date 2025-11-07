import React, { useState } from 'react';
import { Tooltip } from 'react-tooltip';
import {  FaShare } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface QuestionComponentProps {
  label: string;
  id: string;
  setFieldValue:any;
}

const QuestionComponent = ({ label,id,setFieldValue }: QuestionComponentProps) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(true);

  const handleIconClick = () => {
    setIsTooltipOpen(true); // Open the tooltip
  };

  const handleTooltipClick = () => {
    
    setIsTooltipOpen(false); // Close the tooltip
    setTimeout(()=>setIsTooltipOpen(true),0)
    
  };

  return (
    <>
    {/*
      <span
        id={`${id}-questionMark`}
        className="ml-2 relative inline-flex items-center justify-center w-6 h-6 bg-gray-300 rounded-full text-sm font-semibold text-gray-700 cursor-pointer transition duration-500 hover:text-white hover:bg-custom-blue"
        onClick={handleIconClick}
        aria-label="Click for more information"
      >
        <FaShare size={10} />
      </span>

      {isTooltipOpen && (
        <Tooltip
          anchorId={`${id}-questionMark`}
          place="top"
          className="z-10 max-w-[300px] bg-custom-blue text-white text-sm p-2 rounded cursor-pointer"
          clickable={true}
          style={{ zIndex: 10, maxWidth: '300px', background: '#0d7ec9', fontSize: '1.2em', whiteSpace: 'normal'}}
        >
          <div onClick={handleTooltipClick}>
            <div className='text-custom-orange'>Click to answer later.</div>
            <br />
            On the last page of the questionnaire, you will have the option to get in touch with us about the questions you had trouble with.
          </div>
        </Tooltip>
      )}
        */}
    </>
  );
};

export default QuestionComponent;
