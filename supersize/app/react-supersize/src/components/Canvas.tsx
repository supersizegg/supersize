interface Target {
    x: number;
    y: number;
}

const global = {
    target: { x: 0, y: 0 } as Target,
    socket: null as any, // Replace `any` with the proper type if known
    screen: {
        width: window.innerWidth,
        height: window.innerHeight
    },
    KEY_ESC: 'Escape',
    KEY_ENTER: 'Enter',
    KEY_CHAT: 'Enter',
    KEY_FIREFOOD: 'KeyW', // 'W' key
    KEY_SPLIT: 'Space',
    KEY_LEFT: 'ArrowLeft',
    KEY_UP: 'ArrowUp',
    KEY_RIGHT: 'ArrowRight',
    KEY_DOWN: 'ArrowDown',
    borderDraw: true,
    mobile: false,
    game: {
        width: 0,
        height: 0
    },
    gameStart: false,
    disconnected: false,
    kicked: false,
    continuity: false,
    startPingTime: 0,
    toggleMassState: 1,
    backgroundColor: '#100e14',
    lineColor: '#000000',
};

class Canvas {
    directionLock: boolean;
    target: Target;
    reenviar: boolean;
    socket: any;
    directions: string[];
    cv: HTMLCanvasElement;

    constructor(params?: any) {
        this.directionLock = false;
        this.target = global.target;
        this.reenviar = true;
        this.socket = global.socket;
        this.directions = [];

        this.cv = document.getElementById('cvs') as HTMLCanvasElement;
        this.cv.width = global.screen.width;
        this.cv.height = global.screen.height;
        this.cv.addEventListener('mousemove', this.gameInput.bind(this), false);
        this.cv.addEventListener('mouseout', this.outOfBounds.bind(this), false);
        this.cv.addEventListener('keydown', this.keyInput.bind(this), false);
        this.cv.addEventListener('keyup', (event) => {
            this.reenviar = true;
            this.directionUp(event);
        }, false);
        this.cv.addEventListener('keydown', this.directionDown.bind(this), false);
        this.cv.addEventListener('touchstart', this.touchInput.bind(this), false);
        this.cv.addEventListener('touchmove', this.touchInput.bind(this), false);
        this.cv.addEventListener('keydown', this.spaceDown.bind(this), false);
        this.cv.addEventListener('keyup', this.spaceUp.bind(this), false);
        this.cv.addEventListener('mousedown', this.mouseDown.bind(this), false);
        this.cv.addEventListener('mouseup', this.mouseUp.bind(this), false);

        (this.cv as any).parent = this;
    }

    spaceDown(event: KeyboardEvent) {
        const key = event.code;
        const self = (this.cv as any).parent;
        if (key === global.KEY_SPLIT && this.reenviar) {
            self.socket.emit('1', self.target);
            this.reenviar = false;
        }
        if (key === global.KEY_FIREFOOD && this.reenviar) {
            self.socket.emit('3', self.target);
            this.reenviar = false;
        }
    }

    spaceUp(event: KeyboardEvent) {
        const key = event.code;
        const self = (this.cv as any).parent;
        if (key === global.KEY_SPLIT && this.reenviar) {
            self.socket.emit('2', self.target);
            this.reenviar = true;
        }
        if (key === global.KEY_FIREFOOD && this.reenviar) {
            self.socket.emit('4', self.target);
            this.reenviar = true;
        }
    }

    mouseDown(event: MouseEvent) {
        const self = (this.cv as any).parent;
        self.socket.emit('3', self.target);
        this.reenviar = false;
    }

    mouseUp(event: MouseEvent) {
        const self = (this.cv as any).parent;
        self.socket.emit('4', self.target);
        this.reenviar = true;
    }

    directionDown(event: KeyboardEvent) {
        const key = event.code;
        const self = (this.cv as any).parent;
        if (self.directional(key)) {
            self.directionLock = true;
            if (self.newDirection(key, self.directions, true)) {
                self.updateTarget(self.directions);
                self.socket.emit('0', self.target);
            }
        }
    }

    directionUp(event: KeyboardEvent) {
        const key = event.code;
        if (this.directional(key)) {
            if (this.newDirection(key, this.directions, false)) {
                this.updateTarget(this.directions);
                if (this.directions.length === 0) this.directionLock = false;
                this.socket.emit('0', this.target);
            }
        }
    }

    newDirection(direction: string, list: string[], isAddition: boolean) {
        let result = false;
        let found = false;
        for (let i = 0, len = list.length; i < len; i++) {
            if (list[i] === direction) {
                found = true;
                if (!isAddition) {
                    result = true;
                    list.splice(i, 1);
                }
                break;
            }
        }
        if (isAddition && !found) {
            result = true;
            list.push(direction);
        }
        return result;
    }

    updateTarget(list: string[]) {
        this.target = { x: 0, y: 0 };
        let directionHorizontal = 0;
        let directionVertical = 0;
        for (let i = 0, len = list.length; i < len; i++) {
            if (directionHorizontal === 0) {
                if (list[i] === global.KEY_LEFT) directionHorizontal -= Number.MAX_VALUE;
                else if (list[i] === global.KEY_RIGHT) directionHorizontal += Number.MAX_VALUE;
            }
            if (directionVertical === 0) {
                if (list[i] === global.KEY_UP) directionVertical -= Number.MAX_VALUE;
                else if (list[i] === global.KEY_DOWN) directionVertical += Number.MAX_VALUE;
            }
        }
        this.target.x += directionHorizontal;
        this.target.y += directionVertical;
        global.target = this.target;
    }

    directional(key: string) {
        return this.horizontal(key) || this.vertical(key);
    }

    horizontal(key: string) {
        return key === global.KEY_LEFT || key === global.KEY_RIGHT;
    }

    vertical(key: string) {
        return key === global.KEY_DOWN || key === global.KEY_UP;
    }

    outOfBounds() {
        if (!global.continuity) {
            this.target = { x: 0, y: 0 };
            global.target = this.target;
        }
    }

    gameInput(mouse: MouseEvent) {
        if (!this.directionLock) {
            this.target.x = mouse.clientX - this.cv.width / 2;
            this.target.y = mouse.clientY - this.cv.height / 2;
            global.target = this.target;
        }
    }

    touchInput(touch: TouchEvent) {
        touch.preventDefault();
        touch.stopPropagation();
        if (!this.directionLock) {
            this.target.x = touch.touches[0].clientX - this.cv.width / 2;
            this.target.y = touch.touches[0].clientY - this.cv.height / 2;
            global.target = this.target;
        }
    }

    keyInput(event: KeyboardEvent) {
        const key = event.code;
        if (key === global.KEY_ESC && this.reenviar) {
            this.socket.emit('playerEscape', this.target);
            this.reenviar = false;
        }
        if (key === global.KEY_CHAT) {
            const chatInput = document.getElementById('chatInput') as HTMLInputElement;
            chatInput.focus();
        }
    }
}

export default Canvas;
