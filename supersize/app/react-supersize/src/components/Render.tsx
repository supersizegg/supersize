const FULL_ANGLE = 2 * Math.PI;
//const color_mapping = require(`${process.env.PUBLIC_URL}/hsl_int_gradient_mapping.json`);
let isAnimating = false; // Flag to control animation
let displayReciept = false;

interface Position {
  x: number;
  y: number;
}

interface PlayerConfig {
  border: number;
  textBorderSize: number;
  textColor: string;
  textBorder: string;
}

interface Borders {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface Cell {
  x: number;
  y: number;
  radius: number;
  mass: number;
  color: string;
  borderColor: string;
  boosting: boolean;
  charging: boolean;
  chargeStart: Date;
  name: string;
}

interface Screen {
  width: number;
  height: number;
}

const drawRoundObject = (
  position: Position,
  radius: number,
  graph: CanvasRenderingContext2D,
  boosting: boolean,
  charging: boolean,
  chargeStart: Date
) => {
  graph.setLineDash([]);
  graph.beginPath();
  graph.arc(position.x, position.y, radius, 0, FULL_ANGLE);
  graph.closePath();
  if (charging || boosting) {
    if (boosting) {
      // Set the glow effect
      graph.shadowBlur = 12; // Adjust the blur level as needed
    } else {
        const chargeTime = Math.min(((new Date()).getTime() - chargeStart.getTime()) / 100, 15);
        // Set the glow effect
      graph.shadowBlur = chargeTime * 4; // Adjust the blur level as needed
      graph.shadowColor = "#FF0000"; // Adjust the color and opacity as needed
    }
  }
  // Draw the circle with the glow effect
  graph.fill();
  graph.stroke();

  if (charging || boosting) {
    // Reset the shadow properties to prevent affecting other drawings
    graph.shadowBlur = 0;
    graph.shadowColor = "transparent";
  }
};

const drawFood = (position: Position, graph: CanvasRenderingContext2D) => {
  graph.fillStyle = '#FFFFFF';
  graph.strokeStyle = '#FFFFFF';
  graph.lineWidth = 0;
  drawRoundObject(position, 10, graph, false, false, new Date());
};


const valueInRange = (min: number, max: number, value: number) => Math.min(max, Math.max(min, value));

const circlePoint = (origo: Position, radius: number, theta: number): Position => ({
  x: origo.x + radius * Math.cos(theta),
  y: origo.y + radius * Math.sin(theta),
});

const cellTouchingBorders = (cell: Cell, borders: Borders) =>
  cell.x - cell.radius <= borders.left ||
  cell.x + cell.radius >= borders.right ||
  cell.y - cell.radius <= borders.top ||
  cell.y + cell.radius >= borders.bottom;

const regulatePoint = (point: Position, borders: Borders): Position => ({
  x: valueInRange(borders.left, borders.right, point.x),
  y: valueInRange(borders.top, borders.bottom, point.y),
});

const drawCellWithLines = (
  cell: Cell,
  borders: Borders,
  graph: CanvasRenderingContext2D,
  boosting: boolean,
  charging: boolean,
  chargeStart: Date
) => {
  const pointCount = 30 + ~~(cell.mass / 5);
  const points: Position[] = [];
  for (let theta = 0; theta < FULL_ANGLE; theta += FULL_ANGLE / pointCount) {
    const point = circlePoint(cell, cell.radius, theta);
    points.push(regulatePoint(point, borders));
  }
  graph.beginPath();
  graph.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    graph.lineTo(points[i].x, points[i].y);
  }
  graph.closePath();
  if (charging || boosting) {
    if (boosting) {
      // Set the glow effect
      graph.shadowBlur = 12; // Adjust the blur level as needed
      graph.shadowColor = cell.color; // Adjust the color and opacity as needed
    } else {
    const chargeTime = Math.min(((new Date()).getTime() - chargeStart.getTime()) / 100, 15);
        // Set the glow effect
      graph.shadowBlur = chargeTime * 3; // Adjust the blur level as needed
      graph.shadowColor = cell.color; // Adjust the color and opacity as needed
    }
  }
  // Draw the circle with the glow effect
  graph.fill();
  graph.stroke();

  if (charging || boosting) {
    // Reset the shadow properties to prevent affecting other drawings
    graph.shadowBlur = 0;
    graph.shadowColor = "transparent";
  }
};

const drawCells = (
  cells: Cell[],
  playerConfig: PlayerConfig,
  toggleMassState: number,
  borders: Borders,
  graph: CanvasRenderingContext2D
) => {
  graph.setLineDash([]);
  for (const cell of cells) {
    // Draw the cell itself
    graph.fillStyle = cell.color;
    graph.strokeStyle = cell.borderColor;
    graph.lineWidth = 6;
    if (cellTouchingBorders(cell, borders)) {
      // Assemble the cell from lines
      drawCellWithLines(cell, borders, graph, cell.boosting, cell.charging, cell.chargeStart);
    } else {
      // Border corrections are not needed, the cell can be drawn as a circle
      drawRoundObject(cell, cell.radius, graph, cell.boosting, cell.charging, cell.chargeStart);
    }

    // Draw the name of the player
    const fontSize = Math.max(cell.radius / 3, 12);
    graph.lineWidth = playerConfig.textBorderSize;
    graph.fillStyle = playerConfig.textColor;
    graph.strokeStyle = playerConfig.textBorder;
    graph.miterLimit = 1;
    graph.lineJoin = 'round';
    graph.textAlign = 'center';
    graph.textBaseline = 'middle';
    graph.font = `bold ${fontSize}px sans-serif`;
    graph.strokeText(cell.name, cell.x, cell.y);
    graph.fillText(cell.name, cell.x, cell.y);

    // Draw the mass (if enabled)
    if (toggleMassState === 1) {
      graph.font = `bold ${Math.max(fontSize / 3 * 2, 10)}px sans-serif`;
      if (cell.name.length === 0) graph.strokeText(Math.round(cell.mass).toString(), cell.x, cell.y + fontSize);
      graph.fillText(Math.round(cell.mass).toString(), cell.x, cell.y + fontSize);
    }
  }
};

const drawBorder = (borders: Borders, graph: CanvasRenderingContext2D) => {
  graph.lineWidth = 3;
  graph.strokeStyle = '#FF0000';
  graph.setLineDash([2, 2]);
  graph.beginPath();
  graph.moveTo(borders.left, borders.top);
  graph.lineTo(borders.right, borders.top);
  graph.lineTo(borders.right, borders.bottom);
  graph.lineTo(borders.left, borders.bottom);
  graph.closePath();
  graph.stroke();
};

const drawErrorMessage = (message: string, graph: CanvasRenderingContext2D, screen: Screen) => {
  isAnimating = false;
  if (!displayReciept) {
    graph.fillStyle = '#333333';
    graph.fillRect(0, 0, screen.width, screen.height);
    graph.textAlign = 'center';
    graph.fillStyle = '#FFFFFF';
    graph.font = 'bold 30px sans-serif';
    graph.fillText(message, screen.width / 2, screen.height / 2);
  }
};

const drawTxnReciept = (message: string, graph: CanvasRenderingContext2D, screen: Screen) => {
  isAnimating = false;
  displayReciept = true;
  graph.fillStyle = '#333333';
  graph.fillRect(0, 0, screen.width, screen.height);
  graph.textAlign = 'center';
  graph.fillStyle = '#FFFFFF';
  graph.font = 'bold 12px sans-serif';
  graph.fillText(message, screen.width / 2, screen.height / 2);
};

const drawErrorMessageWithLoadingIcon = (message: string, graph: CanvasRenderingContext2D, screen: Screen) => {
  const centerX = screen.width / 2;
  const centerY = screen.height / 2 - 50; // Position the loading icon above the center
  const radius = 20;
  let angle = 0; // Initial angle for the rotating part of the loading icon

  // Function to draw the loading icon
  const drawLoadingIcon = () => {
    // Draw the static part of the loading icon (circle)
    graph.beginPath();
    graph.arc(centerX, centerY, radius, 0, Math.PI * 2, false);
    graph.fillStyle = '#FFFFFF';
    graph.fill();

    // Draw the rotating part of the loading icon (line)
    graph.beginPath();
    graph.moveTo(centerX, centerY);
    graph.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
    graph.strokeStyle = '#000000'; // Line color
    graph.stroke();
  };

  // Function to draw the error message
  const drawErrorMessage = () => {
    graph.textAlign = 'center';
    graph.fillStyle = '#FFFFFF';
    graph.font = 'bold 30px sans-serif';
    graph.fillText(message, centerX, centerY + 75); // Position the message below the loading icon
  };

  // Animation function
  const animate = () => {
    if (!isAnimating) return;
    graph.clearRect(0, 0, screen.width, screen.height); // Clear the canvas for redrawing
    drawLoadingIcon();
    drawErrorMessage();
    angle += 0.1; // Update the angle for the next frame to rotate the line
    requestAnimationFrame(animate); // Keep animating
  };

  isAnimating = true;
  animate(); // Start the animation
};

export {
  drawFood,
  drawCells,
  drawErrorMessage,
  drawBorder,
  drawErrorMessageWithLoadingIcon,
  drawTxnReciept
};
