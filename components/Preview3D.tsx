
// Fix: Added missing React import to resolve 'Cannot find namespace React' error when using React.FC
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { VisualizerConfig } from '../types';

interface Preview3DProps {
  config: VisualizerConfig;
  isActive: boolean;
}

interface Ripple {
  mesh: THREE.Mesh;
  life: number;
  speed: number;
  maxScale: number;
  isGlow?: boolean;
}

interface TrailPart {
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  coreMesh: THREE.Mesh;
  life: number;
}

const Preview3D: React.FC<Preview3DProps> = ({ config, isActive }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<THREE.Mesh | null>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const trailRef = useRef<TrailPart[]>([]);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const targetsRef = useRef<{ mesh: THREE.Mesh; z: number; x: number; flash: number }[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (ballRef.current) {
      const color = new THREE.Color(config.ballColor);
      (ballRef.current.material as THREE.MeshStandardMaterial).color.copy(color);
      (ballRef.current.material as THREE.MeshStandardMaterial).emissive.copy(color);
    }
  }, [config.ballColor]);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020204);
    scene.fog = new THREE.FogExp2(0x020204, 0.015); // 加入空間深度霧氣

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.set(16, 14, 22);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ReinhardToneMapping;
    mountRef.current.appendChild(renderer.domElement);

    // --- 升級：霓虹掃描網格 (Neon Grid) ---
    const gridGroup = new THREE.Group();
    const grid1 = new THREE.GridHelper(1000, 100, 0x004488, 0x001122);
    gridGroup.add(grid1);
    
    // 次級掃描網格 (更細密且具備偏移)
    const grid2 = new THREE.GridHelper(1000, 50, 0x3b82f6, 0x000000);
    grid2.position.y = -0.05;
    (grid2.material as THREE.LineBasicMaterial).transparent = true;
    (grid2.material as THREE.LineBasicMaterial).opacity = 0.15;
    gridGroup.add(grid2);
    scene.add(gridGroup);

    // --- 升級：數據粒子背景 (Data Starfield) ---
    const starGeo = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPos = new Float32Array(starCount * 3);
    for(let i=0; i<starCount*3; i++) {
      starPos[i] = (Math.random() - 0.5) * 400;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ 
      color: 0x3b82f6, size: 0.35, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending 
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    const createTarget = (zPos: number) => {
      const xPos = (Math.random() - 0.5) * 26;
      const group = new THREE.Group();
      
      const geo = new THREE.CircleGeometry(1.2, 32);
      const mat = new THREE.MeshStandardMaterial({ 
        color: 0x00ffff, transparent: true, opacity: 0.15, emissive: 0x00ffff, emissiveIntensity: 0.5 
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      group.add(mesh);
      
      // 加入外圈霓虹環
      const ringGeo = new THREE.RingGeometry(1.15, 1.2, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      group.add(ring);

      group.position.set(xPos, 0.01, zPos);
      scene.add(group);
      return { mesh: group as any, z: zPos, x: xPos, flash: 0 };
    };

    for (let i = 0; i < 30; i++) targetsRef.current.push(createTarget(-i * 12));

    const ballGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({ 
      color: config.ballColor, emissive: config.ballColor, emissiveIntensity: 4, metalness: 0.9, roughness: 0.1 
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.y = 0.5;
    ballRef.current = ball;
    scene.add(ball);

    const createImpactRipple = (pos: THREE.Vector3) => {
      const glowGeo = new THREE.CircleGeometry(1.2, 32);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.set(pos.x, 0.02, pos.z);
      glowMesh.rotation.x = -Math.PI / 2;
      scene.add(glowMesh);
      ripplesRef.current.push({ mesh: glowMesh, life: 1.0, speed: 0.02, maxScale: 8, isGlow: true });

      const ringGeo = new THREE.RingGeometry(1.1, 1.3, 64);
      const ringMat = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending 
      });
      const rMesh = new THREE.Mesh(ringGeo, ringMat);
      rMesh.position.set(pos.x, 0.04, pos.z);
      rMesh.rotation.x = -Math.PI / 2;
      scene.add(rMesh);
      ripplesRef.current.push({ mesh: rMesh, life: 1.0, speed: 0.015, maxScale: 14 });
    };

    const addTrailPart = (pos: THREE.Vector3, scaleY: number) => {
      const group = new THREE.Group();
      
      // LED 外溢光
      const glowGeo = new THREE.SphereGeometry(0.7, 12, 12);
      const glowMat = new THREE.MeshBasicMaterial({ 
        color: config.ballColor, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending 
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      
      // LED 核心
      const coreGeo = new THREE.SphereGeometry(0.35, 12, 12);
      const coreMat = new THREE.MeshBasicMaterial({ 
        color: config.ballColor, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending 
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      
      group.add(glowMesh);
      group.add(coreMesh);
      group.position.copy(pos);
      group.scale.set(1/Math.sqrt(scaleY), scaleY, 1/Math.sqrt(scaleY));
      scene.add(group);
      
      trailRef.current.push({ mesh: group as any, glowMesh: glowMesh as any, coreMesh: coreMesh as any, life: 1.0 });
    };

    let currentIdx = 0, jumpProgress = 0, isJumping = false, startPos = new THREE.Vector3(0, 0.5, 0), landingTimer = 0, time = 0, frameId: number;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (!isActive) { renderer.render(scene, camera); return; }
      
      time += 0.016;
      const beatTrigger = Math.pow(Math.sin(time * 3.2), 16) > 0.88;
      
      if (!isJumping && beatTrigger && landingTimer <= 0) {
        isJumping = true; jumpProgress = 0; startPos.copy(ball.position); 
        currentIdx++;
        if (currentIdx >= targetsRef.current.length) {
          const lastZ = targetsRef.current[targetsRef.current.length - 1].z;
          for(let i=1; i<=10; i++) targetsRef.current.push(createTarget(lastZ - i * 12));
        }
      }

      if (isJumping) {
        jumpProgress += 0.045 * config.sensitivity;
        if (jumpProgress >= 1) { 
          jumpProgress = 1; isJumping = false; landingTimer = 1.0; 
          createImpactRipple(ball.position.clone());
          targetsRef.current[currentIdx].flash = 1.5;
        }
        const t = jumpProgress, ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const target = targetsRef.current[currentIdx];
        ball.position.x = THREE.MathUtils.lerp(startPos.x, target.x, ease);
        ball.position.z = THREE.MathUtils.lerp(startPos.z, target.z, ease);
        ball.position.y = 0.5 + Math.sin(jumpProgress * Math.PI) * 9.0;
        const stretch = 1.0 + Math.sin(jumpProgress * Math.PI) * 0.5;
        ball.scale.set(1/Math.sqrt(stretch), stretch, 1/Math.sqrt(stretch));
      } else if (landingTimer > 0) {
        landingTimer -= 0.08;
        const bounce = Math.sin(landingTimer * Math.PI * 3.0) * 0.7 * landingTimer;
        ball.position.y = 0.5 + Math.max(0, bounce);
        const squash = 1.0 - (landingTimer > 0.7 ? (landingTimer - 0.7) * 2.5 : 0);
        ball.scale.set(1/Math.sqrt(squash), squash, 1/Math.sqrt(squash));
      } else {
        ball.scale.set(1, 1, 1); ball.position.y = 0.5;
      }

      // 增加採樣頻率，讓尾跡更密集
      if (isJumping || landingTimer > 0) addTrailPart(ball.position.clone(), ball.scale.y);
      
      targetsRef.current.forEach(t => {
        if (t.flash > 0) {
          t.flash -= 0.045;
          const innerMesh = (t.mesh.children[0] as THREE.Mesh);
          const ringMesh = (t.mesh.children[1] as THREE.Mesh);
          (innerMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + t.flash * 8.0;
          (innerMesh.material as THREE.MeshStandardMaterial).opacity = 0.15 + t.flash * 0.85;
          (ringMesh.material as THREE.MeshBasicMaterial).opacity = 0.6 + t.flash * 0.4;
        }
      });

      trailRef.current.forEach((t, i) => {
        t.life -= 0.035;
        const alpha = Math.pow(t.life, 3); // 與 Python 腳本一致的立方衰減
        (t.glowMesh.material as THREE.MeshBasicMaterial).opacity = alpha * 0.15;
        (t.coreMesh.material as THREE.MeshBasicMaterial).opacity = alpha * 0.5;
        if (t.life <= 0) { scene.remove(t.mesh); trailRef.current.splice(i, 1); }
      });

      ripplesRef.current.forEach((r, i) => {
        r.life -= r.speed; 
        const s = (1.0 - Math.pow(r.life, 2)) * r.maxScale + 1; 
        r.mesh.scale.set(s, s, 1);
        (r.mesh.material as THREE.MeshBasicMaterial).opacity = r.life * r.life;
        if (r.life <= 0) { scene.remove(r.mesh); ripplesRef.current.splice(i, 1); }
      });

      // 動態更新星空
      stars.rotation.y += 0.0005;
      stars.position.z += 0.1;
      if (stars.position.z > 50) stars.position.z = 0;

      setProgress((prev) => (prev + 0.001) % 1.0);
      const lookAtPos = new THREE.Vector3(ball.position.x, 3.5, ball.position.z - 8);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, ball.position.z + 26, 0.05);
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, ball.position.x + 18, 0.02);
      camera.lookAt(lookAtPos);
      renderer.render(scene, camera);
    };

    animate();
    const handleResize = () => {
      if (!mountRef.current) return;
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize); 
      cancelAnimationFrame(frameId); renderer.dispose();
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, [isActive, config.sensitivity]);

  return (
    <div ref={mountRef} className="w-full h-full rounded-3xl overflow-hidden bg-[#020204] shadow-[inset_0_0_150px_rgba(0,0,0,1)] relative">
      <div className="absolute top-4 left-4 flex gap-2">
        <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-[10px] text-blue-400 font-bold uppercase tracking-widest backdrop-blur-md">
          Neural-Render v2.5
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
        <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] transition-all duration-300" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
};

export default Preview3D;
