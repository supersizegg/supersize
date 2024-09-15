import { PublicKey } from '@solana/web3.js';
import React from 'react';

type ButtonProps = {
    title: string;
    buttonClass: string;
    onClickFunction: (...args: any[]) => void;  // General function accepting any arguments
    args?: any[];  // Optional array of arguments for the function
};

const Button: React.FC<ButtonProps> = ({ title, buttonClass, onClickFunction, args = [] }) => {
    return <button className={buttonClass} onClick={() => onClickFunction(...args)}>{title}</button>;
};

export default Button;
