

export const updateWins = async (walletAddress: string, updateId: number, amount: number) => {
    const response = await fetch(`http://localhost:3000/api/updateWins`, {
        method: "POST",
        body: JSON.stringify({ walletAddress, updateId, amount }),
    });

    const resData = await response.json();
    if (!resData.success) {
        throw new Error("Failed to update wins");
    }
    return resData;
}
