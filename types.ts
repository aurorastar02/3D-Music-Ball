
export interface VisualizerConfig {
  numCubes: number;
  coreColor: string;
  ballColor: string;
  ringRadius: number;
  sensitivity: number;
  cameraSpeed: number;
  reactorName: string;
  audioFileName: string;
  volume: number;
}

export interface PythonCodeRequest {
  prompt: string;
  config: VisualizerConfig;
}
