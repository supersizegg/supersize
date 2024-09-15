import React from 'react';
import { motion } from 'framer-motion';
import './FoodEntity.scss'; 

interface Food {
    x: number;
    y: number;
}

type FoodProps = {
    food: Food;
    scale: number;
};

const FoodEntity : React.FC<FoodProps> = ({food,scale}) => {
    return (
        <div style={{
        position: 'relative',
        left: `${food.x*scale}px`,
        top: `${food.y*scale}px`,
        width: `${10*scale}px`, 
        height: `${10*scale}px`,
        borderRadius: '50%',
        backgroundColor: 'red'
        }} />
    );
};

export default FoodEntity;