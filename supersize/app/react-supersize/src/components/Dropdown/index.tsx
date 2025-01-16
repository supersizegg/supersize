import React, { useState } from 'react';
import './Dropdown.scss'; // Assuming you have a CSS file for styling

type DropdownProps = {
    items: string[];
    onSelect: (selectedItems: string[]) => void;
};

const Dropdown: React.FC<DropdownProps> = ({ items, onSelect }) => {
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    const handleClick = (item: string) => {
        setSelectedItems((prevSelectedItems) => {
            const isSelected = prevSelectedItems.includes(item);
            const newSelectedItems = isSelected
                ? prevSelectedItems.filter((i) => i !== item)
                : [...prevSelectedItems, item];
            onSelect(newSelectedItems);
            return newSelectedItems;
        });
    };

    return (
        <div className="dropdown-container">
            {items.map((item) => (
                <div
                    key={item}
                    className={`dropdown-item ${selectedItems.includes(item) ? 'selected' : ''}`}
                    onClick={() => handleClick(item)}
                >
                    <span className={`indicator ${selectedItems.includes(item) ? 'green' : 'red'}`}></span>
                    {item}
                </div>
            ))}
        </div>
    );
};

export default Dropdown;
