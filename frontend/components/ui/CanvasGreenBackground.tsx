import React, { useRef, useEffect, useState } from 'react';

interface CanvasGreenBackgroundProps {
  children: React.ReactNode;
  glowRadius?: number;
  glowIntensity?: number;
}

interface MousePosition {
  x: number;
  y: number;
  active: boolean;
}

const CanvasGreenBackground: React.FC<CanvasGreenBackgroundProps> = ({ 
  children, 
  glowRadius = 50, 
  glowIntensity = 0.6 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const mousePosition = useRef<MousePosition>({ x: 0, y: 0, active: false });
  const animationFrameId = useRef<number | null>(null);
  
  // 设置 canvas 尺寸
  useEffect(() => {
    const updateDimensions = (): void => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);
  
  // 处理鼠标移动
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        mousePosition.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          active: true
        };
      }
    };
    
    const handleMouseLeave = (): void => {
      mousePosition.current.active = false;
    };
    
    const handleMouseEnter = (): void => {
      mousePosition.current.active = true;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    containerRef.current?.addEventListener('mouseleave', handleMouseLeave);
    containerRef.current?.addEventListener('mouseenter', handleMouseEnter);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      containerRef.current?.removeEventListener('mouseleave', handleMouseLeave);
      containerRef.current?.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);
  
  // Canvas 绘制
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx || dimensions.width === 0 || dimensions.height === 0) {
      return;
    }
    
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    // 创建渐变背景
    const createGradient = (): CanvasGradient => {
      const gradient = ctx.createLinearGradient(0, 0, 0, dimensions.height);
      gradient.addColorStop(0, '#ecfdf5'); // 深绿色
      gradient.addColorStop(1, '#d1fae5'); // 更深的绿色
      return gradient;
    };
    
    // 绘制函数
    const render = (): void => {
      // 清除画布
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      
      // 绘制基础渐变背景
      ctx.fillStyle = createGradient();
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      
      // 绘制网格纹理
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      const gridSize = 5;
      for (let x = 0; x < dimensions.width; x += gridSize * 2) {
        for (let y = 0; y < dimensions.height; y += gridSize * 2) {
          ctx.fillRect(x, y, gridSize, gridSize);
        }
      }
      
      // 绘制鼠标光晕
      if (mousePosition.current.active) {
        const { x, y } = mousePosition.current;
        
        // 创建径向渐变
        const glow = ctx.createRadialGradient(
          x, y, 0,
          x, y, glowRadius
        );
        
        glow.addColorStop(0, `rgba(74, 222, 128, ${glowIntensity})`);
        glow.addColorStop(0.3, 'rgba(16, 185, 129, 0.2)');
        glow.addColorStop(0.7, 'rgba(6, 95, 70, 0)');
        
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      }
      
      // 绘制装饰性光晕
      const drawGlow = (x: number, y: number, radius: number, color: string, opacity: number): void => {
        const glow = ctx.createRadialGradient(
          x, y, 0,
          x, y, glowRadius // 将光晕半径减小为原来的50%
        );
        
        glow.addColorStop(0, `rgba(${color}, ${opacity})`);
        glow.addColorStop(1, `rgba(${color}, 0)`);
        
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      };
      
      drawGlow(dimensions.width * 0.25, dimensions.height * 0.25, dimensions.width * 0.5, '74, 222, 128', 0.1);
      drawGlow(dimensions.width * 0.75, dimensions.height * 0.75, dimensions.width * 0.5, '16, 185, 129', 0.1);
      
      // 请求下一帧
      animationFrameId.current = requestAnimationFrame(render);
    };
    
    // 开始渲染循环
    render();
    
    // 清理
    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [dimensions, glowRadius, glowIntensity]);
  
  return (
    <div 
      ref={containerRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
    >
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full -z-10"
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default CanvasGreenBackground;