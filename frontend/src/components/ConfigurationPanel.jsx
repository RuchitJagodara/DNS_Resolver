import { useIsLiveMode } from './VisualizationPanel';

function ConfigurationPanel({ results, onConfigChange }) {
  const isLiveMode = useIsLiveMode(results);

  if (isLiveMode) {
    return (
      <div className="configuration-panel">
        <h3>Live Mode Active</h3>
        <p>Configuration options are disabled during live mode</p>
      </div>
    );
  }

  return (
    <div className="configuration-panel">
      <h3>Resolution Mode</h3>
      {}
    </div>
  );
}

export default ConfigurationPanel;
