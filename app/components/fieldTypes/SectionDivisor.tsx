const SectionDivisor = ({ label = "", className = "" }) => {
  return (
    <div className={`flex items-center gap-4 my-8 ${className}`}>
      <div className="flex-grow h-px bg-gray-300" />
      {label && (
        <h2 className="text-2xl font-semibold  whitespace-nowrap">
          {label}
        </h2>
      )}
      <div className="flex-grow h-px bg-gray-300" />
    </div>
  );
};

export default SectionDivisor;
