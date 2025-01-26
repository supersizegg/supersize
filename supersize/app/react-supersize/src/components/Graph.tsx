import React from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, Tooltip, Legend);

interface GraphProps {
  maxPlayers: number;
  foodInWallet: number;
  setCurrentFoodToAdd: (currentFoodToAdd: number) => void;
}

const Graph: React.FC<GraphProps> = ({ maxPlayers, foodInWallet, setCurrentFoodToAdd }) => {
  const epsilon = 0.01;

  const calculateK = (z: number, epsilon: number): number => {
    const numerator = epsilon / (100.0 - 0.6);
    const logValue = Math.log(numerator);
    const k = -logValue / (z * 1000.0);
    return k;
  };

  const calculateY = (x: number, k: number): number => {
    const exponent = -(k / 4.0) * x;
    const y = 100.0 - (100.0 - 0.6) * Math.exp(exponent);
    return y;
  };

  const k = calculateK(maxPlayers, epsilon);

  const foodInWalletValues = Array.from({ length: 30000 }, (_, i) => i); 
  const foodToAddValues = foodInWalletValues.map((x) => calculateY(x, k) * 10);

  const currentFoodToAdd = Math.floor(calculateY(foodInWallet, k)) * 10;
  setCurrentFoodToAdd(currentFoodToAdd);
  const roundedFoodInWallet = Math.round(foodInWallet);

  const data = {
    labels: foodInWalletValues,
    datasets: [
      {
        label: "Food to Add",
        data: foodToAddValues,
        borderColor: "rgba(75,192,192,1)",
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        z: 1,
      },
      {
        label: "Current Value",
        data: foodInWalletValues.map((x) => (x === roundedFoodInWallet ? currentFoodToAdd : null)),
        borderColor: "rgba(255,0,0,1)",
        borderWidth: 3,
        pointRadius: 8,
        pointBackgroundColor: "rgba(255,0,0,1)",
        showLine: false,
        z: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Food in Wallet",
        },
      },
      y: {
        title: {
          display: true,
          text: "Food to Add",
        },
        min: 0, 
        max: Math.max(...foodToAddValues) + 10, 
      },
    },
  };

  return (
    <div style={{ width: "600px", margin: "0 auto" }}>
      <h2 style={{ color: "black" }}>Food to Add vs. Food in Wallet</h2>
      <Line data={data} options={options} />
    </div>
  );
};

export default Graph;
