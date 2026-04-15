import React from 'react';

export const GridBackground = ({ children, className = "", style = {} }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) => {
  return (
    <div className={`relative w-full overflow-hidden bg-white ${className}`} style={{ position: 'relative', ...style }}>
      {/* Structural Grid Layer */}
      <div className="grid-overlay" 
           style={{ 
             position: 'absolute',
             inset: 0,
             zIndex: 0,
             opacity: 0.05,
             backgroundImage: `linear-gradient(#64748b 1px, transparent 1px), linear-gradient(90deg, #64748b 1px, transparent 1px)`,
             backgroundSize: '50px 50px' 
           }}>
      </div>
      
      {/* Atmospheric Aurora/Radial Glow Layer */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-10%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
        filter: 'blur(80px)',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        left: '-10%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(148, 163, 184, 0.1) 0%, transparent 70%)',
        filter: 'blur(80px)',
        zIndex: 0
      }}></div>
      
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
        {children}
      </div>
    </div>
  );
};

export const DottedBackground = ({ children, className = "", style = {} }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) => {
  return (
    <div className={`relative w-full overflow-hidden ${className}`} style={{ position: 'relative', backgroundColor: '#0F172A', ...style }}>
      {/* Structural Dot Layer */}
      <div style={{ 
             position: 'absolute',
             inset: 0,
             zIndex: 0,
             opacity: 0.15,
             backgroundImage: `radial-gradient(#64748b 0.5px, transparent 0.5px)`,
             backgroundSize: '24px 24px' 
           }}>
      </div>
      
      {/* Atmospheric Glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
        filter: 'blur(120px)',
        zIndex: 0
      }}></div>
      
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
        {children}
      </div>
    </div>
  );
};
