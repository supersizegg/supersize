import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const WebGLBackground: React.FC = () => {
    const canvasRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        // Camera setup
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.set(0, 0, 100);

        // Renderer setup
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        canvasRef.current.appendChild(renderer.domElement);

        // Controls setup
        const controls = new OrbitControls(camera, renderer.domElement);

        // Constants
        const WIDTH = 300;
        const HEIGHT = 180;
        const GRID_SIZE = 1.0;
        const DEPTH_SCALING = 10.0;

        const LARGE_SPHERES = 2;
        const SMALL_SPHERES = 8;
        const SPHERE_CONFIG = [
            { radius: 30, height: 10 }, // Large sphere
            { radius: 20, height: 8 },  // Large sphere
            { radius: 10, height: 5 },  // Small sphere
            { radius: 10, height: 5 },  // Small sphere
            { radius: 10, height: 5 },  // Small sphere
            { radius: 10, height: 5 },  // Small sphere
            { radius: 10, height: 5 },  // Small sphere
            { radius: 10, height: 5 },  // Small sphere
            { radius: 10, height: 5 },  // Small sphere
            { radius: 10, height: 5 }   // Small sphere
        ];

        // Precompute elevation map
        const elevationMap = new Float32Array(WIDTH * HEIGHT);

        const calculateSphere = (cx: number, cy: number, radius: number, height: number) => {
            for (let y = 0; y < HEIGHT; y++) {
                for (let x = 0; x < WIDTH; x++) {
                    const idx = y * WIDTH + x;
                    const dx = x - cx;
                    const dy = y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    elevationMap[idx] += Math.max(0, height * (1 - (dist / radius) ** 2));
                }
            }
        };

        // Generate random positions for spheres
        SPHERE_CONFIG.forEach(sphere => {
            const randomX = Math.random() * WIDTH;
            const randomY = Math.random() * HEIGHT;
            calculateSphere(randomX, randomY, sphere.radius, sphere.height);
        });

        // Normalize elevation map
        const maxElevation = Math.max(...Array.from(elevationMap));
        const elevationArray = Array.from(elevationMap);
        for (let i = 0; i < elevationArray.length; i++) {
            elevationArray[i] = (elevationArray[i] / maxElevation) * DEPTH_SCALING;
        }

        // Create geometry and points
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(WIDTH * HEIGHT * 3);

        for (let y = 0; y < HEIGHT; y++) {
            for (let x = 0; x < WIDTH; x++) {
                const idx = y * WIDTH + x;
                const vertIdx = idx * 3;
                positions[vertIdx] = (x / WIDTH - 0.5) * WIDTH;
                positions[vertIdx + 1] = (y / HEIGHT - 0.5) * HEIGHT;
                positions[vertIdx + 2] = elevationArray[idx];
            }
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2 });
        const points = new THREE.Points(geometry, material);
        scene.add(points);

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };

        animate();

        // Cleanup
        return () => {
            renderer.dispose();
            geometry.dispose();
            material.dispose();
            canvasRef.current?.removeChild(renderer.domElement);
        };
    }, []);

    return <div ref={canvasRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: -1 }} />;
};

export default WebGLBackground;
