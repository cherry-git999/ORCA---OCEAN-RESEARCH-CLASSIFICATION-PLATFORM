import React, { useRef, useState } from 'react';
import { UploadCloud, FileImage, CheckCircle, AlertCircle, Play, Loader2 } from 'lucide-react';
import { generateImagePreview, ImagePreviewResult } from '../../utils/imagePreview';

interface DropzoneProps {
  onFileSelected: (file: File, preview: ImagePreviewResult) => void;
  selectedFile: File | null;
  previewData: ImagePreviewResult | null;
  isAnalyzing: boolean;
  onTriggerAnalysis: () => void;
}

const SUPPORTED_EXTENSIONS = ['.pbm', '.bpm', '.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tif', '.tiff'];

export const Dropzone: React.FC<DropzoneProps> = ({
  onFileSelected,
  selectedFile,
  previewData,
  isAnalyzing,
  onTriggerAnalysis,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = async (file: File) => {
    setErrorMsg(null);
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      setErrorMsg(`Format "${ext}" is not supported. Supported extensions: ${SUPPORTED_EXTENSIONS.join(', ')}`);
      return;
    }

    try {
      const preview = await generateImagePreview(file);
      onFileSelected(file, preview);
    } catch {
      setErrorMsg('Failed to process image preview. You can still proceed with analysis.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Upload Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragActive ? 'var(--sonar-cyan)' : 'var(--border-medium)'}`,
          borderRadius: 'var(--radius-md)',
          background: isDragActive ? 'rgba(0, 242, 254, 0.08)' : 'var(--bg-surface)',
          padding: '36px 20px',
          textAlign: 'center',
          cursor: isAnalyzing ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative',
        }}
      >
        <input
          ref={fileInputRef}
          id="sonar-file-input"
          data-testid="sonar-file-input"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.bmp,.pbm,.bpm,.tif,.tiff"
          disabled={isAnalyzing}
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              validateAndProcessFile(e.target.files[0]);
            }
          }}
        />

        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(0, 242, 254, 0.12)',
            color: 'var(--sonar-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px auto',
            boxShadow: isDragActive ? 'var(--sonar-cyan-glow)' : 'none',
          }}
        >
          {isAnalyzing ? <Loader2 size={30} className="sonar-ping" /> : <UploadCloud size={30} />}
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
          INGEST SENSOR SCAN IMAGE
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          Drop image file here or <span style={{ color: 'var(--sonar-cyan)', textDecoration: 'underline' }}>Browse Files</span>
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            justifyContent: 'center',
            maxWidth: '620px',
            margin: '0 auto',
          }}
        >
          {SUPPORTED_EXTENSIONS.map((ext) => (
            <span key={ext} className="badge badge-muted" style={{ fontSize: '10px' }}>
              {ext.toUpperCase().replace('.', '')}
            </span>
          ))}
        </div>

        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginTop: '12px',
          }}
        >
          Supports Subsea Sonar streams (.pbm, .bpm) and optical marine images (.png, .jpg, .webp, .bmp).
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#fb7185',
            fontSize: '12px',
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loaded File Inspection & Trigger Action */}
      {selectedFile && previewData && (
        <div className="glass-panel-elevated" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileImage size={18} color="var(--sonar-cyan)" />
              <h4 style={{ fontSize: '14px', fontWeight: 600 }}>IMAGE READY FOR ANALYSIS</h4>
            </div>
            <span className="badge badge-emerald">
              <CheckCircle size={12} />
              Validated
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              background: 'var(--bg-surface)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '14px',
            }}
          >
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filename</div>
              <div className="mono" style={{ fontSize: '12px', fontWeight: 600, marginTop: '2px', wordBreak: 'break-all' }}>
                {selectedFile.name}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Resolution</div>
              <div className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sonar-cyan)', marginTop: '2px' }}>
                {previewData.width} × {previewData.height} px
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type</div>
              <div style={{ fontSize: '12px', marginTop: '2px' }}>
                {previewData.formatDescription}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>File Size</div>
              <div className="mono" style={{ fontSize: '12px', marginTop: '2px' }}>
                {Math.round(selectedFile.size / 1024)} KB
              </div>
            </div>
          </div>

          {/* Thumbnail Preview */}
          <div
            style={{
              width: '100%',
              height: '140px',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              border: '1px solid var(--border-medium)',
              background: '#040914',
              position: 'relative',
              marginBottom: '16px',
            }}
          >
            <img
              src={previewData.previewUrl}
              alt="Scan Preview"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                background: 'rgba(4, 8, 18, 0.85)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--sonar-cyan)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              SWATH: {previewData.width} × {previewData.height} PX {previewData.isNetpbm ? '(NETPBM)' : ''}
            </div>
          </div>

          {/* Analyze Button */}
          <button
            id="execute-analysis-button"
            data-testid="execute-analysis-button"
            onClick={onTriggerAnalysis}
            disabled={isAnalyzing}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 700 }}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={16} className="sonar-ping" />
                <span>Executing Automated Analysis...</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Run Automated Analysis</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
