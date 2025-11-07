import React from 'react';

const Spinner = () => (
  <div className="flex justify-center items-center h-full">
    <div className="loader"></div>

    <style jsx>{`
      .loader {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        position: relative;
        animation: rotate 1s linear infinite;
      }
      .loader::before, .loader::after {
        content: "";
        box-sizing: border-box;
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 5px solid #a3d4f2;
        animation: prixClipFix 2s linear infinite;
      }
      .loader::after {
        transform: rotate3d(90, 90, 0, 180deg);
        border-color: #0d7ec9;
      }

      @keyframes rotate {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      @keyframes prixClipFix {
        0% {
          clip-path: polygon(50% 50%, 0 0, 0 0, 0 0, 0 0, 0 0);
        }
        50% {
          clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 0, 100% 0, 100% 0);
        }
        75%, 100% {
          clip-path: polygon(50% 50%, 0 0, 100% 0, 100% 100%, 100% 100%, 100% 100%);
        }
      }
    `}</style>
  </div>
);

export default Spinner;

{/*
    <style jsx>{`
      .loader {
        width: 8px;
        height: 8px;
        position: relative;
        border-radius: 50%;
        background: #0d7ec9;
        animation: wave 1s ease-in infinite;
      }

      @keyframes wave {
        0% {
          box-shadow:
            0 0 0 0px rgba(13, 126, 201, 1),
            0 0 0 20px rgba(13, 126, 201, 0.2),
            0 0 0 40px rgba(13, 126, 201, 0.6),
            0 0 0 60px rgba(13, 126, 201, 0.4),
            0 0 0 80px rgba(13, 126, 201, 0.2);
        }
        100% {
          box-shadow:
            0 0 0 80px rgba(13, 126, 201, 0),
            0 0 0 60px rgba(13, 126, 201, 0.2),
            0 0 0 40px rgba(13, 126, 201, 0.4),
            0 0 0 20px rgba(13, 126, 201, 0.6),
            0 0 0 0px rgba(13, 126, 201, 1);
        }
      }
    `}</style> */}