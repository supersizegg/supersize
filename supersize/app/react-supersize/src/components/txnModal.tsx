import React, { useState } from "react";

type TxnModalProps = {
    isOpen: boolean;
    onClose: () => void;
    transactions: { id: string; status: string }[];
    setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>;  
    errorMessage: string;
    handleUserRetry: () => void;
    newGameId: string;
    gameCreated: boolean;
};

const TxnModal: React.FC<TxnModalProps> = ({ isOpen, onClose, transactions, setTransactions, errorMessage, handleUserRetry, newGameId, gameCreated }) => {
    if (!isOpen) return null;

    async function updateTransaction(
      setTransactions: React.Dispatch<React.SetStateAction<{ id: string; status: string }[]>>,
      id: string,
      status: string,
    ) {
      setTransactions((prev) => prev.map((txn) => (txn.id === id ? { ...txn, status } : txn)));
    }
    
    const hasFailedTransactions = transactions.some(txn => txn.status === 'failed');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 w-full h-full">
            <div className="bg-gray-800 rounded-lg shadow-lg w-full max-w-lg">
                <header className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-semibold"> {!gameCreated ? `Creating Game: ${newGameId}` :  `Success! Game ID: ${newGameId}`}</h2>
                    <button
                        className={`text-gray-600 hover:text-gray-800 ${!gameCreated && !hasFailedTransactions ? 'cursor-not-allowed' : ''}`}
                        onClick={onClose}
                        disabled={!gameCreated && !hasFailedTransactions}
                        aria-label="Close"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </header>

                <div className="p-4 min-h-40">
                    <h3 className="text-lg font-medium mb-4">TRANSACTIONS</h3>
                    <div className="space-y-4 max-h-40 overflow-auto">
                        {transactions.map((txn, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between border-b pb-2"
                            >
                                <span className={`text-white px-2 py-1 rounded-full text-sm`}>
                                   <p className="font-medium">{txn.id}</p>
                                </span>
                                <div className="flex items-center">
                                    {txn.status.toUpperCase()}
                                    <div className="w-[10px]"></div>
                                    {txn.status !== 'confirmed' && txn.status !== 'failed' ? (
                                            <svg
                                            className="inline ml-[5px] mt-[2px] h-[20px] w-[20px] stroke-[white]"
                                            width="52"
                                            height="52"
                                            viewBox="0 0 38 38"
                                            xmlns="http://www.w3.org/2000/svg"
                                            >
                                            <g fill="none" fillRule="evenodd">
                                                <g
                                                    transform="translate(1 1)"
                                                    strokeWidth="2"
                                                >
                                                    <circle
                                                        strokeOpacity=".5"
                                                        cx="18"
                                                        cy="18"
                                                        r="18"
                                                    />
                                                    <path d="M36 18c0-9.94-8.06-18-18-18">
                                                        <animateTransform
                                                            attributeName="transform"
                                                            type="rotate"
                                                            from="0 18 18"
                                                            to="360 18 18"
                                                            dur="1s"
                                                            repeatCount="indefinite"
                                                        />
                                                    </path>
                                                </g>
                                            </g>
                                          </svg>
                                        ) : (
                                          <>
                                          {txn.status === 'confirmed' ? (
                                            <svg
                                            className="w-5 h-5 rounded-full inline-block stroke-[2px] stroke-[#15bd12] stroke-miter-10 shadow-inner ml-[5px] mt-[2px]"
                                            style={{
                                                animation:
                                                    "fill 0.4s ease-in-out 0.4s forwards, scale 0.3s ease-in-out 0.9s both;",
                                            }}
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 52 52"
                                        >
                                            <circle
                                                className="stroke-[2px] stroke-[#15bd12] stroke-miter-10 fill-[#15bd12]"
                                                style={{
                                                    strokeDasharray:
                                                        "166; stroke-dashoffset: 166; animation: stroke 0.6s cubic-bezier(0.650, 0.000, 0.450, 1.000) forwards;",
                                                }}
                                                cx="26"
                                                cy="26"
                                                r="25"
                                                fill="none"
                                            />
                                            <path
                                                className="stroke-[white] stroke-dasharray-[48] stroke-dashoffset-[48] transform-origin-[50%_50%] animation-stroke"
                                                fill="none"
                                                d="M14.1 27.2l7.1 7.2 16.7-16.8"
                                            />
                                        </svg>
                                          ) : <p style={{color: "red", fontWeight: "bold"}}>X</p>}
                                        </>
                                      )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <footer className="p-4 border-t">
                    {hasFailedTransactions ? (
                        <>
                        <div className="flex flex-col justify-center items-center">
                        {errorMessage !== "" ? <p className="flex flex-col justify-center items-center text-red-500">{errorMessage} <br/> 
                         <div className="flex flex-col justify-center items-center mb-[10px]">Would you like to retry? </div> </p> : null}
                        </div>
                        <button
                            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                            onClick={() => {
                                const failedTxn = transactions.find(txn => txn.status === 'failed');
                                if (failedTxn) {
                                    handleUserRetry();
                                    updateTransaction(setTransactions, failedTxn.id, "pending");
                                }
                            }}
                        >
                            Retry and Resume
                        </button>
                        </>
                    ) : (
                      <button
                      className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                      onClick={() => {
                          handleUserRetry();
                          const failedTxn = transactions.find(txn => txn.status === 'failed');
                          if (failedTxn) {
                              updateTransaction(setTransactions, failedTxn.id, "pending");
                          }
                      }}
                      >
                          Restart Current Txn and Resume
                      </button>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default TxnModal;