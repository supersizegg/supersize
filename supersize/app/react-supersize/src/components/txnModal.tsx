import React from "react";

type TxnModalProps = {
    isOpen: boolean;
    onClose: () => void;
    transactions: { id: string; status: string }[];
    onRetry: (transactionId: string) => void;
};

const TxnModal: React.FC<TxnModalProps> = ({ isOpen, onClose, transactions, onRetry }) => {
    if (!isOpen) return null;

    const hasFailedTransactions = transactions.some(txn => txn.status === 'failed');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 w-full h-full">
            <div className="bg-gray-800 rounded-lg shadow-lg w-full max-w-lg">
                <header className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-lg font-semibold">Transaction Log</h2>
                    <button
                        className="text-gray-600 hover:text-gray-800"
                        onClick={onClose}
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

                <div className="p-4">
                    <h3 className="text-lg font-medium mb-4">TRANSACTIONS</h3>
                    <div className="space-y-4 max-h-40 overflow-auto">
                        {transactions.map((txn, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between border-b pb-2"
                            >
                                <span className={`bg-${txn.status === 'Success' ? 'green' : 'red'}-500 text-white px-2 py-1 rounded-full text-sm`}>
                                    {txn.status.toUpperCase()}
                                </span>
                                <div>
                                    <p className="font-medium">Transaction ID: {txn.id}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <footer className="p-4 border-t">
                    {hasFailedTransactions ? (
                        <button
                            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                            onClick={() => {
                                const failedTxn = transactions.find(txn => txn.status === 'failed');
                                if (failedTxn) {
                                    onRetry(failedTxn.id);
                                }
                            }}
                        >
                            Retry and Resume
                        </button>
                    ) : (
                        <button
                            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
};

export default TxnModal;