interface SpinnerCircularProps {
  size?: number;
}
/*
Font size is 
font-size: 16px;
line-height: 1.5;
so the max size for a row is 24px
*/
const SpinnerCircular: React.FC<SpinnerCircularProps> = ({ size }) => (
  <div className="flex justify-center items-center h-full">
    <div className="loader"></div>
    <style jsx>{`
      .loader {
        width: ${size || 24}px;
        height: ${size || 24}px;
        border: 2px solid #FFF;
        border-radius: 50%;
        display: inline-block;
        position: relative;
        box-sizing: border-box;
        animation: rotation 1s linear infinite;
      }
      .loader::after,
      .loader::before {
        content: '';  
        box-sizing: border-box;
        position: absolute;
        left: 0;
        top: 0;
        background: #0d7ec9;
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }
      .loader::before {
        left: auto;
        top: auto;
        right: 0;
        bottom: 0;
      }
      @keyframes rotation {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    `}</style>
  </div>
);
export default SpinnerCircular;