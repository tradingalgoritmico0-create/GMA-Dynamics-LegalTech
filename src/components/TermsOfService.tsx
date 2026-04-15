import { motion } from 'framer-motion';

/**
 * GMA DYNAMICS - TÉRMINOS Y CONDICIONES DE SERVICIO (T&C)
 * Versión 2.0 - Protección Legal Blindada para LegalTech.
 */

const TermsOfService = ({ onClose }: { onClose: () => void }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '2rem' }}>
      <motion.div 
        initial={{ y: 50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        style={{ backgroundColor: 'white', width: '100%', maxWidth: '800px', height: '80vh', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
      >
        <div style={{ padding: '2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>CONTRATO DE LICENCIA Y TÉRMINOS DE USO</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
        </div>

        <div style={{ padding: '2.5rem', overflowY: 'auto', lineHeight: '1.6', color: '#334155', fontSize: '0.95rem' }}>
          <p style={{ fontWeight: 'bold', color: '#1e3a8a', marginBottom: '1.5rem' }}>LEA ATENTAMENTE: AL UTILIZAR GMA DYNAMICS, USTED ACEPTA ESTAR SUJETO A ESTAS CLÁUSULAS DE EXONERACIÓN DE RESPONSABILIDAD.</p>
          
          <h3 style={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: 800 }}>1. NATURALEZA DEL SERVICIO</h3>
          <p>GMA Dynamics es una plataforma de infraestructura tecnológica de trazabilidad. No somos una firma de abogados ni garantizamos el éxito o la validez de un proceso judicial, la cual depende exclusivamente del arbitrio del juez y del cumplimiento de las cargas procesales por parte del Usuario.</p>

          <h3 style={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: 800, marginTop: '1.5rem' }}>2. RESPONSABILIDAD SOBRE LA INFORMACIÓN</h3>
          <p>El Usuario (Abogado/Litigante) es el único responsable de la exactitud de los números de WhatsApp, direcciones de correo electrónico y números de identificación del demandado. GMA Dynamics no verifica la veracidad de estos datos y no se hace responsable por notificaciones enviadas a destinatarios erróneos debido a errores en el input del Usuario.</p>

          <h3 style={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: 800, marginTop: '1.5rem' }}>3. CIFRADO Y ACCESO A DATOS</h3>
          <p>GMA Dynamics utiliza cifrado AES-256 en el cliente. La llave de acceso es la identificación del demandado ingresada por el Usuario. Si el Usuario ingresa una identificación incorrecta, el documento será inaccesible. GMA Dynamics NO posee llaves maestras para recuperar documentos cifrados por el Usuario.</p>

          <h3 style={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: 800, marginTop: '1.5rem' }}>4. EXONERACIÓN POR FALLOS DE TERCEROS</h3>
          <p>GMA Dynamics depende de APIs de terceros (Meta/WhatsApp, Google, Servidores SMTP). No nos hacemos responsables por retrasos, caídas del servicio o falta de entrega derivados de fallos técnicos en estas plataformas externas o problemas de conectividad del destinatario.</p>

          <h3 style={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: 800, marginTop: '1.5rem' }}>5. INTEGRIDAD CRIPTOGRÁFICA (SHA-256)</h3>
          <p>Nuestra responsabilidad se limita a certificar que el archivo enviado coincide con el Hash SHA-256 registrado en el Acta. Cualquier alteración del archivo posterior a su descarga por el destinatario invalida la certificación de GMA Dynamics.</p>

          <h3 style={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: 800, marginTop: '1.5rem' }}>6. POLÍTICA DE REEMBOLSOS</h3>
          <p>Dada la naturaleza digital e inmediata del servicio de certificación, no se realizarán reembolsos una vez que el cupo de mensajes haya sido utilizado o el plan haya sido activado.</p>

          <h3 style={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: 800, marginTop: '1.5rem' }}>7. PROPIEDAD INTELECTUAL</h3>
          <p>Todo el código, algoritmos de encriptación y diseño de interfaces son propiedad exclusiva de GMA Dynamics. Queda prohibida la ingeniería inversa o el uso del servicio para fines ilícitos.</p>

          <div style={{ marginTop: '3rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>Al marcar la casilla de aceptación, usted declara bajo la gravedad de juramento que ha leído y acepta estos términos en su totalidad, reconociendo que GMA Dynamics es solo un proveedor de tecnología.</p>
          </div>
        </div>

        <div style={{ padding: '1.5rem 2rem', backgroundColor: '#f1f5f9', textAlign: 'right' }}>
          <button onClick={onClose} style={{ backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '0.8rem 2rem', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}>He leído y entiendo los términos</button>
        </div>
      </motion.div>
    </div>
  );
};

export default TermsOfService;
