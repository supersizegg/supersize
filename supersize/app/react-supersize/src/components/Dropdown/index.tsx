import React from 'react';
import './Dropdown.scss';

type DropdownProps = {
    items: string[];
    onSelect: (selectedItems: string) => void;
    selectedItem: string;
};

const Dropdown: React.FC<DropdownProps> = ({ items, onSelect, selectedItem }) => {

    const handleClick = (item: string) => {
        onSelect(item);
    };

    return (
        <div className="dropdown-container">
            {items.map((item) => (
                <div
                    key={item}
                    className={`dropdown-item ${selectedItem === item ? 'selected' : ''}`}
                    onClick={() => handleClick(item)}
                >
                    <span className={`indicator ${selectedItem === item ? 'green' : 'red'}`}></span>
                    {item}
                </div>
            ))}
        </div>
    );
};

export default Dropdown;
