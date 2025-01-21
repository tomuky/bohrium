import { useTransaction } from 'wagmi';

export function useTransactionStatus(txHash) {
  const { data, isLoading, isError } = useTransaction({
    hash: txHash,
  });

  const transactionStatus = {
    isLoading,
    isError,
    isReverted: false,
    isSuccessful: false,
    receipt: data,
  };

  if (data) {
    // Check the `status` field if available
    if (data.status === 1) {
      transactionStatus.isSuccessful = true;
    } else if (data.status === 0) {
      transactionStatus.isReverted = true;
    } else {
      // Optional: fallback logic if `status` is missing
      transactionStatus.isReverted =
        data.gasUsed === data.gasLimit && (!data.logs || data.logs.length === 0);
    }
  }

  return transactionStatus;
}
