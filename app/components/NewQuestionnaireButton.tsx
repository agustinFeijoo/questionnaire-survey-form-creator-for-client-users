import { useRef, useState, useEffect } from "react";
import { FaPlusCircle, FaChevronUp, FaChevronDown } from "react-icons/fa";
import { auth } from "../firebase"; // Update with correct import path
import { useRouter } from "next/navigation"; // Assuming you're using Next.js for routing
import { createNewInProgressQuestionnaire } from "../(routes)/[...questionnaireName]/helper";
import SpinnerCircular from "./SpinnerCircular";

interface NewQuestionnaireButtonProps {
  buttonRef: React.RefObject<HTMLDivElement | null>;
  prodQuestionnaires: { title: string }[]; // Adjust type if necessary
}

export default function NewQuestionnaireButton({
  buttonRef,
  prodQuestionnaires,
}: NewQuestionnaireButtonProps) {
  const [newQuestionnaireExpanded, setNewQuestionnaireExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggleNewQuestionnaire = () => {
    setNewQuestionnaireExpanded((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside of the button and dropdown
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setNewQuestionnaireExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup the event listener on component unmount
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [buttonRef]);

  return (
    <div ref={buttonRef} className="relative">
      <button
        onClick={() => {
          toggleNewQuestionnaire();
        }}
        className="bg-custom-blue-80 hover:bg-custom-blue text-white font-bold py-2 px-4 rounded flex items-center shadow-lg w-72 cursor-pointer"
      >
        <div className="mr-2">
          <FaPlusCircle />
        </div>
        Begin a new questionnaire &nbsp;
        {newQuestionnaireExpanded ? <FaChevronUp /> : <FaChevronDown />}
      </button>
      {newQuestionnaireExpanded && (
        <div className="bg-white border rounded mt-3 shadow-lg p-4 w-72 py-2 px-4 z-10 absolute">

{!loading ? (
  prodQuestionnaires.map((questionnaire, i) => (
    <button
      key={i}
      onClick={() => {
        if (auth.currentUser?.email) {
          setLoading(true);
          const questionnaireIdInPortal = questionnaire.title.replaceAll(" ", "-");
          createNewInProgressQuestionnaire(
            questionnaireIdInPortal,
            auth.currentUser.email
          ).then((newWIID) =>
            router.push(`/${questionnaireIdInPortal}?questionnaireInstanceId=${newWIID}`)
          );
        }
      }}
      className="flex items-center justify-center text-center rounded text-custom-blue-80 hover:text-custom-blue cursor-pointer w-full py-2"
    >
      <span className="w-full">{questionnaire.title}</span>
    </button>
  ))
) : (
  <SpinnerCircular size={36}/>
)}

        </div>
      )}
    </div>
  );
}
